(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc, I = window.I18N, T_ = I.t, tr = function (f) { return I.tr(t, f); };
  var data = await D.load();
  var S = data.settings;
  var qs = new URLSearchParams(location.search);
  var slug = window.TOUR_SLUG || qs.get("p") || "cumbuco";
  var t = data.tours.filter(function (x) { return x.slug === slug; })[0];
  var page = document.getElementById("page");
  U.brand(S);
  if (!t) { page.innerHTML = '<div class="empty" style="margin-top:24px">' + esc(T_("tour.not_found")) + ' <a href="./">' + esc(T_("tour.see_all")) + '</a></div>'; document.getElementById("bar").hidden = true; return; }

  var pageUrl = U.tourUrl(t.slug);
  if (!window.TOUR_SLUG && pageUrl.indexOf("?") < 0 && history.replaceState) { qs.delete("p"); var rest = qs.toString(); history.replaceState(null, "", pageUrl + (rest ? "?" + rest : "") + location.hash); }
  document.title = T_("tour.title", tr("name"), S.brand);
  var md = document.querySelector('meta[name="description"]'); if (md) md.content = (tr("summary") || "") + T_("tour.meta");
  var tr_ = U.tourRating(t, data.reviews), mine = U.tourReviews(t, data.reviews);
  var shown = mine.concat(data.reviews.filter(function (r) { return mine.indexOf(r) < 0; })).slice(0, 6);
  var noHotel = t.slug === "transfer-jeri-volta";
  var bring = t.category === "transfers" ? "" : '<section class="block"><h2>' + T_("tour.bring_h") + '</h2><ul class="list"><li>' + T_("tour.bring1") + "</li><li>" + T_("tour.bring2") + "</li><li>" + T_("tour.bring3") + "</li><li>" + T_("tour.bring4") + '</li></ul><p class="note">' + T_("tour.bring_note") + "</p></section>";
  var day = (t.itinerary || []).length || t.category !== "passeios" ? "" : '<section class="block"><h2>' + T_("tour.day_h") + '</h2><ol class="route"><li>' + T_("tour.day1") + "</li><li>" + T_("tour.day2") + "</li><li>" + T_("tour.day3") + "</li><li>" + T_("tour.day4") + "</li></ol></section>";
  U.chat(S, T_("tour.wa_doubt", tr("name")));

  var extras = I.trExtras(t);
  var buggyExtra = extras.filter(function (e) { return e.buggy && typeof e.price === "number"; })[0];
  var hasPriv = !t.per_vehicle && t.price_private;
  var coupon = await U.applyCouponFromUrl();
  var source = "direto";
  try { source = qs.get("utm_source") || qs.get("origem") || sessionStorage.getItem("site-origem") || (document.referrer && document.referrer.indexOf(location.host) < 0 ? new URL(document.referrer).hostname : "") || "direto"; sessionStorage.setItem("site-origem", source); } catch (e) {}
  var CUT = S.cutoff_hour == null ? 20 : Number(S.cutoff_hour);
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  var minDate = tomorrow.toISOString().slice(0, 10);
  var srvMin = await D.minDate(); if (srvMin) minDate = srvMin;
  var st = { date: (qs.get("data") && qs.get("data") >= minDate) ? qs.get("data") : minDate, kind: t.per_vehicle ? "priv" : "grupo", adults: 2, children: 0, seniors: 0, buggy: false, pay: "pix" };
  var CHILD = S.child_factor == null ? 1 : Number(S.child_factor);
  var DEP = Number(S.deposit_pct || 20);

  var photos = (t.photos || []).slice(0, 3);
  var galClass = photos.length <= 1 ? "gallery one" : photos.length === 2 ? "gallery two" : "gallery";
  var gal = photos.length ? photos.map(function (p, i) { return U.photo(p, t.slug + i, U.alt(t, i), i === 0).replace('<div class="photo">', '<div class="photo">' + (i === 0 && t.featured ? '<span class="badge">' + T_("card.featured") + "</span>" : "")); }).join("") : U.photo(null, t.slug);

  var others = data.tours.filter(function (x) { return x.slug !== t.slug; }).sort(function (a, b) { return (b.category === t.category) - (a.category === t.category); }).slice(0, 6);

  var revWord = function (n) { return T_(n === 1 ? "tour.rev_one" : "tour.rev_many"); };
  var pickup = noHotel ? T_("tour.pickup_wa") : t.category === "transfers" ? T_("tour.pickup_door") : T_("tour.pickup_hotel");
  var included = I.trList(t, "includes");
  page.innerHTML =
    '<nav class="crumbs" aria-label="' + T_("tour.crumbs") + '"><a href="./">' + T_("tour.home") + '</a><span aria-hidden="true">›</span><a href="./#passeios">' + T_("tour.tours") + '</a><span aria-hidden="true">›</span><span>' + esc(tr("name")) + "</span></nav>" +
    '<section class="head"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1>' + esc(tr("name")) + '</h1><span class="code">#' + esc(t.slug.toUpperCase()) + "</span></div>" +
    '<div class="meta"><span>📍 ' + esc(tr("location")) + "</span>" + (tr_ ? '<span><span class="stars" aria-hidden="true">★</span> <b>' + tr_.value + "</b> · " + tr_.count + " " + revWord(tr_.count) + "</span>" : "") + "</div>" +
    '<div class="actions"><button class="btn btn-ghost" type="button" id="share">' + T_("tour.share") + '</button><button class="btn btn-ghost" type="button" id="save" aria-pressed="false">' + T_("tour.save") + "</button></div></section>" +
    '<section class="' + galClass + '" aria-label="' + T_("tour.photos") + '">' + gal + "</section>" +
    '<div class="grid"><div class="content">' +
      '<section class="facts" aria-label="' + T_("tour.summary") + '">' +
        '<div class="fact"><small>' + T_("tour.duration") + "</small><b>" + esc(tr("duration") || "—") + "</b></div>" +
        '<div class="fact"><small>' + T_("tour.times") + "</small><b>" + esc(tr("times") || "—") + "</b></div>" +
        '<div class="fact"><small>' + T_("tour.pickup") + "</small><b>" + pickup + "</b></div>" +
        '<div class="fact"><small>' + T_("tour.confirm") + "</small><b>" + T_("tour.confirm_wa") + "</b></div></section>" +
      '<section class="block"><h2>' + T_("tour.about") + "</h2><p>" + esc(tr("description") || tr("summary")) + "</p></section>" +
      ((t.itinerary || []).length ? '<section class="block"><h2>' + T_("tour.route") + '</h2><ol class="route">' + t.itinerary.map(function (r) { return "<li><time>" + esc(r.time) + "</time> · " + esc(r.text) + "</li>"; }).join("") + "</ol></section>" : day) +
      '<section class="block"><h2>' + T_("tour.inc_title") + '</h2><div class="two">' +
        '<ul class="list"><li><h3 style="font-size:1rem">' + T_("tour.included") + "</h3></li>" + included.map(function (i) { return '<li class="yes">' + esc(i) + "</li>"; }).join("") + "</ul>" +
        '<ul class="list"><li><h3 style="font-size:1rem">' + T_("tour.aside") + "</h3></li>" + (extras.length ? extras.map(function (e) { return '<li><span class="extra"><span>' + esc(e.name) + '</span><span class="num">' + esc(D.money(e.price)) + "</span></span></li>"; }).join("") : '<li class="muted">' + T_("tour.nothing_aside") + "</li>") + "</ul>" +
      '</div><p class="note">' + T_("tour.inc_note") + "</p></section>" + bring +
      '<section class="block"><h2>' + T_("tour.pay_h") + '</h2><div class="pay">' +
        '<div class="pay-card rec"><span class="pill">' + T_("tour.pill") + "</span><b>" + T_("tour.pay1_h", DEP) + '</b><p class="muted">' + T_("tour.pay1_p", DEP) + "</p></div>" +
        '<div class="pay-card"><b>' + T_("tour.pay2_h") + '</b><p class="muted">' + T_("tour.pay2_p") + "</p></div></div>" + (I.es ? '<p class="note">' + T_("tour.pay_reais") + " " + T_("tour.pix_ar") + "</p>" : "") + "</section>" +
      '<section class="rain"><h2 style="font-size:1.2rem">' + T_("tour.cancel_h") + "</h2><p>" + esc(I.tx(S.cancel_policy)) + "</p></section>" +
      (shown.length ? '<section class="block"><h2>' + T_("tour.reviews_h") + '</h2><div class="reviews">' + shown.map(U.review).join("") + "</div></section>" : "") +
      '<section class="block"><h2>' + T_("tour.faq_h") + "</h2><div>" + data.faqs.map(function (q) { return "<details><summary>" + esc(I.tx(q.question)) + "</summary><p>" + esc(I.tx(q.answer)) + "</p></details>"; }).join("") + "</div></section>" +
      '<section class="block"><h2>' + T_("tour.more_h") + '</h2><div class="similar">' + others.map(function (o) { return '<a class="sim" href="' + U.tourUrl(o.slug) + '">' + U.photo((o.photos || [])[0], o.slug, U.alt(o, 0)) + '<div class="t"><b>' + esc(I.tr(o, "name")) + '</b><span class="muted">' + T_("tour.from", D.brl(o.price_pix)) + "</span></div></a>"; }).join("") + "</div></section>" +
    '</div><aside class="book" id="book" aria-label="' + (I.es ? "Reserva" : "Reserva") + '"></aside></div>';

  document.getElementById("barPrice").textContent = D.brl(t.price_pix);

  function mount(target, suffix) {
    var node = document.getElementById("bookTpl").content.cloneNode(true);
    node.querySelectorAll("[id]").forEach(function (el) { var nid = el.id + suffix; node.querySelectorAll('label[for="' + el.id + '"]').forEach(function (l) { l.htmlFor = nid; }); el.id = nid; });
    target.appendChild(node);
    target.querySelector("[data-from]").textContent = D.brl(t.price_pix);
    target.querySelectorAll("[data-dep-pct]").forEach(function (el) { el.textContent = DEP; });
    target.querySelector("[data-from2]").textContent = T_("tour.pix_card", D.brl(t.price_card));
    target.querySelector("[data-unit]").textContent = t.per_vehicle ? T_("tour.from_unit_v") : T_("tour.from_unit_p");
    if (!hasPriv) target.querySelector("[data-type-field]").hidden = true;
    if (!buggyExtra) target.querySelector("[data-buggy-field]").hidden = true;
    else target.querySelector("[data-buggy-label]").innerHTML = T_("tour.buggy_label", D.brl(buggyExtra.price));
    var cl = target.querySelector("[data-chat-link]"); var wl = D.waLink(S.whatsapp, T_("tour.wa_doubt", tr("name")));
    if (wl) cl.href = wl; else cl.hidden = true;
    var date = target.querySelector('[data-k="date"]'); date.value = st.date; date.min = minDate;
    var cut = document.createElement("p"); cut.className = "note";
    cut.textContent = T_("tour.cutoff", CUT);
    date.closest(".field").appendChild(cut);
    date.addEventListener("change", function () { if (date.value >= minDate) st.date = date.value; sync(); });
    target.querySelectorAll("[data-type]").forEach(function (b) { b.addEventListener("click", function () { st.kind = b.dataset.type; sync(); }); });
    target.querySelectorAll("[data-pay]").forEach(function (b) { b.addEventListener("click", function () { st.pay = b.dataset.pay; sync(); }); });
    target.querySelectorAll("[data-step]").forEach(function (b) { b.addEventListener("click", function () {
      var k = b.dataset.step, v = Math.max(0, Math.min(30, st[k] + Number(b.dataset.d)));
      var copy = Object.assign({}, st); copy[k] = v;
      if (copy.adults + copy.seniors < 1) return U.toast(T_("tour.min_adult"));
      st[k] = v; sync(); }); });
    target.querySelector('[data-k="buggy"]').addEventListener("change", function (e) { st.buggy = e.target.checked; sync(); });
    var cup = target.querySelector('[data-k="coupon"]');
    target.querySelector("[data-apply]").addEventListener("click", async function () {
      var code = cup.value.trim();
      if (!code) { coupon = null; D.coupon.set(""); return sync(); }
      var c = await D.checkCoupon(code);
      if (c) { coupon = c; D.coupon.set(c.code); U.toast(T_("tour.coupon_ok", c.discount_pct)); }
      else U.toast(T_("tour.coupon_bad"));
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
    var total = Math.round((base - disc + buggy) * 100) / 100;
    var dep = st.pay === "card" ? total : Math.round(total * DEP) / 100;
    return { base: base, cars: cars, buggy: buggy, disc: disc, total: total, people: people, deposit: dep, collect: total - dep, floor: false, seats: null, err: null };
  }
  var live = null, seq = 0;
  function params() { return { tour_slug: t.slug, tour_date: st.date, kind: t.per_vehicle ? "priv" : st.kind, adults: st.adults, children: st.children, seniors: st.seniors, buggy: st.buggy, pay_method: st.pay, coupon: coupon ? coupon.code : null }; }
  function fromServer(q) { return { base: +q.base, cars: q.buggy_cars, buggy: +q.buggy, disc: +q.discount, total: +q.total, people: q.people, deposit: +q.deposit, collect: +q.collect_at_boarding, floor: !!q.floor_applied, seats: q.seats_left == null ? null : q.seats_left + q.people, err: null }; }
  async function refresh() {
    var my = ++seq, r = await D.quote(params());
    if (my !== seq || r.demo) return;
    live = r.error ? Object.assign(calc(), { err: r.error.message }) : fromServer(r.data);
    paint();
  }

  function sync() { live = null; paint(); refresh(); }
  function paint() {
    var r = live || calc();
    document.querySelectorAll("#book, #sheetBook").forEach(function (box) {
      box.querySelectorAll("[data-type]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.type === st.kind); });
      box.querySelectorAll("[data-pay]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.pay === st.pay); });
      ["adults", "children", "seniors"].forEach(function (k) { var o = box.querySelector('[data-out="' + k + '"]'); if (o) o.textContent = st[k]; });
      var bg = box.querySelector('[data-k="buggy"]'); if (bg) bg.checked = st.buggy;
      var dt = box.querySelector('[data-k="date"]'); if (dt && dt.value !== st.date) dt.value = st.date;
      var cp = box.querySelector('[data-k="coupon"]'); if (cp && document.activeElement !== cp) cp.value = coupon ? coupon.code : "";
      var msg = box.querySelector("[data-coupon-msg]"); msg.hidden = !coupon; if (coupon) msg.textContent = T_("tour.coupon_msg", coupon.discount_pct, coupon.agent_name);
      var label = t.per_vehicle || st.kind === "priv" ? T_("tour.priv_label") : r.people + " " + T_(r.people === 1 ? "tour.person" : "tour.people");
      var h = '<div class="total-row"><span>' + label + '</span><span class="num">' + D.brl(r.base) + "</span></div>";
      if (r.disc && coupon) h += '<div class="total-row disc"><span>' + esc(T_("tour.coupon_row", coupon.code)) + (r.floor ? T_("tour.coupon_max") : "") + '</span><span class="num">− ' + D.brl(r.disc) + "</span></div>";
      if (r.buggy) h += '<div class="total-row"><span>' + T_("tour.buggy_row", r.cars, T_(r.cars === 1 ? "tour.car" : "tour.cars")) + '</span><span class="num">' + D.brl(r.buggy) + "</span></div>";
      h += '<div class="total-row big"><span>' + T_(st.pay === "pix" ? "tour.total_pix" : "tour.total_card") + '</span><span class="num">' + D.brl(r.total) + "</span></div>";
      if (st.pay === "card") h += '<div class="total-row muted"><span>' + T_("tour.card_4x") + '</span><span class="num">' + D.brl(r.total / 4) + "</span></div>";
      else h += '<div class="total-row muted"><span>' + T_("tour.deposit_now") + '</span><span class="num">' + D.brl(r.deposit) + '</span></div><div class="total-row muted"><span>' + T_("tour.at_boarding") + '</span><span class="num">' + D.brl(r.collect) + "</span></div>";
      if (r.seats != null && r.seats <= 6) h += '<p class="note"><b>' + T_(r.seats === 1 ? "tour.seats_one" : "tour.seats_many", r.seats) + "</b></p>";
      if (r.err) h = '<p class="warn" role="alert">' + esc(I.err(r.err)) + "</p>";
      box.querySelector("[data-total]").innerHTML = h;
      box.querySelectorAll("[data-reserve]").forEach(function (b) { b.disabled = !!r.err; });
    });
  }

  function fmtDate(d) { return d.split("-").reverse().join("/"); }
  var lastBooking = null;
  function openModal() {
    var r = live || calc();
    if (r.err) return U.toast(I.err(r.err));
    document.getElementById("sumLine").textContent = T_(st.pay === "pix" ? "tour.summary_line" : "tour.summary_line_card", tr("name"), fmtDate(st.date), D.brl(r.total));
    closeSheet();
    document.getElementById("step1").hidden = false; document.getElementById("step2").hidden = true;
    document.getElementById("modal").hidden = false; document.getElementById("cName").focus();
  }
  document.querySelectorAll("[data-close-modal]").forEach(function (b) { b.addEventListener("click", function () { document.getElementById("modal").hidden = true; }); });

  document.getElementById("custForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = document.getElementById("cName").value.trim(), phone = document.getElementById("cPhone").value.trim(), hotel = document.getElementById("cHotel").value.trim();
    if (name.length < 2 || phone.replace(/\D/g, "").length < 10) return U.toast(T_("tour.name_phone"));
    var btn = document.getElementById("confirmBtn"); btn.disabled = true; btn.textContent = T_("tour.sending");
    var res = await D.book(Object.assign(params(), { customer_name: name, phone: phone, hotel: hotel, lang: (document.documentElement.lang || "pt").slice(0, 2), source: source }));
    btn.disabled = false; btn.textContent = T_("tour.send");
    var r, code = "";
    if (res.demo) r = calc();
    else if (res.error) return U.toast(/fetch|network/i.test(res.error.message) ? T_("tour.err_book") : I.err(res.error.message));
    else { r = fromServer(res.data); code = res.data.code; }
    var row = { kind: t.per_vehicle ? "priv" : st.kind, code: code };
    lastBooking = row;
    var lines = [T_("tour.wa_booked", code ? " · " + code : ""), tr("name") + " · " + fmtDate(st.date), T_(row.kind === "priv" ? "tour.wa_priv" : "tour.wa_group") + " · " + T_("tour.wa_pax", st.adults, st.children, st.seniors)];
    if (r.cars) lines.push(T_("tour.wa_buggy", r.cars));
    if (coupon) lines.push(T_("tour.wa_coupon", coupon.code));
    lines.push(T_("tour.wa_total", D.brl(r.total), T_(st.pay === "pix" ? "tour.wa_pix" : "tour.wa_card")));
    lines.push(T_("tour.wa_name", name) + (hotel ? T_("tour.wa_pickup", hotel) : ""));
    var wa = D.waLink(S.whatsapp, lines.join("\n"));
    document.getElementById("doneTxt").textContent = (res.demo ? T_("tour.demo") : "") + T_("tour.done");
    var pb = document.getElementById("pixBox");
    if (st.pay === "pix" && S.pix_key) {
      var dep = r.deposit;
      pb.innerHTML = (code ? '<span class="label">' + esc(T_("tour.pix_res", code)) + "</span>" : "") + '<span class="label">' + esc(T_("tour.pix_dep", D.brl(dep))) + '</span><span class="muted">' + esc(T_("tour.pix_rest", D.brl(r.collect))) + "</span><b>" + esc(S.pix_key) + "</b>" + (S.pix_name ? '<span class="muted">' + esc(S.pix_name) + "</span>" : "") + '<button class="btn btn-ghost" type="button" id="copyPix">' + T_("tour.pix_copy") + "</button>" + (I.es ? '<span class="muted">' + esc(T_("tour.pix_ar")) + "</span>" : "");
      document.getElementById("copyPix").addEventListener("click", function () { var k = S.pix_key; if (navigator.clipboard) navigator.clipboard.writeText(k).then(function () { U.toast(T_("tour.pix_copied")); }, function () { U.toast(k); }); else U.toast(k); });
    } else pb.innerHTML = "<span>" + esc(T_(st.pay === "card" ? "tour.card_msg" : "tour.pix_msg")) + "</span>";
    var sw = document.getElementById("sendWa");
    if (wa) { sw.href = wa; sw.hidden = false; sw.textContent = T_(st.pay === "pix" && S.pix_key ? "tour.send_receipt" : "tour.notify_wa"); } else sw.hidden = true;
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
  function paintSave() { var on = !!favs[t.slug]; save.setAttribute("aria-pressed", on); save.textContent = T_(on ? "tour.saved" : "tour.save"); }
  paintSave();
  save.addEventListener("click", function () { favs[t.slug] = !favs[t.slug]; try { localStorage.setItem("site-favs", JSON.stringify(favs)); } catch (e) {} paintSave(); });
  document.getElementById("share").addEventListener("click", async function () {
    var url = new URL(U.tourUrl(t.slug), location.href).href;
    if (navigator.share) { try { await navigator.share({ title: tr("name"), url: url }); return; } catch (e) {} }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { U.toast(T_("tour.link_copied")); }, function () { U.toast(url); });
    else U.toast(url);
  });
})();
