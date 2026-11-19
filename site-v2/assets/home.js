(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc, I = window.I18N, t_ = I.t;
  function copy(pt, es) { return I.es ? es : pt; }
  var text = {
    browse: copy("Ver passeios", "Ver paseos"),
    couponHelp: copy("Confira a aplicação do cupom na sua consulta ou pedido.", "Consultá la aplicación del cupón en tu solicitud."),
    heroCredit: copy("Foto: MTur Destinos · Domínio público", "Foto: MTur Destinos · Dominio público"),
    heroTitle: copy("Passeios de Fortaleza para Jericoacoara, Cumbuco e o Litoral Leste", "Paseos desde Fortaleza a Jericoacoara, Cumbuco y el Litoral Este"),
    heroDescription: copy("Veja o roteiro, o que está incluso e como consultar sua data.", "Mirá el itinerario, qué incluye y cómo consultar tu fecha."),
    loading: copy("Carregando passeios…", "Cargando paseos…"),
    stepsTitle: copy("Da escolha ao embarque", "De la elección al embarque"),
    stepsDate: copy("Informe a data e o grupo", "Indicá la fecha y el grupo"),
    stepsDateBody: copy("Confira a disponibilidade, o valor e a forma de pagamento do passeio escolhido.", "Consultá la disponibilidad, el precio y la forma de pago del paseo elegido."),
    stepsPickup: copy("Combine o embarque", "Coordiná el embarque"),
    stepsPickupBody: copy("Confirme o horário e o local de saída antes da viagem.", "Confirmá el horario y el punto de salida antes del viaje."),
    packageDescription: copy("Selecione os passeios que quer combinar e consulte as datas e o valor do roteiro.", "Elegí los paseos que querés combinar y consultá las fechas y el precio del itinerario."),
    packageConsult: copy("Consultar pacote", "Consultar paquete"),
    termsTitle: copy("Condições por passeio", "Condiciones de cada paseo"),
    termsBody: copy("Confira o preço e as condições do seu roteiro antes de pagar.", "Consultá el precio y las condiciones de tu itinerario antes de pagar."),
    pickupTitle: copy("Embarque combinado", "Embarque a coordinar"),
    pickupBody: copy("Confira onde o passeio começa e combine a busca para o seu roteiro.", "Consultá dónde empieza el paseo y coordiná la búsqueda para tu itinerario."),
    consultation: copy("Sob consulta", "A consultar"),
    booking: copy("Pedido pelo site", "Solicitud por el sitio"),
    consult: copy("Ver detalhes e consultar", "Ver detalles y consultar"),
    reference: copy("Valor de referência", "Precio de referencia"),
    checkPrices: copy("Consulte datas e valores", "Consultá fechas y precios"),
    offline: copy("Catálogo de consulta. Confirme o roteiro e os valores com a equipe.", "Catálogo de consulta. Confirmá el itinerario y los precios con el equipo."),
    dateEmpty: copy("Nenhum passeio com saída prevista nessa data. Escolha outra data.", "No hay paseos con salida prevista en esa fecha. Elegí otra fecha."),
    departure: copy("Data consultada: ", "Fecha consultada: "),
    packageTerms: copy("Datas e valor a combinar", "Fechas y precio a coordinar"),
    reserveFaq: copy("Escolha o passeio e informe a data. Confira a disponibilidade e as condições de pagamento da oferta. Quando a reserva é sob consulta, confirme os detalhes com a equipe pelo WhatsApp.", "Elegí el paseo e indicá la fecha. Consultá la disponibilidad y las condiciones de pago de la oferta. Cuando sea a consultar, confirmá los detalles con el equipo por WhatsApp.")
  };
  document.querySelectorAll("[data-home-text]").forEach(function (el) { el.textContent = text[el.dataset.homeText]; });
  var data = await D.load({ deferExtras: true });
  var S = data.settings, T = data.tours;
  var cat = "todos", dest = "", pack = [], favs = {}, coupon = null;
  var incoming = new URLSearchParams(location.search);
  try { favs = JSON.parse(localStorage.getItem("site-favs") || "{}") || {}; } catch (e) { favs = {}; }

  U.brand(S); U.chat(S);
  document.title = t_("home.title");
  var mdesc = document.querySelector('meta[name="description"]');
  if (mdesc && I.es) mdesc.content = "Paseos desde Fortaleza a Jericoacoara, Cumbuco, las 3 Playas del Litoral Este y otros destinos. Consultá fechas, itinerarios y puntos de embarque.";
  if (S.hero_eyebrow) document.getElementById("heroEyebrow").textContent = I.tx(S.hero_eyebrow);
  var legacyTitle = "Jericoacoara, Cumbuco e Canoa Quebrada saindo do seu hotel em Fortaleza";
  if (S.hero_title && S.hero_title !== legacyTitle) document.getElementById("heroTitle").textContent = I.tx(S.hero_title);
  var promises = Array.isArray(S.hero_promises) ? S.hero_promises : [];
  document.getElementById("promises").innerHTML = promises.filter(function (p) {
    return !/reserve com|sinal|restante no embarque|pix|cartão|pague/i.test(p);
  }).map(function (p) { return "<li>" + esc(I.tx(p)) + "</li>"; }).join("");
  var f = document.getElementById("filters");
  D.CATS.forEach(function (k) {
    var count = k[0] === "todos" ? T.length : T.filter(function (t) { return t.category === k[0]; }).length;
    if (!count) return;
    var b = document.createElement("button"); b.type = "button"; b.dataset.cat = k[0];
    b.innerHTML = esc(t_("cat." + k[0])) + ' <span class="num">' + count + "</span>";
    b.addEventListener("click", function () { cat = k[0]; dest = ""; sel.value = ""; render(); });
    f.appendChild(b);
  });
  var sel = document.getElementById("dest");
  T.forEach(function (t) { var o = document.createElement("option"); o.value = t.slug; o.textContent = I.tr(t, "name"); sel.appendChild(o); });
  var w = document.getElementById("when");
  var fortalezaToday = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  w.min = fortalezaToday;
  var catalogStatus = document.getElementById("catalogStatus"), box = document.getElementById("cards");
  var cardRatings = new Map();
  var priceUnit = function (t) { return t_(t.per_vehicle ? "card.from_vehicle" : "card.from_person"); };
  function booking(t) { return data.live && t.sales_mode === "booking" && Number(t.capacity_per_day) > 0 && (t.departure_weekdays || []).length > 0; }
  function leaves(t, weekday) {
    return !weekday || !Array.isArray(t.departure_weekdays) || !t.departure_weekdays.length || t.departure_weekdays.map(Number).indexOf(weekday) !== -1;
  }
  function dateLabel() {
    return w.value ? new Intl.DateTimeFormat(I.es ? "es-AR" : "pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(w.value + "T12:00:00Z")) : "";
  }
  function link(t) {
    var parts = U.tourUrl(t.slug).split("?");
    var query = new URLSearchParams(parts[1] || "");
    if (w.value) query.set("data", w.value);
    if (I.es) query.set("lang", "es");
    var attr = typeof U.attribution === "function" ? U.attribution() : {};
    ["source", "medium", "campaign", "content", "term"].forEach(function (k) {
      var value = attr[k];
      if (value && value !== "direct") query.set("utm_" + k, value);
    });
    var code = coupon ? coupon.code : incoming.get("cupom");
    if (code && /^[a-z0-9_-]{1,32}$/i.test(code)) query.set("cupom", code);
    var qs = query.toString();
    return parts[0] + (qs ? "?" + qs : "");
  }

  function paintCardRating(target, tour) {
    var rating = U.tourRating(tour, data.reviews);
    target.hidden = !rating;
    target.innerHTML = rating ? '<span class="stars" aria-hidden="true">★</span> ' + rating.value + ' <small class="muted">(' + rating.count + ")</small>" : "";
  }

  function render() {
    f.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.cat === cat); });
    var weekday = w.value ? new Date(w.value + "T12:00:00Z").getUTCDay() || 7 : 0;
    var list = T.filter(function (t) { return (cat === "todos" || t.category === cat) && (!dest || t.slug === dest) && leaves(t, weekday); });
    var currentDate = dateLabel();
    catalogStatus.textContent = [currentDate ? text.departure + currentDate : "", data.live ? "" : text.offline].filter(Boolean).join(" · ");
    catalogStatus.hidden = !catalogStatus.textContent;
    document.getElementById("listTitle").textContent = dest ? t_("home.your_tour") : (cat === "todos" ? t_("home.pick_day") : t_("cat." + cat));
    cardRatings.clear();
    box.innerHTML = "";
    box.setAttribute("aria-busy", "false");
    if (!list.length) { box.innerHTML = '<div class="empty">' + esc(weekday && T.length ? text.dateEmpty : t_("home.empty_cat")) + "</div>"; return; }
    list.forEach(function (t) {
      var inPack = pack.indexOf(t.slug) > -1, fav = !!favs[t.slug];
      var book = booking(t);
      var pricing = data.live && Number(t.price_pix) > 0
        ? '<div><small>' + esc(book ? priceUnit(t) : text.reference + (t.per_vehicle ? copy(" · por veículo", " · por vehículo") : copy(" · por pessoa", " · por persona"))) + '</small><b class="num">' + esc(D.brl(t.price_pix)) + "</b></div>"
        : '<span class="muted">' + esc(text.checkPrices) + "</span>";
      var cardPay = book && Number(t.price_card) > 0 ? '<span class="pix num">' + esc(D.brl(t.price_card)) + " " + copy("no cartão", "con tarjeta") + "</span>" : "";
      var el = document.createElement("article"); el.className = "card";
      el.innerHTML =
        '<div style="position:relative">' + U.photo((t.photos || [])[0], t.slug, U.alt(t, 0)) +
        '<div class="tags"><span class="tag">' + (t.category === "transfers" ? copy("Transfer", "Traslado") : copy("Saindo de Fortaleza", "Desde Fortaleza")) + "</span>" + (t.featured ? '<span class="tag hot">' + t_("card.featured") + "</span>" : "") + "</div>" +
        '<button class="fav" type="button" aria-pressed="' + fav + '" aria-label="' + esc(t_("card.save", I.tr(t, "name"))) + '">' + (fav ? "♥" : "♡") + "</button></div>" +
        '<div class="body"><h3>' + esc(I.tr(t, "name")) + "</h3>" +
        '<div class="where"><span>📍 ' + esc(I.tr(t, "location")) + '</span><span class="tour-rating" hidden></span></div>' +
        '<div class="time">' + esc(I.tr(t, "times")) + "</div>" +
        '<span class="offer-mode">' + esc(book ? text.booking : text.consultation) + "</span>" +
        '<div class="price">' + pricing + cardPay + "</div>" +
        '<div class="row"><a class="btn btn-mar tour-link" href="' + esc(link(t)) + '">' + esc(book ? t_("card.view") : text.consult) + '</a>' +
        '<button class="btn btn-ghost add" type="button" aria-pressed="' + inPack + '">' + t_(inPack ? "card.in_pack" : "card.add_pack") + "</button></div></div>";
      el.querySelector(".fav").addEventListener("click", function () { favs[t.slug] = !favs[t.slug]; try { localStorage.setItem("site-favs", JSON.stringify(favs)); } catch (e) {} U.toast(t_(favs[t.slug] ? "fav.on" : "fav.off")); render(); });
      el.querySelector(".add").addEventListener("click", function () { var i = pack.indexOf(t.slug); if (i > -1) pack.splice(i, 1); else pack.push(t.slug); render(); paintPack(); });
      var rating = el.querySelector(".tour-rating");
      cardRatings.set(t, rating);
      paintCardRating(rating, t);
      box.appendChild(el);
    });
  }

  function paintPack() {
    var bar = document.getElementById("packbar");
    if (!pack.length) { bar.hidden = true; document.body.classList.remove("has-bar"); return; }
    var items = pack.map(function (s) { return T.find(function (t) { return t.slug === s; }); });
    document.getElementById("packCount").textContent = pack.length + (pack.length === 1 ? copy(" passeio", " paseo") : copy(" passeios", " paseos"));
    document.getElementById("packSave").textContent = text.packageTerms;
    var msg = copy("Olá! Quero consultar datas e valor para este pacote:", "¡Hola! Quiero consultar fechas y precio para este paquete:") + "\n" +
      items.map(function (t) { return "• " + I.tr(t, "name"); }).join("\n");
    if (w.value) msg += "\n" + copy("Data de referência: ", "Fecha de referencia: ") + dateLabel();
    if (coupon) msg += "\n" + copy("Cupom: ", "Cupón: ") + coupon.code;
    var ref = typeof U.attributionRef === "function" ? U.attributionRef() : "";
    if (ref) msg += "\n" + copy("Referência: ", "Referencia: ") + ref;
    var go = document.getElementById("packGo"); var l = D.waLink(S.whatsapp, msg);
    go.href = l || "#"; go.target = l ? "_blank" : ""; go.onclick = l ? null : function (e) { e.preventDefault(); U.toast(t_("wa.missing")); };
    bar.hidden = false; document.body.classList.add("has-bar");
  }

  document.getElementById("search").addEventListener("submit", function (e) { e.preventDefault(); dest = sel.value; cat = "todos"; render(); document.getElementById("passeios").scrollIntoView(); });
  w.addEventListener("change", function () { render(); paintPack(); });
  function goPack() { cat = "todos"; dest = ""; sel.value = ""; render(); document.getElementById("passeios").scrollIntoView(); U.toast(t_("pack.hint")); }
  document.getElementById("packOpen").addEventListener("click", goPack);
  document.getElementById("packCta").addEventListener("click", goPack);

  function paintExtras() {
    var rating = U.ratings(S, data.reviews);
    var heroRating = document.querySelector(".hero .rating");
    heroRating.hidden = !rating;
    if (rating) {
      document.getElementById("ratingValue").textContent = rating.value;
      document.getElementById("ratingCount").textContent = "· " + rating.label;
    }
    var hasReviews = data.reviews.length > 0;
    document.getElementById("reviewsSection").hidden = !hasReviews;
    if (hasReviews) {
      var average = U.ratings(null, data.reviews);
      document.getElementById("reviewsSummary").textContent = average ? t_("home.rating_sum", average.value) : t_("home.rating_sum_few");
    }
    document.getElementById("reviews").innerHTML = data.reviews.map(U.review).join("");
    document.getElementById("faqs").innerHTML = data.faqs.map(function (q) {
      var answer = q.question === "Como funciona a reserva?" ? text.reserveFaq : I.tx(q.answer);
      return "<details><summary>" + esc(I.tx(q.question)) + "</summary><p>" + esc(answer) + "</p></details>";
    }).join("");
  }

  function phoneOk(v) { return v.replace(/\D/g, "").length >= 10; }
  document.getElementById("newsForm").addEventListener("submit", async function (e) {
    e.preventDefault(); var v = document.getElementById("newsPhone").value.trim();
    if (!phoneOk(v)) return U.toast(t_("form.phone_bad"));
    var r = await D.insert("leads", { phone: v, source: "promocoes" });
    if (r.error) return U.toast(t_("form.news_fail"));
    e.target.reset(); U.toast(r.demo ? t_("toast.demo") : t_("form.news_ok"));
  });
  document.getElementById("partnerForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var row = { name: document.getElementById("pName").value.trim(), phone: document.getElementById("pPhone").value.trim(), role: document.getElementById("pRole").value };
    if (row.name.length < 2 || !phoneOk(row.phone)) return U.toast(t_("form.partner_bad"));
    var r = await D.insert("partner_requests", row);
    if (r.error) return U.toast(t_("form.partner_fail"));
    e.target.reset(); U.toast(r.demo ? t_("toast.demo") : t_("form.partner_ok"));
  });

  render();
  paintExtras();
  if (data.extras) data.extras.then(function (extras) {
    data.reviews = extras.reviews;
    data.faqs = extras.faqs;
    paintExtras();
    cardRatings.forEach(paintCardRating);
  });
  U.applyCouponFromUrl().then(function (result) {
    if (!result) return;
    coupon = result;
    document.getElementById("couponBand").hidden = false;
    document.getElementById("couponTxt").textContent = t_("home.coupon", coupon.code, coupon.discount_pct, coupon.agent_name);
    render();
    paintPack();
  }).catch(function () {});
})();
