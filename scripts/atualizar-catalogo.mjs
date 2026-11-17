// Atualiza os arquivos do site a partir do catálogo que está no ar (Supabase):
//  - assets/data.js: catálogo reserva, usado só se o banco não responder
//  - passeio-<slug>.html: uma página por passeio, com título, foto e preço próprios
//    (é o que o Google e a prévia do WhatsApp leem)
//  - assets/paginas.js: lista dessas páginas, para os links do site apontarem para elas
//  - sitemap.xml
// Uso: node scripts/atualizar-catalogo.mjs site-v2
// Rodar sempre que mudar passeio, preço ou foto no painel, e depois publicar o site.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://maretur.onrender.com/'; // trocar para https://maretur.com.br/ quando o domínio estiver ligado
const dir = process.argv[2] || 'site-v2';
const cfg = fs.readFileSync(path.join(dir, 'config.js'), 'utf8');
const url = cfg.match(/supabaseUrl:\s*"([^"]+)"/)[1], key = cfg.match(/supabaseKey:\s*"([^"]+)"/)[1];
const get = async q => {
  const r = await fetch(url + '/rest/v1/' + q, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  if (!r.ok) throw Error(q + ' ' + r.status + ' ' + await r.text());
  return r.json();
};
const settings = (await get('settings?select=data&id=eq.1'))[0].data;
const tours = (await get('tours?select=*&active=eq.true&order=sort')).map(({ updated_at, ...t }) => t);
// Traduções (tours.i18n): se o banco ainda não as tem, mantém as do data.js atual para não perdê-las
try {
  const old = fs.readFileSync(path.join(dir, 'assets/data.js'), 'utf8');
  const i = old.indexOf('  var TOURS = '), j = old.indexOf(';' + String.fromCharCode(10) + '  var REVIEWS');
  const prev = JSON.parse(old.slice(i + '  var TOURS = '.length, j));
  for (const t of tours) {
    const p = prev.find(x => x.slug === t.slug);
    if (p && p.i18n && !(t.i18n && t.i18n.es)) t.i18n = p.i18n;
  }
} catch (e) { console.warn('aviso: não foi possível preservar i18n do data.js:', e.message); }
const faqs = await get('faqs?select=question,answer,sort,published&published=eq.true&order=sort');

// 1. data.js
const dataFile = path.join(dir, 'assets/data.js');
let s = fs.readFileSync(dataFile, 'utf8');
const a = s.indexOf('  var SETTINGS = {'), b = s.indexOf('  var CATS = ');
if (a < 0 || b < 0) throw Error('marcadores não encontrados em data.js');
s = s.slice(0, a) +
  '  var SETTINGS = ' + JSON.stringify(settings, null, 1) + ';\n' +
  '  var TOURS = ' + JSON.stringify(tours) + ';\n' +
  '  var REVIEWS = [];\n' +
  '  var FAQS = ' + JSON.stringify(faqs) + ';\n\n' + s.slice(b);
fs.writeFileSync(dataFile, s);

// 2. Páginas por passeio
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const brl = n => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const tpl = fs.readFileSync(path.join(dir, 'passeio.html'), 'utf8');
for (const f of fs.readdirSync(dir)) if (/^passeio-.+\.html$/.test(f)) fs.unlinkSync(path.join(dir, f));
const brand = settings.brand || 'Maré Tur';
for (const t of tours) {
  const file = 'passeio-' + t.slug + '.html', pageUrl = BASE + file;
  const img = BASE + ((t.photos || [])[0]?.url || 'fotos/hero-2.jpg');
  const title = t.name + ' saindo de Fortaleza | ' + brand;
  const desc = (t.summary ? t.summary + ' ' : '') + brl(t.price_pix) + ' no Pix, busca no hotel e reserva com ' + (settings.deposit_pct || 20) + '% de sinal.';
  const ld = {
    '@context': 'https://schema.org', '@type': 'TouristTrip', name: t.name, description: t.description || t.summary,
    url: pageUrl, image: (t.photos || []).map(p => BASE + p.url),
    touristType: 'Turistas hospedados em Fortaleza',
    provider: { '@type': 'TravelAgency', name: brand, url: BASE },
    offers: { '@type': 'Offer', price: t.price_pix, priceCurrency: 'BRL', availability: 'https://schema.org/InStock', url: pageUrl }
  };
  const head =
    '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + pageUrl + '">\n' +
    '<meta property="og:title" content="' + esc(t.name + ' · ' + brl(t.price_pix) + ' no Pix') + '">\n' +
    '<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:image" content="' + esc(img) + '">\n' +
    '<meta property="og:url" content="' + pageUrl + '">\n' +
    '<meta property="og:locale" content="pt_BR">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>\n';
  // Conteúdo lido por quem não roda JavaScript (Google, prévias); o tour.js substitui ao carregar
  const body =
    '<section class="head"><h1>' + esc(t.name) + '</h1><p>' + esc(t.description || t.summary) + '</p>' +
    '<p><b>' + brl(t.price_pix) + '</b> por pessoa no Pix · ' + brl(t.price_card) + ' no cartão</p>' +
    ((t.includes || []).length ? '<ul class="list">' + t.includes.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' : '') +
    '<p><a href="./">Ver todos os passeios</a></p></section>';
  let h = tpl.replace(/<title>[\s\S]*?<meta property="og:type"[^>]*>\n/, head);
  if (h === tpl) throw Error('cabeçalho de passeio.html mudou: ajustar o script');
  h = h.replace('<div class="empty" style="margin-top:24px">Carregando passeio…</div>', body)
       .replace('<script src="assets/paginas.js"></script>', '<script src="assets/paginas.js"></script>\n<script>window.TOUR_SLUG = ' + JSON.stringify(t.slug) + ';</script>');
  if (!h.includes('window.TOUR_SLUG')) throw Error('passeio.html sem assets/paginas.js');
  fs.writeFileSync(path.join(dir, file), h);
}
fs.writeFileSync(path.join(dir, 'assets/paginas.js'), '// Gerado por scripts/atualizar-catalogo.mjs: passeios com página própria.\nwindow.MT_PAGES = ' + JSON.stringify(tours.map(t => t.slug)) + ';\n');

// 3. Sitemap
const today = new Date().toISOString().slice(0, 10);
const urls = [BASE, ...tours.map(t => BASE + 'passeio-' + t.slug + '.html')];
fs.writeFileSync(path.join(dir, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '  <url><loc>' + u + '</loc><lastmod>' + today + '</lastmod></url>').join('\n') + '\n</urlset>\n');
console.log('ok:', tours.length, 'passeios,', faqs.length, 'perguntas,', urls.length, 'endereços no sitemap');
