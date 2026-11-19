// Atualiza catálogo de consulta, páginas públicas e sitemap.
// Uso: node scripts/atualizar-catalogo.mjs site-v2
// Sem consultar o Supabase: acrescente --offline (usa data.js) ou --snapshot arquivo.json.
// Um snapshot contém { settings, tours, faqs }. Inclua active: true nas ofertas publicadas.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

const BASE = 'https://maretur.com.br/';
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { offline: { type: 'boolean' }, snapshot: { type: 'string' } },
});
if (positionals.length > 1 || (values.offline && values.snapshot)) throw Error('Informe o diretório do site e apenas --offline ou --snapshot, se necessário.');
const dir = positionals[0] || 'site-v2';
const dataFile = path.join(dir, 'assets/data.js');
const source = fs.readFileSync(dataFile, 'utf8');

function seedField(name, next) {
  const marker = '  var ' + name + ' = ';
  const start = source.indexOf(marker);
  const end = source.indexOf('\n  var ' + next + ' = ', start);
  if (start < 0 || end < 0) throw Error('Não encontrei ' + name + ' no catálogo de consulta.');
  return JSON.parse(source.slice(start + marker.length, end).trim().replace(/;$/, ''));
}

async function readLive() {
  const cfg = fs.readFileSync(path.join(dir, 'config.js'), 'utf8');
  const url = cfg.match(/supabaseUrl:\s*"([^"]+)"/)?.[1];
  const key = cfg.match(/supabaseKey:\s*"([^"]+)"/)?.[1];
  if (!url || !key) throw Error('Supabase não configurado. Use --offline ou --snapshot.');
  const get = async query => {
    const r = await fetch(url + '/rest/v1/' + query, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    if (!r.ok) throw Error(query + ' retornou HTTP ' + r.status);
    return r.json();
  };
  const [settings, tours, faqs] = await Promise.all([
    get('settings?select=data&id=eq.1'),
    get('tours?select=*&active=eq.true&order=sort'),
    get('faqs?select=question,answer,sort,published&published=eq.true&order=sort'),
  ]);
  return { settings: settings[0]?.data, tours, faqs };
}

const previous = seedField('TOURS', 'REVIEWS');
const snapshot = values.snapshot ? JSON.parse(fs.readFileSync(values.snapshot, 'utf8'))
  : values.offline ? { settings: seedField('SETTINGS', 'TOURS'), tours: previous, faqs: seedField('FAQS', 'CATS') }
  : await readLive();
if (!Array.isArray(snapshot.tours) || !Array.isArray(snapshot.faqs)) throw Error('O catálogo precisa conter as listas tours e faqs.');

const pick = (data, fields) => Object.fromEntries(fields.filter(k => data?.[k] !== undefined).map(k => [k, data[k]]));
const publicSettings = ['brand', 'brand_sub', 'whatsapp', 'instagram', 'hero_title', 'hero_eyebrow', 'hero_promises', 'footer_note', 'rating_count', 'rating_value', 'cancel_policy', 'child_factor', 'cutoff_hour', 'deposit_pct'];
const publicTours = ['slug', 'name', 'category', 'location', 'times', 'duration', 'price_card', 'price_pix', 'price_private', 'per_vehicle', 'rating', 'featured', 'active', 'sort', 'summary', 'description', 'includes', 'departure_weekdays'];
const translatable = ['name', 'summary', 'description', 'includes', 'times', 'duration', 'location', 'extras'];
const extras = list => Array.isArray(list) ? list.map(x => pick(x, ['name', 'price', 'buggy'])) : [];
const previousBySlug = new Map(previous.map(t => [t.slug, t]));
const sourceTours = snapshot.tours.filter(t => t.active === true).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0) || String(a.slug).localeCompare(String(b.slug), 'en'));
const slugs = new Set();
for (const t of sourceTours) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(t.slug || '') || slugs.has(t.slug) || !String(t.name || '').trim()) throw Error('Oferta com slug inválido, duplicado ou sem nome no catálogo.');
  slugs.add(t.slug);
}
const settings = pick(snapshot.settings, publicSettings);
const faqs = snapshot.faqs.filter(q => q.published !== false).map(q => pick(q, ['question', 'answer', 'sort', 'published']));
const tours = sourceTours.map(t => {
  const translations = { ...previousBySlug.get(t.slug)?.i18n, ...t.i18n };
  const i18n = Object.fromEntries(Object.entries(translations).filter(([lang, tr]) => /^[a-z]{2}(?:-[A-Z]{2})?$/.test(lang) && tr && typeof tr === 'object').map(([lang, tr]) => {
    const result = pick(tr, translatable);
    if (result.extras) result.extras = extras(result.extras);
    return [lang, result];
  }));
  return {
    ...pick(t, publicTours),
    sales_mode: 'consultation',
    extras: extras(t.extras),
    itinerary: Array.isArray(t.itinerary) ? t.itinerary.map(x => pick(x, ['time', 'text'])) : [],
    photos: Array.isArray(t.photos) ? t.photos.map(x => typeof x === 'string' ? x : pick(x, ['url', 'credit'])) : [],
    i18n,
  };
});

