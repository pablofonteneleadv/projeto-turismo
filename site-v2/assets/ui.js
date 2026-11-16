/* Peças comuns das páginas públicas */
(function () {
  var D = window.SiteData;
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
  function altOf(url, fallback) { var f = String(url || "").split("/").pop(); return ALT[f] || fallback || ""; }
  function alt(t, i) { var p = (t.photos || [])[i]; return altOf(p && (p.url || p), t.name + " – foto " + (i + 1)); }
  function toast(m) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 3600);
  }
  function photo(p, seed, alt, eager) {
    var url = p && (p.url || p);
    if (!url) return '<div class="photo">' + D.art(seed) + "</div>";
    var credit = p && p.credit ? '<span class="credit">' + D.esc(p.credit) + "</span>" : "";
    var load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
    return '<div class="photo"><img src="' + D.esc(url) + '" alt="' + D.esc(altOf(url, alt)) + '" ' + load + ' decoding="async" onerror="this.outerHTML=window.SiteData.art(\'' + D.esc(seed) + '\')">' + credit + "</div>";
  }
  function brand(s) {
    document.querySelectorAll("[data-brand]").forEach(function (el) { el.textContent = s.brand; });
    document.querySelectorAll("[data-brand-sub]").forEach(function (el) { el.textContent = s.brand_sub; });
    document.querySelectorAll("[data-footer]").forEach(function (el) { el.textContent = s.brand + " · " + s.footer_note; });
  }
  function chat(s, text) {
    var a = document.getElementById("chat"); if (!a) return;
    var link = D.waLink(s.whatsapp, text || "Olá! Quero saber sobre os passeios.");
    if (link) { a.href = link; a.target = "_blank"; a.rel = "noopener"; }
    else a.addEventListener("click", function (e) { e.preventDefault(); toast("O WhatsApp de atendimento ainda não foi cadastrado no painel."); });
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
    if (S && String(S.rating_count || "").trim() && String(S.rating_value || "").trim()) return { value: String(S.rating_value), label: S.rating_count + " avaliações no Google" };
    if (!reviews || reviews.length < 3) return null;
    return { value: fmt(avg(reviews)), label: reviews.length + " avaliações de clientes" };
  }
  function tourReviews(t, reviews) {
    var n = String(t.name || "").toLowerCase(), s = String(t.slug || "").toLowerCase();
    return (reviews || []).filter(function (r) { var x = String(r.tour || "").toLowerCase().trim(); return x && (x === s || x === n || n.indexOf(x) === 0); });
  }
  function tourRating(t, reviews) { var l = tourReviews(t, reviews); return l.length ? { value: fmt(avg(l)), count: l.length } : null; }
  function review(r) {
    var n = Math.max(1, Math.min(5, Number(r.stars) || 5));
    return '<article class="review"><span class="stars" aria-label="' + n + ' de 5 estrelas">' + "★★★★★".slice(0, n) + "</span>" + (r.tour ? '<span class="trip">' + D.esc(r.tour) + "</span>" : "") + "<p>" + D.esc(r.text) + "</p><footer><span>" + D.esc(r.name) + (r.origin ? " · " + D.esc(r.origin) : "") + "</span><span>" + D.esc(r.month) + "</span></footer></article>";
  }
  window.UI = { toast: toast, photo: photo, brand: brand, chat: chat, applyCouponFromUrl: applyCouponFromUrl, alt: alt, ratings: ratings, tourRating: tourRating, tourReviews: tourReviews, review: review };
})();
