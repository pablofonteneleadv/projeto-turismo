(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc;
  var data = await D.load();
  var S = data.settings;
  var qs = new URLSearchParams(location.search);
  var slug = qs.get("p") || "cumbuco";
  var t = data.tours.filter(function (x) { return x.slug === slug; })[0];
  var page = document.getElementById("page");
  U.brand(S);
  if (!t) { page.innerHTML = '<div class="empty" style="margin-top:24px">Passeio não encontrado. <a href="./">Ver todos os passeios</a></div>'; document.getElementById("bar").hidden = true; return; }

  document.title = t.name + " saindo de Fortaleza | " + S.brand + " Passeios";
  var md = document.querySelector('meta[name="description"]'); if (md) md.content = (t.summary || "") + " Busca no hotel, guia Cadastur e Pix com desconto.";
  U.chat(S, "Olá! Tenho uma dúvida sobre o passeio " + t.name + ".");

  var buggyExtra = (t.extras || []).filter(function (e) { return e.buggy && typeof e.price === "number"; })[0];
  var hasPriv = !t.per_vehicle && t.price_private;
  var coupon = await U.applyCouponFromUrl();
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  var minDate = tomorrow.toISOString().slice(0, 10);
  var st = { date: (qs.get("data") && qs.get("data") >= minDate) ? qs.get("data") : minDate, kind: t.per_vehicle ? "priv" : "grupo", adults: 2, children: 0, seniors: 0, buggy: false, pay: "pix" };
  var CHILD = Number(S.child_factor || 0.5);

  var photos = (t.photos || []).slice(0, 3);
  var galClass = photos.length <= 1 ? "gallery one" : photos.length === 2 ? "gallery two" : "gallery";
  var gal = photos.length ? photos.map(function (p, i) { return U.photo(p, t.slug + i, t.name).replace('<div class="photo">', '<div class="photo">' + (i === 0 && t.featured ? '<span class="badge">Mais vendido</span>' : "")); }).join("") : U.photo(null, t.slug);

  var others = data.tours.filter(function (x) { return x.slug !== t.slug; }).sort(function (a, b) { return (b.category === t.category) - (a.category === t.category); }).slice(0, 6);

  page.innerHTML =
    '<nav class="crumbs" aria-label="Caminho"><a href="./">Início</a><span aria-hidden="true">›</span><a href="./#passeios">Passeios</a><span aria-hidden="true">›</span><span>' + esc(t.name) + "</span></nav>" +
    '<section class="head"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1>' + esc(t.name) + '</h1><span class="code">#' + esc(t.slug.toUpperCase()) + "</span></div>" +
    '<div class="meta"><span>📍 ' + esc(t.location) + '</span><span><span class="stars" aria-hidden="true">★★★★★</span> <b>' + Number(t.rating || 5).toFixed(1).replace(".", ",") + "</b></span></div>" +
    '<div class="actions"><button class="btn btn-ghost" type="button" id="share">Compartilhar</button><button class="btn btn-ghost" type="button" id="save" aria-pressed="false">♡ Salvar</button></div></section>' +
    '<section class="' + galClass + '" aria-label="Fotos">' + gal + "</section>" +
    '<div class="grid"><div class="content">' +
      '<section class="facts" aria-label="Resumo">' +
        '<div class="fact"><small>Duração</small><b>' + esc(t.duration || "—") + "</b></div>" +
        '<div class="fact"><small>Horários</small><b>' + esc(t.times || "—") + "</b></div>" +
        '<div class="fact"><small>Busca</small><b>' + (t.category === "transfers" ? "Porta a porta" : "No seu hotel") + "</b></div>" +
        '<div class="fact"><small>Confirmação</small><b>No WhatsApp</b></div></section>' +
      '<section class="block"><h2>Sobre o passeio</h2><p>' + esc(t.description || t.summary) + "</p></section>" +
      ((t.itinerary || []).length ? '<section class="block"><h2>Roteiro previsto</h2><ol class="route">' + t.itinerary.map(function (r) { return "<li><time>" + esc(r.time) + "</time> · " + esc(r.text) + "</li>"; }).join("") + "</ol></section>" : "") +
      '<section class="block"><h2>O que está incluso e o que é à parte</h2><div class="two">' +
        '<ul class="list"><li><h3 style="font-size:1rem">Incluso</h3></li>' + (t.includes || []).map(function (i) { return '<li class="yes">' + esc(i) + "</li>"; }).join("") + "</ul>" +
        '<ul class="list"><li><h3 style="font-size:1rem">À parte, com preço de hoje</h3></li>' + ((t.extras || []).length ? t.extras.map(function (e) { return '<li><span class="extra"><span>' + esc(e.name) + '</span><span class="num">' + esc(D.money(e.price)) + "</span></span></li>"; }).join("") : '<li class="muted">Nada à parte neste passeio.</li>') + "</ul>" +
      '</div><p class="note">Sem surpresa no dia: você vê o preço dos extras antes de reservar.</p></section>' +
      '<section class="block"><h2>Como pagar</h2><div class="pay">' +
        '<div class="pay-card rec"><span class="pill">Recomendado</span><b>Pix com desconto</b><p class="muted">A vaga fica garantida assim que o Pix cai, e a confirmação chega no WhatsApp.</p></div>' +
        '<div class="pay-card"><b>Cartão em até 4x</b><p class="muted">Mandamos o link de pagamento no seu WhatsApp. Ou pague um sinal de ' + D.brl(S.deposit_per_person) + " por pessoa e o resto no embarque.</p></div></div></section>" +
      '<section class="rain"><h2 style="font-size:1.2rem">Se chover ou você desistir</h2><p>' + esc(S.cancel_policy) + "</p></section>" +
      (data.reviews.length ? '<section class="block"><h2>O que dizem os clientes</h2><div class="reviews">' + data.reviews.map(function (r) { return '<article class="review">' + (r.tour ? '<span class="trip">' + esc(r.tour) + "</span>" : "") + "<p>" + esc(r.text) + "</p><footer><span>" + esc(r.name) + (r.origin ? " · " + esc(r.origin) : "") + "</span><span>" + esc(r.month) + "</span></footer></article>"; }).join("") + "</div></section>" : "") +
      '<section class="block"><h2>Perguntas frequentes</h2><div>' + data.faqs.map(function (q) { return "<details><summary>" + esc(q.question) + "</summary><p>" + esc(q.answer) + "</p></details>"; }).join("") + "</div></section>" +
      '<section class="block"><h2>Monte seu roteiro</h2><div class="similar">' + others.map(function (o) { return '<a class="sim" href="passeio.html?p=' + encodeURIComponent(o.slug) + '">' + U.photo((o.photos || [])[0], o.slug, o.name) + '<div class="t"><b>' + esc(o.name) + '</b><span class="muted">a partir de ' + D.brl(o.price_pix) + "</span></div></a>"; }).join("") + "</div></section>" +
    '</div><aside class="book" id="book" aria-label="Reserva"></aside></div>';

  document.getElementById("barPrice").textContent = D.brl(t.price_pix);

  function mount(target, suffix) {
    var node = document.getElementById("bookTpl").content.cloneNode(true);
    node.querySelectorAll("[id]").forEach(function (el) { var nid = el.id + suffix; node.querySelectorAll('label[for="' + el.id + '"]').forEach(function (l) { l.htmlFor = nid; }); el.id = nid; });
    target.appendChild(node);
    target.querySelector("[data-from]").textContent = D.brl(t.price_pix);
    target.querySelector("[data-from2]").textContent = "no Pix · " + D.brl(t.price_card) + " em até 4x";
    target.querySelector("[data-unit]").textContent = t.per_vehicle ? "Por veículo" : "Por pessoa a partir de";
    if (!hasPriv) target.querySelector("[data-type-field]").hidden = true;
    if (!buggyExtra) target.querySelector("[data-buggy-field]").hidden = true;
    else target.querySelector("[data-buggy-label]").innerHTML = "<b>Garantir o buggy</b> · " + D.brl(buggyExtra.price) + " por carro, até 4 pessoas.";
    var cl = target.querySelector("[data-chat-link]"); var wl = D.waLink(S.whatsapp, "Olá! Tenho uma dúvida sobre o passeio " + t.name + ".");
    if (wl) cl.href = wl; else cl.hidden = true;
    var date = target.querySelector('[data-k="date"]'); date.value = st.date; date.min = minDate;
    date.addEventListener("change", function () { if (date.value >= minDate) st.date = date.value; sync(); });
    target.querySelectorAll("[data-type]").forEach(function (b) { b.addEventListener("click", function () { st.kind = b.dataset.type; sync(); }); });
    target.querySelectorAll("[data-pay]").forEach(function (b) { b.addEventListener("click", function () { st.pay = b.dataset.pay; sync(); }); });
    target.querySelectorAll("[data-step]").forEach(function (b) { b.addEventListener("click", function () {
      var k = b.dataset.step, v = Math.max(0, Math.min(30, st[k] + Number(b.dataset.d)));
      var copy = Object.assign({}, st); copy[k] = v;
      if (copy.adults + copy.seniors < 1) return U.toast("A reserva precisa de pelo menos 1 adulto ou idoso.");
      st[k] = v; sync(); }); });
    target.querySelector('[data-k="buggy"]').addEventListener("change", function (e) { st.buggy = e.target.checked; sync(); });
    var cup = target.querySelector('[data-k="coupon"]');
    target.querySelector("[data-apply]").addEventListener("click", async function () {
      var code = cup.value.trim();
      if (!code) { coupon = null; D.coupon.set(""); return sync(); }
      var c = await D.checkCoupon(code);
      if (c) { coupon = c; D.coupon.set(c.code); U.toast("Cupom aplicado: " + c.discount_pct + "% de desconto."); }
      else U.toast("Cupom não encontrado. Confira com quem te indicou.");
      sync(); });
    target.querySelector("[data-reserve]").addEventListener("click", openModal);
  }

  function calc() {
    var p = st.pay === "pix" ? Number(t.price_pix) : Number(t.price_card), people = st.adults + st.seniors + st.children, base;
    if (t.per_vehicle) base = p;
    else if (st.kind === "priv") base = Number(t.price_private) * (st.pay === "pix" ? 1 : Number(t.price_card) / Number(t.price_pix));
    else base = (st.adults + st.seniors) * p + st.children * p * CHILD;
    base = Math.round(base * 100) / 100;
    var cars = st.buggy && buggyExtra ? Math.max(1, Math.ceil(people / 4)) : 0;
    var buggy = cars * (buggyExtra ? buggyExtra.price : 0);
    var disc = coupon ? Math.round(base * coupon.discount_pct) / 100 : 0;
    return { base: base, cars: cars, buggy: buggy, disc: disc, total: Math.round((base - disc + buggy) * 100) / 100, people: people };
  }

  function sync() {
    var r = calc();
    document.querySelectorAll("#book, #sheetBook").forEach(function (box) {
      box.querySelectorAll("[data-type]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.type === st.kind); });
      box.querySelectorAll("[data-pay]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.pay === st.pay); });
      ["adults", "children", "seniors"].forEach(function (k) { var o = box.querySelector('[data-out="' + k + '"]'); if (o) o.textContent = st[k]; });
      var bg = box.querySelector('[data-k="buggy"]'); if (bg) bg.checked = st.buggy;
      var dt = box.querySelector('[data-k="date"]'); if (dt && dt.value !== st.date) dt.value = st.date;
      var cp = box.querySelector('[data-k="coupon"]'); if (cp && document.activeElement !== cp) cp.value = coupon ? coupon.code : "";
      var msg = box.querySelector("[data-coupon-msg]"); msg.hidden = !coupon; if (coupon) msg.textContent = "✓ " + coupon.discount_pct + "% de desconto · indicação de " + coupon.agent_name;
      var label = t.per_vehicle || st.kind === "priv" ? "Veículo só para o seu grupo" : r.people + (r.people === 1 ? " pessoa" : " pessoas");
      var h = '<div class="total-row"><span>' + label + '</span><span class="num">' + D.brl(r.base) + "</span></div>";
      if (r.disc) h += '<div class="total-row disc"><span>Cupom ' + esc(coupon.code) + '</span><span class="num">− ' + D.brl(r.disc) + "</span></div>";
      if (r.buggy) h += '<div class="total-row"><span>Buggy · ' + r.cars + (r.cars === 1 ? " carro" : " carros") + '</span><span class="num">' + D.brl(r.buggy) + "</span></div>";
      h += '<div class="total-row big"><span>Total no ' + (st.pay === "pix" ? "Pix" : "cartão") + '</span><span class="num">' + D.brl(r.total) + "</span></div>";
      if (st.pay === "card") h += '<div class="total-row muted"><span>em até 4x de</span><span class="num">' + D.brl(r.total / 4) + "</span></div>";
      box.querySelector("[data-total]").innerHTML = h;
    });
  }

  function fmtDate(d) { return d.split("-").reverse().join("/"); }
  var lastBooking = null;
  function openModal() {
    var r = calc();
    document.getElementById("sumLine").textContent = t.name + " · " + fmtDate(st.date) + " · " + D.brl(r.total) + (st.pay === "pix" ? " no Pix" : " no cartão");
    closeSheet();
    document.getElementById("step1").hidden = false; document.getElementById("step2").hidden = true;
    document.getElementById("modal").hidden = false; document.getElementById("cName").focus();
  }
  document.querySelectorAll("[data-close-modal]").forEach(function (b) { b.addEventListener("click", function () { document.getElementById("modal").hidden = true; }); });

  document.getElementById("custForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = document.getElementById("cName").value.trim(), phone = document.getElementById("cPhone").value.trim(), hotel = document.getElementById("cHotel").value.trim();
    if (name.length < 2 || phone.replace(/\D/g, "").length < 10) return U.toast("Preencha nome e WhatsApp com DDD.");
    var r = calc(), btn = document.getElementById("confirmBtn"); btn.disabled = true; btn.textContent = "Enviando…";
    var row = { tour_slug: t.slug, tour_name: t.name, tour_date: st.date, kind: t.per_vehicle ? "priv" : st.kind, adults: st.adults, children: st.children, seniors: st.seniors,
      buggy_cars: r.cars, coupon: coupon ? coupon.code : null, pay_method: st.pay, total: r.total, customer_name: name, phone: phone, hotel: hotel || null, status: "pendente" };
    var res = await D.insert("bookings", row);
    btn.disabled = false; btn.textContent = "Confirmar reserva";
    if (res.error) return U.toast("Não deu para registrar agora. Tente de novo ou chame no WhatsApp.");
    lastBooking = row;
    var lines = ["Olá! Acabei de reservar pelo site:", t.name + " · " + fmtDate(st.date), (row.kind === "priv" ? "Privativo" : "Em grupo") + " · " + st.adults + " adulto(s), " + st.children + " criança(s), " + st.seniors + " idoso(s)"];
    if (r.cars) lines.push("Buggy: " + r.cars + " carro(s)");
    if (coupon) lines.push("Cupom: " + coupon.code);
    lines.push("Total: " + D.brl(r.total) + (st.pay === "pix" ? " no Pix" : " no cartão"));
    lines.push("Nome: " + name + (hotel ? " · Busca: " + hotel : ""));
    var wa = D.waLink(S.whatsapp, lines.join("\n"));
    document.getElementById("doneTxt").textContent = (res.demo ? "(Demonstração: o banco ainda não está ligado.) " : "") + "Sua vaga fica garantida quando o pagamento for confirmado. A confirmação chega no seu WhatsApp.";
    var pb = document.getElementById("pixBox");
    if (st.pay === "pix" && S.pix_key) {
      pb.innerHTML = '<span class="label">Pague ' + D.brl(r.total) + " no Pix</span><b>" + esc(S.pix_key) + "</b>" + (S.pix_name ? '<span class="muted">' + esc(S.pix_name) + "</span>" : "") + '<button class="btn btn-ghost" type="button" id="copyPix">Copiar chave Pix</button>';
      document.getElementById("copyPix").addEventListener("click", function () { var k = S.pix_key; if (navigator.clipboard) navigator.clipboard.writeText(k).then(function () { U.toast("Chave Pix copiada."); }, function () { U.toast(k); }); else U.toast(k); });
    } else pb.innerHTML = st.pay === "card" ? "<span>O link de pagamento no cartão chega no seu WhatsApp em instantes.</span>" : "<span>A chave Pix chega no seu WhatsApp em instantes.</span>";
    var sw = document.getElementById("sendWa");
    if (wa) { sw.href = wa; sw.hidden = false; sw.textContent = st.pay === "pix" && S.pix_key ? "Enviar comprovante no WhatsApp" : "Avisar no WhatsApp"; } else sw.hidden = true;
    document.getElementById("step1").hidden = true; document.getElementById("step2").hidden = false;
  });

  function openSheet() { if (window.matchMedia("(min-width: 901px)").matches) { document.getElementById("book").scrollIntoView({ behavior: "smooth" }); return; } document.getElementById("sheet").hidden = false; document.getElementById("overlay").hidden = false; }
  function closeSheet() { document.getElementById("sheet").hidden = true; document.getElementById("overlay").hidden = true; }
  mount(document.getElementById("book"), "");
  mount(document.getElementById("sheetBook"), "-s");
  sync();
  document.querySelectorAll("[data-open-book]").forEach(function (b) { b.addEventListener("click", openSheet); });
  document.getElementById("closeSheet").addEventListener("click", closeSheet);
  document.getElementById("overlay").addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeSheet(); document.getElementById("modal").hidden = true; } });

  var save = document.getElementById("save"), favs = {};
  try { favs = JSON.parse(localStorage.getItem("site-favs") || "{}") || {}; } catch (e) {}
  function paintSave() { var on = !!favs[t.slug]; save.setAttribute("aria-pressed", on); save.textContent = on ? "♥ Salvo" : "♡ Salvar"; }
  paintSave();
  save.addEventListener("click", function () { favs[t.slug] = !favs[t.slug]; try { localStorage.setItem("site-favs", JSON.stringify(favs)); } catch (e) {} paintSave(); });
  document.getElementById("share").addEventListener("click", async function () {
    var url = location.href.split("#")[0];
    if (navigator.share) { try { await navigator.share({ title: t.name, url: url }); return; } catch (e) {} }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { U.toast("Link copiado. É só colar no WhatsApp."); }, function () { U.toast(url); });
    else U.toast(url);
  });
})();
