(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc;
  var data = await D.load();
  var S = data.settings, T = data.tours;
  var cat = "todos", dest = "", pack = [], favs = {};
  try { favs = JSON.parse(localStorage.getItem("site-favs") || "{}") || {}; } catch (e) { favs = {}; }

  U.brand(S); U.chat(S);
  document.getElementById("heroPhoto").innerHTML = U.photo({ url: "fotos/hero-2.jpg", credit: "Foto: MTur Destinos · Domínio público" }, "hero", "Praia de Iracema e Beira Mar de Fortaleza", true);
  if (S.hero_eyebrow) document.getElementById("heroEyebrow").textContent = S.hero_eyebrow;
  if (S.hero_title) document.getElementById("heroTitle").textContent = S.hero_title;
  document.getElementById("promises").innerHTML = (S.hero_promises || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
  // Avaliações: só notas reais. Usa a nota do Google cadastrada no painel ou a média das avaliações publicadas (mínimo 3).
  var R = U.ratings(S, data.reviews), showRatings = !!R;
  if (R) {
    var hr = document.querySelector(".hero .rating"); hr.hidden = false;
    document.getElementById("ratingValue").textContent = R.value;
    document.getElementById("ratingCount").textContent = "· " + R.label;
  }
  if (!data.reviews.length) document.getElementById("reviewsSection").hidden = true;
  else document.getElementById("reviewsSummary").textContent = data.reviews.length >= 3 ? "Nota média " + U.ratings(null, data.reviews).value + " de 5, de quem já viajou com a gente." : "De quem já viajou com a gente.";
  document.getElementById("packPct").textContent = S.pack_discount_pct;
  var minPix = T.filter(function (t) { return !t.per_vehicle; }).reduce(function (m, t) { return Math.min(m, Number(t.price_pix)); }, Infinity);
  if (isFinite(minPix)) document.getElementById("fromPrice").textContent = D.brl(minPix);

  var coupon = await U.applyCouponFromUrl();
  if (coupon) { document.getElementById("couponBand").hidden = false; document.getElementById("couponTxt").textContent = "Cupom " + coupon.code + " ativo: " + coupon.discount_pct + "% de desconto, indicação de " + coupon.agent_name + "."; }

  var f = document.getElementById("filters");
  D.CATS.forEach(function (k) {
    var count = k[0] === "todos" ? T.length : T.filter(function (t) { return t.category === k[0]; }).length;
    if (!count) return;
    var b = document.createElement("button"); b.type = "button"; b.dataset.cat = k[0];
    b.innerHTML = esc(k[1]) + ' <span class="num">' + count + "</span>";
    b.addEventListener("click", function () { cat = k[0]; dest = ""; sel.value = ""; render(); });
    f.appendChild(b);
  });
  var sel = document.getElementById("dest");
  T.forEach(function (t) { var o = document.createElement("option"); o.value = t.slug; o.textContent = t.name; sel.appendChild(o); });
  var dt = new Date(); dt.setDate(dt.getDate() + 1);
  var w = document.getElementById("when"); w.value = dt.toISOString().slice(0, 10); w.min = w.value;

  function link(t) { return "passeio.html?p=" + encodeURIComponent(t.slug) + "&data=" + w.value; }

  function render() {
    f.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.cat === cat); });
    var list = T.filter(function (t) { return (cat === "todos" || t.category === cat) && (!dest || t.slug === dest); });
    var box = document.getElementById("cards"); box.innerHTML = "";
    if (!list.length) { box.innerHTML = '<div class="empty">Nenhum passeio nesta categoria ainda.</div>'; return; }
    list.forEach(function (t) {
      var inPack = pack.indexOf(t.slug) > -1, fav = !!favs[t.slug];
      var el = document.createElement("article"); el.className = "card";
      el.innerHTML =
        '<div style="position:relative">' + U.photo((t.photos || [])[0], t.slug, U.alt(t, 0)) +
        '<div class="tags"><span class="tag">' + (t.category === "transfers" ? "Porta a porta" : "Busca no hotel") + "</span>" + (t.featured ? '<span class="tag hot">Destaque</span>' : "") + "</div>" +
        '<button class="fav" type="button" aria-pressed="' + fav + '" aria-label="Salvar ' + esc(t.name) + '">' + (fav ? "♥" : "♡") + "</button></div>" +
        '<div class="body"><h3>' + esc(t.name) + "</h3>" +
        '<div class="where"><span>📍 ' + esc(t.location) + "</span>" + (function () { var tr = U.tourRating(t, data.reviews); return tr ? '<span><span class="stars" aria-hidden="true">★</span> ' + tr.value + ' <small class="muted">(' + tr.count + ")</small></span>" : ""; })() + "</div>" +
        '<div class="time">' + esc(t.times) + "</div>" +
        '<div class="price"><div><small>A partir de · ' + (t.per_vehicle ? "por veículo" : "por pessoa") + '</small><b class="num">' + D.brl(t.price_card) + '</b></div><span class="pix num">' + D.brl(t.price_pix) + " no Pix</span></div>" +
        '<div class="row"><a class="btn btn-mar" href="' + link(t) + '">Ver passeio</a>' +
        '<button class="btn btn-ghost add" type="button" aria-pressed="' + inPack + '">' + (inPack ? "✓ No pacote" : "+ Pacote") + "</button></div></div>";
      el.querySelector(".fav").addEventListener("click", function () { favs[t.slug] = !favs[t.slug]; try { localStorage.setItem("site-favs", JSON.stringify(favs)); } catch (e) {} U.toast(favs[t.slug] ? "Salvo neste aparelho." : "Removido dos salvos."); render(); });
      el.querySelector(".add").addEventListener("click", function () { var i = pack.indexOf(t.slug); if (i > -1) pack.splice(i, 1); else pack.push(t.slug); render(); paintPack(); });
      box.appendChild(el);
    });
    var name = (D.CATS.filter(function (k) { return k[0] === cat; })[0] || [0, ""])[1];
    document.getElementById("listTitle").textContent = dest ? "Seu passeio" : (cat === "todos" ? "Escolha seu dia de praia" : name);
  }

  function paintPack() {
    var bar = document.getElementById("packbar");
    if (!pack.length) { bar.hidden = true; document.body.classList.remove("has-bar"); return; }
    var items = pack.map(function (s) { return T.filter(function (t) { return t.slug === s; })[0]; });
    var sum = items.reduce(function (a, t) { return a + Number(t.price_pix); }, 0);
    var off = pack.length >= 2 ? S.pack_discount_pct / 100 : 0, cup = coupon ? coupon.discount_pct / 100 : 0;
    document.getElementById("packCount").textContent = pack.length + (pack.length === 1 ? " passeio no pacote" : " passeios no pacote") + " · por pessoa no Pix";
    document.getElementById("packSave").textContent = pack.length >= 2 ? S.pack_discount_pct + "% de desconto de pacote" + (coupon ? " + " + coupon.discount_pct + "% do cupom " + coupon.code : "") : "Adicione mais 1 para ganhar " + S.pack_discount_pct + "%";
    document.getElementById("packTotal").textContent = D.brl(sum * (1 - off - cup));
    var msg = "Olá! Quero reservar um pacote: " + items.map(function (t) { return t.name; }).join(", ") + (coupon ? ". Cupom " + coupon.code : "") + ".";
    var go = document.getElementById("packGo"); var l = D.waLink(S.whatsapp, msg);
    go.href = l || "#"; go.target = l ? "_blank" : ""; go.onclick = l ? null : function (e) { e.preventDefault(); U.toast("O WhatsApp de atendimento ainda não foi cadastrado no painel."); };
    bar.hidden = false; document.body.classList.add("has-bar");
  }

  document.getElementById("search").addEventListener("submit", function (e) { e.preventDefault(); dest = sel.value; cat = "todos"; render(); document.getElementById("passeios").scrollIntoView(); });
  function goPack() { cat = "todos"; dest = ""; sel.value = ""; render(); document.getElementById("passeios").scrollIntoView(); U.toast("Toque em “+ Pacote” nos passeios que quiser."); }
  document.getElementById("packOpen").addEventListener("click", goPack);
  document.getElementById("packCta").addEventListener("click", goPack);

  document.getElementById("reviews").innerHTML = data.reviews.map(U.review).join("");
  document.getElementById("faqs").innerHTML = data.faqs.map(function (q) { return "<details><summary>" + esc(q.question) + "</summary><p>" + esc(q.answer) + "</p></details>"; }).join("");

  function phoneOk(v) { return v.replace(/\D/g, "").length >= 10; }
  document.getElementById("newsForm").addEventListener("submit", async function (e) {
    e.preventDefault(); var v = document.getElementById("newsPhone").value.trim();
    if (!phoneOk(v)) return U.toast("Digite o WhatsApp com DDD.");
    var r = await D.insert("leads", { phone: v, source: "promocoes" });
    if (r.error) return U.toast("Não deu para salvar agora. Tente de novo em instantes.");
    e.target.reset(); U.toast(r.demo ? "Recebido (modo de demonstração, sem banco ligado)." : "Pronto! Você vai receber as promoções no WhatsApp.");
  });
  document.getElementById("partnerForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var row = { name: document.getElementById("pName").value.trim(), phone: document.getElementById("pPhone").value.trim(), role: document.getElementById("pRole").value };
    if (row.name.length < 2 || !phoneOk(row.phone)) return U.toast("Preencha nome e WhatsApp com DDD.");
    var r = await D.insert("partner_requests", row);
    if (r.error) return U.toast("Não deu para enviar agora. Tente de novo em instantes.");
    e.target.reset(); U.toast(r.demo ? "Recebido (modo de demonstração, sem banco ligado)." : "Recebemos! Vamos te chamar no WhatsApp com o seu cupom.");
  });

  render();
})();
