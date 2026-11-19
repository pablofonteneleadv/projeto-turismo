(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc, I = window.I18N, T_ = I.t, tr = function (f) { return I.tr(t, f); };
  var data = await D.load();
  var S = data.settings;
  var qs = new URLSearchParams(location.search);
  var slug = window.TOUR_SLUG || qs.get("p") || "cumbuco";
  var t = data.tours.find(function (x) { return x.slug === slug; });
  var page = document.getElementById("page");
  U.brand(S);
  var floatingChat = document.getElementById("chat");
  if (floatingChat) floatingChat.hidden = true;
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
  var extras = I.trExtras(t);
  var buggyExtra = extras.filter(function (e) { return e.buggy && typeof e.price === "number"; })[0];
  var hasPriv = !t.per_vehicle && Number(t.price_private) > 0;
  var canBook = data.live === true && t.sales_mode === "booking" && !!D.waLink(S.whatsapp);
  var hasReferencePrice = data.live === true && Number(t.price_pix) > 0;
  var cutoff = Number(S.cutoff_hour);
  if (S.cutoff_hour == null || !Number.isInteger(cutoff) || cutoff < 0 || cutoff > 23) cutoff = 20;
  var weekdays = Array.isArray(t.departure_weekdays) ? t.departure_weekdays.map(Number).filter(function (day) { return day >= 1 && day <= 7; }) : [];
  var attribution = typeof U.attribution === "function" ? U.attribution() : {};
  var attributionRef = typeof U.attributionRef === "function" ? U.attributionRef() : "";
  var storageKey = "maretur-trip:" + t.slug;
  var dateClock = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"
  });
  var minDate, maxDate;
  updateDateBounds();
  var stored = {};
  try { stored = JSON.parse(sessionStorage.getItem(storageKey) || "{}") || {}; } catch (error) {}
  var st = {
    date: qs.has("data") ? (validDate(qs.get("data")) ? qs.get("data") : "") : (validDate(stored.date) && stored.date >= minDate ? stored.date : nextDeparture(minDate)),
    kind: t.per_vehicle || (hasPriv && stored.kind === "priv") ? "priv" : "grupo",
    adults: travelers(stored.adults, 2), children: travelers(stored.children, 0), seniors: travelers(stored.seniors, 0),
    buggy: !!buggyExtra && stored.buggy === true,
    pay: stored.pay === "card" || !pixConfigured() ? "card" : "pix"
  };
  if (!st.adults && !st.seniors) st.adults = 1;
  var coupon = null;
  var referral = referralCode(qs.get("cupom")) || referralCode(stored.referral) || referralCode(D.coupon.get());

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
      '<section class="block"><h2>' + T_("tour.consult_payment_h") + '</h2><p>' + T_(canBook ? "tour.online_payment_p" : "tour.consult_payment_p") + "</p></section>" +
      '<section class="rain"><h2 style="font-size:1.2rem">' + T_("tour.cancel_h") + "</h2><p>" + (canBook && S.cancel_policy ? esc(I.tx(S.cancel_policy)) : T_("tour.consult_policy")) + "</p></section>" +
      (shown.length ? '<section class="block"><h2>' + T_("tour.reviews_h") + '</h2><div class="reviews">' + shown.map(U.review).join("") + "</div></section>" : "") +
      '<section class="block"><h2>' + T_("tour.faq_h") + "</h2><div>" + data.faqs.map(function (q) { return "<details><summary>" + esc(I.tx(q.question)) + "</summary><p>" + esc(faqAnswer(q)) + "</p></details>"; }).join("") + "</div></section>" +
      '<section class="block"><h2>' + T_("tour.more_h") + '</h2><div class="similar">' + others.map(function (o) { return '<a class="sim" href="' + U.tourUrl(o.slug) + '">' + U.photo((o.photos || [])[0], o.slug, U.alt(o, 0)) + '<div class="t"><b>' + esc(I.tr(o, "name")) + '</b><span class="muted">' + (data.live && Number(o.price_pix) > 0 ? T_("tour.from", D.brl(o.price_pix)) : T_("tour.price_consult")) + "</span></div></a>"; }).join("") + "</div></section>" +
    '</div><aside class="book" id="book" aria-label="' + (I.es ? "Reserva" : "Reserva") + '"></aside></div>';

  document.getElementById("barLabel").textContent = hasReferencePrice ? T_("tour.price_reference") : T_("tour.consult_title");
  document.getElementById("barPrice").textContent = hasReferencePrice ? D.brl(t.price_pix) : T_("tour.price_consult");

  var quote = null, quoteStatus = "", quoteLoading = false, quoteSeq = 0, couponSeq = 0;
  var sheet = document.getElementById("sheet"), overlay = document.getElementById("overlay");
  var modal = document.getElementById("modal"), modalTitle = document.getElementById("modalTitle");
  var step1 = document.getElementById("step1"), step2 = document.getElementById("step2");
  var firstName = document.getElementById("cName"), phoneInput = document.getElementById("cPhone"), hotelInput = document.getElementById("cHotel");
  var checkoutError = document.getElementById("bookingError"), confirmButton = document.getElementById("confirmBtn");
  var widgets = [document.getElementById("book"), document.getElementById("sheetBook")];
  var sheetCaller, modalCaller, modalQuote, requestAttempt, receipt, holdTimer, submitting = false;

  function track(name, details) {
    if (typeof U.track === "function") U.track(name, Object.assign({ tour_slug: t.slug }, details));
  }

  function faqAnswer(q) {
    if (q.question === "Como funciona a reserva?") return T_(canBook ? "tour.online_payment_p" : "tour.consult_payment_p");
    if (q.question === "Posso cancelar?") return T_("tour.consult_policy");
    if (q.question === "Criança paga?") return T_("tour.pax_note");
    return I.tx(q.answer);
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    var d = new Date(value + "T12:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }

  function addDays(value, days) {
    var d = new Date(value + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function updateDateBounds() {
    var parts = {};
    dateClock.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var today = parts.year + "-" + parts.month + "-" + parts.day;
    minDate = addDays(today, Number(parts.hour) >= cutoff ? 2 : 1);
    maxDate = addDays(today, 400);
  }

  function operatesOn(value) {
    return !weekdays.length || weekdays.includes(new Date(value + "T12:00:00Z").getUTCDay() || 7);
  }

  function nextDeparture(value) {
    for (var offset = 0; offset < 7; offset++) {
      var next = addDays(value, offset);
      if (operatesOn(next)) return next;
    }
    return value;
  }

  function fmtDate(value) { return value.split("-").reverse().join("/"); }

  function dateIssue() {
    if (!validDate(st.date)) return T_("tour.date_prompt");
    if (st.date < minDate) return T_("tour.date_min", fmtDate(minDate));
    if (st.date > maxDate) return T_("tour.date_max", fmtDate(maxDate));
    if (!operatesOn(st.date)) return T_("tour.date_no_departure");
    return "";
  }

  function travelers(value, fallback) {
    return Number.isInteger(value) && value >= 0 && value <= 30 ? value : fallback;
  }

  function referralCode(value) {
    var code = String(value || "").trim().toUpperCase();
    return /^[A-Z0-9_-]{1,32}$/.test(code) ? code : "";
  }

  function pixConfigured() {
    return S.pix_payment_verified === true;
  }

  function editSelectionUrl(name, value) {
    if (!history.replaceState) return;
    var url = new URL(location.href);
    if (value) url.searchParams.set(name, value); else url.searchParams.delete(name);
    history.replaceState(history.state, "", url);
  }

  function consultLink(issue) {
    var lines = [
      T_("tour.wa_consult"),
      tr("name"),
      issue ? T_("tour.wa_no_date") : fmtDate(st.date),
      T_("tour.wa_pax", st.adults, st.children, st.seniors)
    ];
    if (hasPriv) lines.push(T_(st.kind === "priv" ? "tour.wa_priv" : "tour.wa_group"));
    if (st.buggy) lines.push(T_("tour.wa_extra"));
    if (referral) lines.push(T_("tour.wa_coupon", referral));
    if (attributionRef) lines.push(T_("tour.wa_ref", attributionRef));
    return D.waLink(S.whatsapp, lines.join("\n"));
  }

  function mount(target, suffix) {
    var node = document.getElementById("bookTpl").content.cloneNode(true);
    node.querySelectorAll("[id]").forEach(function (el) {
      var id = el.id + suffix;
      node.querySelectorAll('label[for="' + el.id + '"]').forEach(function (label) { label.htmlFor = id; });
      el.id = id;
    });
    target.appendChild(node);
    target.querySelector("[data-from]").textContent = hasReferencePrice ? D.brl(t.price_pix) : T_("tour.price_consult");
    target.querySelector("[data-from2]").textContent = hasReferencePrice ? T_("tour.price_reference") : "";
    target.querySelector("[data-unit]").textContent = hasReferencePrice ? T_(t.per_vehicle ? "tour.from_vehicle" : "tour.from_unit_p") : T_("tour.consult_title");
    target.querySelector("[data-type-field]").hidden = !hasPriv;
    target.querySelector("[data-buggy-field]").hidden = !buggyExtra;
    target.querySelector("[data-buggy-label]").textContent = T_("tour.buggy_interest");
    target.querySelector("[data-pax-note]").textContent = T_("tour.pax_note");
    target.querySelector("[data-pay-field]").hidden = !canBook;
    target.querySelector('[data-pay="pix"]').disabled = !pixConfigured();
    var date = target.querySelector('[data-k="date"]');
    var cutoffNote = document.createElement("p");
    cutoffNote.className = "note";
    cutoffNote.textContent = T_("tour.cutoff", cutoff);
    date.closest(".field").appendChild(cutoffNote);
    date.addEventListener("change", function () { st.date = date.value; editSelectionUrl("data", st.date); sync(); });
    target.querySelectorAll("[data-type]").forEach(function (b) { b.addEventListener("click", function () { st.kind = b.dataset.type; sync(); }); });
    target.querySelectorAll("[data-pay]").forEach(function (b) { b.addEventListener("click", function () { st.pay = b.dataset.pay; sync(); }); });
    target.querySelectorAll("[data-step]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.dataset.step;
        var next = Math.max(0, Math.min(30, st[key] + Number(b.dataset.d)));
        var count = next + (key === "adults" ? st.seniors : st.adults);
        if (key !== "children" && count < 1) return U.toast(T_("tour.min_adult"));
        if (st[key] !== next) { st[key] = next; sync(); }
      });
    });
    target.querySelector('[data-k="buggy"]').addEventListener("change", function (e) { st.buggy = e.target.checked; sync(); });
    var cup = target.querySelector('[data-k="coupon"]');
    var apply = target.querySelector("[data-apply]");
    apply.addEventListener("click", function () {
      var code = referralCode(cup.value);
      if (cup.value.trim() && !code) return U.toast(T_("tour.coupon_invalid_format"));
      applyReferral(code, true);
    });
    cup.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); apply.click(); }
    });
    var reserve = target.querySelector("[data-reserve]");
    reserve.textContent = T_("tour.booking_cta");
    reserve.addEventListener("click", openModal);
    var consult = target.querySelector("[data-consult]");
    consult.textContent = T_("tour.consult_cta");
    consult.addEventListener("click", function () { track("tour_consult_click", { mode: canBook ? "booking_fallback" : "consultation" }); });
    var retry = target.querySelector("[data-quote-retry]");
    retry.textContent = T_("tour.quote_retry");
    retry.addEventListener("click", sync);
  }

  async function applyReferral(code, notify) {
    var request = ++couponSeq;
    referral = code;
    coupon = null;
    if (notify) editSelectionUrl("cupom", code);
    if (notify || !canBook || !code) sync();
    if (!code) { D.coupon.set(""); return; }
    if (!canBook) return;
    var result;
    try { result = await D.checkCoupon(code); } catch (error) {}
    if (request !== couponSeq) return;
    coupon = result || null;
    if (coupon) D.coupon.set(coupon.code);
    else if (notify) U.toast(T_("tour.coupon_bad"));
    sync();
  }

  function params() {
    return {
      tour_slug: t.slug, tour_date: st.date, kind: st.kind,
      adults: st.adults, children: st.children, seniors: st.seniors,
      buggy: st.buggy, pay_method: st.pay, coupon: coupon ? coupon.code : null
    };
  }

  function usableQuote(q, p) {
    if (!q || q.tour_slug !== p.tour_slug || q.tour_date !== p.tour_date || q.pay_method !== p.pay_method) return false;
    return ["total", "deposit", "collect_at_boarding", "people", "base"].every(function (key) {
      return q[key] != null && Number.isFinite(Number(q[key])) && Number(q[key]) >= 0;
    }) && Number(q.total) > 0 && Number(q.people) === p.adults + p.children + p.seniors;
  }

  async function runRpc(call) {
    var timer;
    try {
      return await Promise.race([
        call(),
        new Promise(function (resolve) { timer = setTimeout(function () { resolve({ error: { message: "timeout" } }); }, 10000); })
      ]);
    } catch (error) {
      return { error: { message: "network" } };
    } finally {
      clearTimeout(timer);
    }
  }

  function serverMessage(response, fallback) {
    var msg = response && response.error && response.error.message;
    if (typeof msg === "string" && /^(Passeio indisponível|As saídas dessa data já fecharam|Restam \d+ vagas|A reserva precisa|Informe seu nome|Informe o WhatsApp|A cotação mudou|Escolha uma data|Data muito distante)[^<>]{0,120}$/.test(msg)) return I.err(msg);
    return T_(fallback);
  }

  async function sync() {
    updateDateBounds();
    try { sessionStorage.setItem(storageKey, JSON.stringify(Object.assign({ referral: referral }, st))); } catch (error) {}
    var sequence = ++quoteSeq;
    quote = null;
    quoteStatus = "";
    quoteLoading = canBook && !dateIssue();
    paint();
    if (!quoteLoading) return;
    var selection = params();
    var response = await runRpc(function () { return D.quote(selection); });
    if (sequence !== quoteSeq) return;
    quoteLoading = false;
    if (response && !response.error && !response.demo && usableQuote(response.data, selection)) {
      quote = { data: response.data, params: selection, at: Date.now() };
      track("tour_quote", { status: "available" });
    } else {
      quoteStatus = serverMessage(response, "tour.quote_unavailable");
      track("tour_quote", { status: "unavailable" });
    }
    paint();
  }

  function quoteTotal(q) {
    var label = st.kind === "priv" ? T_("tour.priv_label") : q.people + " " + T_(Number(q.people) === 1 ? "tour.person" : "tour.people");
    var h = '<div class="total-row"><span>' + label + '</span><span class="num">' + D.brl(q.base) + "</span></div>";
    if (Number(q.discount) > 0 && q.coupon) {
      h += '<div class="total-row disc"><span>' + esc(T_("tour.coupon_row", q.coupon)) + (q.floor_applied ? T_("tour.coupon_max") : "") + '</span><span class="num">− ' + D.brl(q.discount) + "</span></div>";
    }
    if (Number(q.buggy) > 0) {
      h += '<div class="total-row"><span>' + T_("tour.buggy_row", Number(q.buggy_cars), T_(Number(q.buggy_cars) === 1 ? "tour.car" : "tour.cars")) + '</span><span class="num">' + D.brl(q.buggy) + "</span></div>";
    }
    h += '<div class="total-row big"><span>' + T_(st.pay === "pix" ? "tour.total_pix" : "tour.total_card") + '</span><span class="num">' + D.brl(q.total) + "</span></div>";
    if (st.pay === "pix") {
      h += '<div class="total-row muted"><span>' + T_("tour.deposit_now") + '</span><span class="num">' + D.brl(q.deposit) + "</span></div>";
      h += '<div class="total-row muted"><span>' + T_("tour.at_boarding") + '</span><span class="num">' + D.brl(q.collect_at_boarding) + "</span></div>";
    }
    return h;
  }

  function paint() {
    var issue = dateIssue(), consult = !canBook || !!issue || (!!quoteStatus && !quoteLoading);
    var link = consult ? consultLink(issue) : "";
    var notice = issue || (consult ? (quoteStatus || T_("tour.consult_note")) : (quoteLoading ? T_("tour.quote_loading") : ""));
    if (consult && !link) notice += " " + T_("wa.missing");
    widgets.forEach(function (box) {
      box.querySelectorAll("[data-type]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.type === st.kind); });
      box.querySelectorAll("[data-pay]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.pay === st.pay); });
      ["adults", "children", "seniors"].forEach(function (key) { box.querySelector('[data-out="' + key + '"]').textContent = st[key]; });
      box.querySelector('[data-k="buggy"]').checked = st.buggy;
      var dt = box.querySelector('[data-k="date"]');
      dt.min = minDate; dt.max = maxDate;
      if (dt.value !== st.date) dt.value = st.date;
      var cp = box.querySelector('[data-k="coupon"]');
      if (document.activeElement !== cp) cp.value = referral;
      var msg = box.querySelector("[data-coupon-msg]");
      msg.hidden = !referral || (canBook && !coupon);
      msg.textContent = referral ? T_("tour.referral", referral) : "";
      var totals = box.querySelector("[data-total]");
      totals.hidden = !quote;
      totals.innerHTML = quote ? quoteTotal(quote.data) : "";
      var status = box.querySelector("[data-quote-status]");
      status.hidden = !notice;
      if (status.textContent !== notice) status.textContent = notice;
      var reserve = box.querySelector("[data-reserve]");
      reserve.hidden = !canBook || consult;
      reserve.disabled = !quote || !!issue;
      box.querySelector("[data-quote-retry]").hidden = !canBook || !quoteStatus || !!issue;
      var contact = box.querySelector("[data-consult]");
      contact.hidden = !link;
      if (link) contact.href = link; else contact.removeAttribute("href");
    });
  }

  function showFormError(message) {
    checkoutError.textContent = message;
    checkoutError.hidden = false;
    checkoutError.focus();
  }

  function openModal(e) {
    if (!quote || dateIssue()) return;
    if (Date.now() - quote.at > 120000) return sync();
    modalQuote = quote;
    modalCaller = sheet.hidden ? e.currentTarget : sheetCaller;
    closeSheet(false);
    step1.hidden = false; step2.hidden = true;
    modalTitle.textContent = T_("tour.form_title");
    checkoutError.hidden = true;
    document.getElementById("sumLine").textContent = T_(st.pay === "pix" ? "tour.summary_line" : "tour.summary_line_card", tr("name"), fmtDate(st.date), D.brl(quote.data.total));
    modal.hidden = false;
    firstName.focus();
    track("tour_booking_start", { status: "form_opened" });
  }

  function closeModal() {
    if (submitting) return;
    modal.hidden = true;
    clearTimeout(holdTimer);
    document.getElementById("pixBox").textContent = "";
    if (modalCaller) modalCaller.focus();
  }

  function uuid() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    var bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var h = Array.from(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join("-");
  }

  function renderReceipt() {
    var q = receipt, expiry = Date.parse(q.reservation_expires_at);
    var pending = q.status === "pendente", active = pending && expiry > Date.now();
    var pix = q.pix_details;
    var showPix = canBook && active && q.pay_method === "pix" && q.payment_ready === true &&
      pix && typeof pix.key === "string" && !!pix.key.trim() && typeof pix.name === "string" && !!pix.name.trim() && Number(q.deposit) > 0;
    var expiryLabel = active ? new Intl.DateTimeFormat(I.es ? "es-AR" : "pt-BR", {
      timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    }).format(expiry) : "";
    document.getElementById("doneTxt").textContent = active ? T_("tour.pending_with_time", q.code, expiryLabel)
      : T_(pending && Number.isFinite(expiry) ? "tour.pending_expired" : "tour.pending_review", q.code);
    var pixBox = document.getElementById("pixBox");
    pixBox.hidden = !showPix && !active;
    pixBox.textContent = active && !showPix ? T_("tour.payment_support") : "";
    if (showPix) {
      pixBox.innerHTML = '<span class="label">' + esc(T_("tour.pix_dep", D.brl(q.deposit))) + '</span><span class="muted">' + esc(T_("tour.pix_rest", D.brl(q.collect_at_boarding))) + "</span><b>" + esc(pix.key) + '</b><span class="muted">' + esc(pix.name) + '</span><button class="btn btn-ghost" type="button" id="copyPix">' + T_("tour.pix_copy") + "</button>";
      document.getElementById("copyPix").addEventListener("click", function () {
        if (Date.now() >= expiry) return renderReceipt();
        if (navigator.clipboard) navigator.clipboard.writeText(pix.key).then(function () { U.toast(T_("tour.pix_copied")); }).catch(function () {});
      });
    }
    var wa = D.waLink(S.whatsapp, T_("tour.wa_booking_pending", q.code));
    var link = document.getElementById("sendWa");
    link.hidden = !wa;
    if (wa) link.href = wa; else link.removeAttribute("href");
    link.textContent = T_(showPix ? "tour.send_receipt" : "tour.payment_contact");
    clearTimeout(holdTimer);
    if (active) holdTimer = setTimeout(renderReceipt, Math.min(expiry - Date.now() + 20, 2147483647));
  }

  async function submitBooking(e) {
    e.preventDefault();
    if (submitting || !canBook || !modalQuote || step1.hidden) return;
    var name = firstName.value.trim(), phone = phoneInput.value.trim(), hotel = hotelInput.value.trim();
    var digits = phone.replace(/\D/g, "");
    if (name.length < 2 || digits.length < 10 || digits.length > 15) return showFormError(T_("tour.name_phone"));
    var selection = modalQuote.params, q = modalQuote.data;
    var payload = Object.assign({}, selection, {
      customer_name: name, phone: phone, hotel: hotel, lang: I.lang,
      source: attribution.source || "", attribution: attribution,
      expected_total: Number(q.total), expected_deposit: Number(q.deposit)
    });
    var signature = JSON.stringify(payload);
    var retry = requestAttempt && requestAttempt.signature === signature;
    if (!retry && (Date.now() - modalQuote.at > 120000 || dateIssue() || JSON.stringify(params()) !== JSON.stringify(selection))) {
      sync();
      return showFormError(T_("tour.quote_changed"));
    }
    if (!retry) requestAttempt = { signature: signature, id: uuid() };
    payload.request_id = requestAttempt.id;
    submitting = true;
    checkoutError.hidden = true;
    confirmButton.disabled = true;
    confirmButton.textContent = T_("tour.sending");
    var result = await runRpc(function () { return D.book(payload); });
    submitting = false;
    confirmButton.disabled = false;
    confirmButton.textContent = T_("tour.send");
    if (!result || result.demo || result.error || !result.data || !/^MT-\d+$/.test(result.data.code || "")) {
      var changed = result && result.error && /^A cotação mudou/i.test(result.error.message || "");
      if (changed) sync();
      track("tour_booking_result", { status: "unavailable" });
      return showFormError(changed ? T_("tour.quote_changed") : serverMessage(result, "tour.err_book"));
    }

    var matchesQuote = usableQuote(result.data, selection) && Number(result.data.total) === Number(q.total) && Number(result.data.deposit) === Number(q.deposit);
    receipt = Object.assign({}, result.data, { payment_ready: result.data.payment_ready === true && matchesQuote });
    step1.hidden = true; step2.hidden = false;
    modalTitle.textContent = T_("tour.request_received");
    renderReceipt();
    modalTitle.focus();
    track("tour_booking_result", { status: "pending" });
  }

  function openSheet(e) {
    if (window.matchMedia("(min-width: 901px)").matches) {
      widgets[0].scrollIntoView({ behavior: "smooth", block: "center" });
      widgets[0].querySelector('[data-k="date"]').focus({ preventScroll: true });
      return;
    }
    sheetCaller = e.currentTarget;
    sheet.hidden = false; overlay.hidden = false;
    document.getElementById("closeSheet").focus();
  }

  function closeSheet(restoreFocus) {
    sheet.hidden = true; overlay.hidden = true;
    if (restoreFocus && sheetCaller) sheetCaller.focus();
  }

  function dialogKeys(e) {
    var active = !modal.hidden ? modal : !sheet.hidden ? sheet : null;
    if (!active) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (active === modal) closeModal(); else closeSheet(true);
    }
    if (e.key !== "Tab") return;
    var list = Array.from(active.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]')).filter(function (el) {
      return !el.closest("[hidden]") && el.getClientRects().length;
    });
    if (!list.length) return;
    var last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === list[0] || !list.includes(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); list[0].focus();
    }
  }

  document.querySelectorAll("[data-open-book]").forEach(function (b) {
    b.disabled = false;
    b.textContent = T_(canBook ? "tour.booking_open" : "tour.consult_open");
    b.addEventListener("click", openSheet);
  });
  document.getElementById("sheetTitle").textContent = T_(canBook ? "tour.booking_title" : "tour.consult_title");
  document.querySelector('label[for="cPhone"]').textContent = T_("tour.phone_international");
  if (noHotel) document.getElementById("hotelLabel").textContent = T_("tour.wa_point");
  document.getElementById("closeSheet").addEventListener("click", function () { closeSheet(true); });
  overlay.addEventListener("click", function () { closeSheet(true); });
  document.querySelectorAll("[data-close-modal]").forEach(function (b) { b.addEventListener("click", closeModal); });
  document.getElementById("custForm").addEventListener("submit", submitBooking);
  document.addEventListener("keydown", dialogKeys);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    if (!modal.hidden && !step2.hidden && receipt) renderReceipt();
    if (modal.hidden) sync();
  });
  widgets.forEach(function (box, i) { mount(box, i ? "-s" : ""); });
  sync();
  if (referral && canBook) applyReferral(referral, false);
  track("tour_view", { mode: canBook ? "booking" : "consultation" });

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