const a = source.indexOf('  var SETTINGS = ');
const b = source.indexOf('  var CATS = ', a);
if (a < 0 || b < 0) throw Error('Marcadores não encontrados em data.js.');
const files = new Map();
const write = (file, content) => files.set(path.join(dir, file), content);
write('assets/data.js',
  source.slice(0, a) +
  '  var SETTINGS = ' + JSON.stringify(settings, null, 1) + ';\n' +
  '  var TOURS = ' + JSON.stringify(tours) + ';\n' +
  '  var REVIEWS = [];\n' +
  '  var FAQS = ' + JSON.stringify(faqs) + ';\n\n' + source.slice(b));

const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function imageUrl(photo) {
  const raw = typeof photo === 'string' ? photo : photo?.url;
  if (!raw) return null;
  try {
    const url = new URL(raw, BASE);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
const template = fs.readFileSync(path.join(dir, 'passeio.html'), 'utf8');
const brand = settings.brand || 'Maré Tur';
const headSlot = /<title>[\s\S]*?<meta property="og:type"[^>]*>\n/;
const mainSlot = /(<main\b[^>]*\bid="page"[^>]*>)[\s\S]*?(<\/main>)/;
const pagesScript = /<script src="assets\/paginas\.js(?:\?[^"]*)?"[^>]*><\/script>/;
if (!headSlot.test(template) || !mainSlot.test(template) || !pagesScript.test(template)) throw Error('Marcadores não encontrados em passeio.html.');
for (const t of tours) {
  const file = 'passeio-' + t.slug + '.html';
  const pageUrl = BASE + file;
  const images = t.photos.map(imageUrl).filter(Boolean);
  const img = images[0] || BASE + 'fotos/hero-2.jpg';
  const title = t.name + ' | ' + brand + ' Fortaleza';
  const desc = [t.summary, 'Consulte datas, valores e ponto de embarque.'].filter(Boolean).join(' ');
  const ld = {
    '@context': 'https://schema.org', '@type': 'TouristTrip', name: t.name, description: t.description || desc,
    url: pageUrl, image: images,
    provider: { '@type': 'Organization', name: brand, url: BASE },
  };
  const head =
    '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + pageUrl + '">\n' +
    '<meta property="og:title" content="' + esc(title) + '">\n' +
    '<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:image" content="' + esc(img) + '">\n' +
    '<meta property="og:url" content="' + pageUrl + '">\n' +
    '<meta property="og:locale" content="pt_BR">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>\n';
  const body =
    '<section class="head"><h1>' + esc(t.name) + '</h1><p>' + esc(t.description || t.summary) + '</p>' +
    '<p>Consulte datas, disponibilidade e valores para o seu grupo.</p>' +
    (Array.isArray(t.includes) && t.includes.length ? '<ul class="list">' + t.includes.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' : '') +
    '<p><a href="./#passeios">Ver todos os passeios</a></p></section>';
  const html = template.replace(headSlot, () => head)
    .replace(mainSlot, (_, open, close) => open + '\n  ' + body + '\n' + close)
    .replace(pagesScript, script => script + '\n<script>window.TOUR_SLUG = ' + JSON.stringify(t.slug) + ';</script>');
  write(file, html);
}
write('assets/paginas.js', '// Gerado por scripts/atualizar-catalogo.mjs: passeios com página própria.\nwindow.MT_PAGES = ' + JSON.stringify(tours.map(t => t.slug)) + ';\n');

const urls = [BASE, ...sourceTours.map(t => BASE + 'passeio-' + t.slug + '.html')];
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((url, i) => {
    const updated = String(sourceTours[i - 1]?.updated_at || '').slice(0, 10);
    const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(updated) ? '<lastmod>' + updated + '</lastmod>' : '';
    return '  <url><loc>' + url + '</loc>' + lastmod + '</url>';
  }).join('\n') + '\n</urlset>\n');

// Remover apenas páginas que foram geradas anteriormente, preservando páginas manuais.
const oldPagesFile = path.join(dir, 'assets/paginas.js');
const oldPagesSource = fs.existsSync(oldPagesFile) ? fs.readFileSync(oldPagesFile, 'utf8') : '';
const oldPages = JSON.parse(oldPagesSource.match(/window\.MT_PAGES\s*=\s*(\[[^\n]*?\]);/)?.[1] || '[]');
const assetHashes = new Map();
function versionAssets(html) {
  return html.replace(/((?:src|href)=")((?:assets\/[a-z0-9-]+\.(?:js|css)|config\.js))(?:\?v=[a-z0-9]+)?"/gi, (_, attr, asset) => {
    if (!assetHashes.has(asset)) {
      const source = path.join(dir, asset);
      const staged = files.get(source);
      if (staged == null && !fs.existsSync(source)) return attr + asset + '"';
      const content = staged ?? fs.readFileSync(source);
      assetHashes.set(asset, createHash('sha256').update(content).digest('hex').slice(0, 12));
    }
    return attr + asset + '?v=' + assetHashes.get(asset) + '"';
  });
}
for (const entry of ['index.html', 'passeio.html', 'admin.html']) {
  const file = path.join(dir, entry);
  if (fs.existsSync(file)) write(entry, fs.readFileSync(file, 'utf8'));
}
for (const [file, content] of files) {
  if (file.endsWith('.html')) files.set(file, versionAssets(content));
}
for (const [file, content] of files) fs.writeFileSync(file, content);
for (const slug of oldPages) {
  if (/^[a-z0-9][a-z0-9-]*$/.test(slug) && !slugs.has(slug)) fs.rmSync(path.join(dir, 'passeio-' + slug + '.html'), { force: true });
}
console.log('ok:', tours.length, 'passeios,', faqs.length, 'perguntas,', urls.length, 'endereços no sitemap');
