/* Endereços antigos do Render levam ao domínio oficial */
if (/\.onrender\.com$/i.test(location.hostname)) location.replace("https://maretur.com.br" + location.pathname + location.search + location.hash);
/* Peças comuns das páginas públicas */
(function () {
  var D = window.SiteData;
  var I = window.I18N || { es: false, t: function (k) { return k; }, tx: function (s) { return s; }, altFile: function () { return ""; }, tr: function (o, f) { return o ? o[f] : ""; } };
  var tt;
  // Descrição de cada foto (texto alternativo), pelo nome do arquivo.
  var ALT = {
    "3praias-1.jpg": "Falésias e piscinas da Praia das Fontes, Beberibe",
    "3praias-2.jpg": "Mar e falésias na Praia das Fontes, Beberibe",
    "3praias-3.jpg": "Falésias coloridas da Praia das Fontes, Beberibe",
    "canoa-1.jpg": "Falésias vermelhas de Canoa Quebrada, Aracati",
    "canoa-2.jpg": "Vista de Canoa Quebrada, Aracati",
    "canoa-3.jpg": "Praia de Canoa Quebrada, Aracati",
    "morro-1.jpg": "Falésias de Morro Branco, Beberibe",
    "morro-2.jpg": "Labirinto de falésias de Morro Branco, Beberibe",
    "morro-3.jpg": "Praia de Beberibe vista do alto",
    "cumbuco-1.jpg": "Dunas e mar em Cumbuco, Caucaia",
    "cumbuco-2.jpg": "Praia do Cumbuco com jangadas",
    "cumbuco-3.jpg": "Orla de Cumbuco, Caucaia",
    "lagoinha-1.jpg": "Coqueiros e mar calmo na Praia da Lagoinha, Paraipaba",
    "lagoinha-2.jpg": "Enseada da Lagoinha vista do mirante",
    "lagoinha-3.jpg": "Praia da Lagoinha, Paraipaba",
    "flexau-1.jpg": "Estuário do Rio Mundaú, Trairi",
    "flexau-2.jpg": "Foz do Rio Mundaú encontrando o mar",
    "flexau-3.jpg": "Foz do Rio Mundaú, Ceará",
    "aguas-1.jpg": "Encontro do rio com o mar em Águas Belas, Cascavel",
    "aguas-2.jpg": "Praia de Águas Belas, Cascavel",
    "paracuru-1.jpg": "Praia de Paracuru",
    "paracuru-2.jpg": "Orla de Paracuru",
    "jeribv-1.jpg": "Pedra Furada, Jericoacoara",
    "jeribv-2.jpg": "Duna do Pôr do Sol, Jericoacoara",
    "jeribv-3.jpg": "Pôr do sol na duna de Jericoacoara",
    "jeri3-1.jpg": "Redes na Lagoa do Paraíso, Jijoca",
    "jeri3-2.jpg": "Lagoa Azul, Jericoacoara",
    "jeri3-3.jpg": "Duna do Pôr do Sol, Jericoacoara",
    "transjeri-1.jpg": "Estrada a caminho de Jericoacoara",
    "transjeri-2.jpg": "Vila de Jericoacoara",
    "beachpark-1.jpg": "Beach Park e o mar, Aquiraz",
    "beachpark-2.jpg": "Toboágua Insano no Beach Park",
    "beachpark-3.jpg": "Entrada do Beach Park",
    "alchymist-1.jpg": "Lagoa do Alchymist Beach Club",
    "alchymist-2.jpg": "Espreguiçadeiras no Alchymist Beach Club",
    "hero-2.jpg": "Praia de Iracema e Beira-Mar de Fortaleza"
  };
  function altOf(url, fallback) { var f = String(url || "").split("/").pop(); return I.altFile(url) || ALT[f] || fallback || ""; }
  function alt(t, i) { var p = (t.photos || [])[i]; return altOf(p && (p.url || p), I.t("photo.n", I.tr(t, "name"), i + 1)); }
  function toast(m) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 3600);
  }
  function photo(p, seed, alt, eager) {
    var url = p && (p.url || p);
    if (!url) return '<div class="photo">' + D.art(seed) + "</div>";
    var credit = p && p.credit ? '<span class="credit">' + D.esc(I.es ? String(p.credit).replace("Domínio público", I.t("credit.fix")).replace("Public domain", I.t("credit.fix")) : p.credit) + "</span>" : "";
    var load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
    return '<div class="photo"><img src="' + D.esc(url) + '" alt="' + D.esc(altOf(url, alt)) + '" ' + load + ' decoding="async" onerror="this.outerHTML=window.SiteData.art(\'' + D.esc(seed) + '\')">' + credit + "</div>";
  }
  function brand(s) {
    document.querySelectorAll("[data-brand]").forEach(function (el) { el.textContent = s.brand; });
    document.querySelectorAll("[data-brand-sub]").forEach(function (el) { el.textContent = I.tx(s.brand_sub); });
    document.querySelectorAll("[data-footer]").forEach(function (el) { el.textContent = s.brand + " · " + I.tx(s.footer_note); });
  }
  function chat(s, text) {
    var a = document.getElementById("chat"); if (!a) return;
    var link = D.waLink(s.whatsapp, text || I.t("wa.hello"));
    if (link) { a.href = link; a.target = "_blank"; a.rel = "noopener"; }
    else a.addEventListener("click", function (e) { e.preventDefault(); toast(I.t("wa.missing")); });
  }
  async function applyCouponFromUrl() {
    try {
      var q = new URLSearchParams(location.search).get("cupom");
      if (q) { var c = await D.checkCoupon(q); if (c) D.coupon.set(c.code); }
    } catch (e) {}
    var code = D.coupon.get();
    if (!code) return null;
    var c2 = await D.checkCoupon(code);
    if (!c2) { D.coupon.set(""); return null; }
    return c2;
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1).replace(".", ","); }
  function avg(list) { return list.reduce(function (a, r) { return a + (Number(r.stars) || 5); }, 0) / list.length; }
  // Nota geral: a do Google (se cadastrada no painel) ou a média de pelo menos 3 avaliações reais publicadas.
  function ratings(S, reviews) {
    if (S && String(S.rating_count || "").trim() && String(S.rating_value || "").trim()) return { value: String(S.rating_value), label: I.t("rating.google", S.rating_count) };
    if (!reviews || reviews.length < 3) return null;
    return { value: fmt(avg(reviews)), label: I.t("rating.clients", reviews.length) };
  }
  function tourReviews(t, reviews) {
    var n = String(t.name || "").toLowerCase(), s = String(t.slug || "").toLowerCase();
    return (reviews || []).filter(function (r) { var x = String(r.tour || "").toLowerCase().trim(); return x && (x === s || x === n || n.indexOf(x) === 0); });
  }
  function tourRating(t, reviews) { var l = tourReviews(t, reviews); return l.length ? { value: fmt(avg(l)), count: l.length } : null; }
  function review(r) {
    var n = Math.max(1, Math.min(5, Number(r.stars) || 5));
    return '<article class="review"><span class="stars" aria-label="' + I.t("stars.label", n) + '">' + "★★★★★".slice(0, n) + "</span>" + (r.tour ? '<span class="trip">' + D.esc(r.tour) + "</span>" : "") + "<p>" + D.esc(r.text) + "</p><footer><span>" + D.esc(r.name) + (r.origin ? " · " + D.esc(r.origin) : "") + "</span><span>" + D.esc(r.month) + "</span></footer></article>";
  }
  function publicUrl(path) { return new URL(path, "https://maretur.com.br/"); }
  function tourUrl(slug) { return (window.MT_PAGES || []).indexOf(slug) >= 0 ? "passeio-" + slug + ".html" : "passeio.html?p=" + encodeURIComponent(slug); }

  var attributionFields = ["source", "medium", "campaign", "content", "term"];
  var attributionKey = "maretur-attribution";
  var touch;

  function campaignValue(value) {
    var text = String(value || "").trim();
    if (!text || text.length > 120 || /[@+]|\d{10,}/.test(text)) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
  }

  function attribution() {
    if (touch) return Object.assign({}, touch);
    var params = new URLSearchParams(location.search), incoming = {}, previous = {};
    attributionFields.forEach(function (key) {
      var value = campaignValue(params.get("utm_" + key));
      if (value) incoming[key] = value;
    });
    if (!incoming.source) {
      var origin = campaignValue(params.get("origem"));
      if (origin) incoming.source = origin;
    }
    try {
      var stored = JSON.parse(sessionStorage.getItem(attributionKey) || "{}") || {};
      attributionFields.forEach(function (key) {
        var value = campaignValue(stored[key]);
        if (value) previous[key] = value;
      });
    } catch (e) {}
    touch = Object.keys(incoming).length ? incoming : previous;
    if (!touch.source && document.referrer) {
      try {
        var ref = new URL(document.referrer);
        if (ref.origin !== location.origin) touch.source = campaignValue(ref.hostname);
      } catch (e) {}
    }
    if (!touch.source) touch.source = "direto";
    try { sessionStorage.setItem(attributionKey, JSON.stringify(touch)); } catch (e) {}
    return Object.assign({}, touch);
  }

  function attributionRef() {
    var source = attribution();
    if (source.source === "direto" && !source.campaign) return "";
    var label = [source.source, source.campaign, source.content].filter(Boolean).join("-").toUpperCase();
    var key = attributionFields.map(function (field) { return source[field] || ""; }).join("|");
    var hash = 2166136261;
    for (var i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
    return "MT-" + label.slice(0, 31) + "-" + (hash >>> 0).toString(36).toUpperCase();
  }

  function track(name, details) {
    if (!/^[a-z][a-z0-9_]{1,47}$/.test(name)) return;
    var fields = {};
    ["slug", "status", "mode", "reason", "channel"].forEach(function (key) {
      var value = campaignValue(details && details[key]);
      if (value) fields[key] = value;
    });
    window.dispatchEvent(new CustomEvent("maretur:analytics", {
      detail: { event: name, attribution: attribution(), details: fields }
    }));
  }

  attribution();
  window.UI = { publicUrl: publicUrl, tourUrl: tourUrl, toast: toast, photo: photo, brand: brand, chat: chat, applyCouponFromUrl: applyCouponFromUrl, alt: alt, ratings: ratings, tourRating: tourRating, tourReviews: tourReviews, review: review, attribution: attribution, attributionRef: attributionRef, track: track };
})();
