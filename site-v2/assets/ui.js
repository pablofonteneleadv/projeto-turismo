/* Peças comuns das páginas públicas */
(function () {
  var D = window.SiteData;
  var tt;
  function toast(m) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 3600);
  }
  function photo(p, seed, alt) {
    var url = p && (p.url || p);
    if (!url) return '<div class="photo">' + D.art(seed) + "</div>";
    var credit = p && p.credit ? '<span class="credit">' + D.esc(p.credit) + "</span>" : "";
    return '<div class="photo"><img src="' + D.esc(url) + '" alt="' + D.esc(alt || "") + '" loading="lazy" onerror="this.outerHTML=window.SiteData.art(\'' + D.esc(seed) + '\')">' + credit + "</div>";
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
  window.UI = { toast: toast, photo: photo, brand: brand, chat: chat, applyCouponFromUrl: applyCouponFromUrl };
})();
