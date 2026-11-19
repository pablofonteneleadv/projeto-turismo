(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc, I = window.I18N, t_ = I.t;
  function copy(pt, es) { return I.es ? es : pt; }
  var text = {
    browse: copy("Ver passeios", "Ver paseos"),
    couponHelp: copy("Confira a aplicação do cupom na sua consulta ou pedido.", "Consultá la aplicación del cupón en tu solicitud."),
    heroCredit: copy("Foto: MTur Destinos · Domínio público", "Foto: MTur Destinos · Dominio público"),
    heroTitle: copy("Passeios de Fortaleza para Jericoacoara, Cumbuco e o Litoral Leste", "Paseos desde Fortaleza a Jericoacoara, Cumbuco y el Litoral Este"),
    heroDescription: copy("Veja o roteiro, o que está incluso e como consultar sua data.", "Mirá el itinerario, qué incluye y cómo consultar tu fecha."),
    origin: copy("Saídas de Fortaleza", "Salidas desde Fortaleza"),
    destination: copy("Destino", "Destino"),
    allDestinations: copy("Todos os destinos", "Todos los destinos"),
    type: copy("Tipo de oferta", "Tipo de actividad"),
    dateLabel: copy("Data do passeio (opcional)", "Fecha del paseo (opcional)"),
    catalogTitle: copy("Passeios e transfers", "Paseos y traslados"),
    otherDestinations: copy("Outros destinos", "Otros destinos"),
    clearFilters: copy("Limpar filtros", "Limpiar filtros"),
    emptyFilters: copy("Nenhuma opção com esses filtros. Tente outro destino, tipo ou data.", "No hay opciones con esos filtros. Probá con otro destino, tipo o fecha."),
    loading: copy("Carregando passeios…", "Cargando paseos…"),
    stepsTitle: copy("Da escolha ao embarque", "De la elección al embarque"),
    stepsDate: copy("Informe a data e o grupo", "Indicá la fecha y el grupo"),
    stepsDateBody: copy("Confira a disponibilidade, o valor e a forma de pagamento do passeio escolhido.", "Consultá la disponibilidad, el precio y la forma de pago del paseo elegido."),
    stepsPickup: copy("Combine o embarque", "Coordiná el embarque"),
    stepsPickupBody: copy("Confirme o horário e o local de saída antes da viagem.", "Confirmá el horario y el punto de salida antes del viaje."),
    packageDescription: copy("Selecione os passeios que quer combinar e consulte as datas e o valor do roteiro.", "Elegí los paseos que querés combinar y consultá las fechas y el precio del itinerario."),
    packageConsult: copy("Consultar pacote", "Consultar paquete"),
    packageDate: copy("Data desejada (opcional)", "Fecha deseada (opcional)"),
    packagePeople: copy("Viajantes", "Viajeros"),
    packagePickup: copy("Bairro do embarque (opcional)", "Barrio de embarque (opcional)"),
    packageNote: copy("A equipe confirma as datas e o valor do roteiro pelo WhatsApp.", "El equipo confirma las fechas y el precio del itinerario por WhatsApp."),
    packageWhatsApp: copy("Abrir WhatsApp", "Abrir WhatsApp"),
    packageBack: copy("Voltar aos passeios", "Volver a los paseos"),
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
    departure: copy("Data consultada: ", "Fecha consultada: "),
    packageTerms: copy("Datas e valor a combinar", "Fechas y precio a coordinar"),
    reserveFaq: copy("Escolha o passeio e informe a data. Confira a disponibilidade e as condições de pagamento da oferta. Quando a reserva é sob consulta, confirme os detalhes com a equipe pelo WhatsApp.", "Elegí el paseo e indicá la fecha. Consultá la disponibilidad y las condiciones de pago de la oferta. Cuando sea a consultar, confirmá los detalles con el equipo por WhatsApp.")
  };
  document.querySelectorAll("[data-home-text]").forEach(function (el) { el.textContent = text[el.dataset.homeText]; });
  var data = await D.load({ deferExtras: true });
  var S = data.settings, T = data.tours;
  var cat = "todos", dest = "", pack = [], favs = {}, coupon = null;
  var incoming = new URLSearchParams(location.search);
  var details = new Map(T.map(function (tour) { return [tour.slug, window.MareCatalog.describe(tour, I)]; }));
  var destinations = new Map();
  details.forEach(function (route) {
    route.places.forEach(function (label, id) { destinations.set(id, label); });
  });
  var orderedDestinations = Array.from(destinations.entries()).sort(function (a, b) {
    return a[1].localeCompare(b[1], I.es ? "es" : "pt-BR");
  });
  var categories = D.CATS.map(function (entry) { return entry[0]; }).filter(function (id) {
    return id === "todos" || T.some(function (tour) { return details.get(tour.slug).category === id; });
  });
  if (destinations.has(incoming.get("destino"))) dest = incoming.get("destino");
  if (categories.indexOf(incoming.get("tipo")) > -1) cat = incoming.get("tipo");
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
  document.getElementById("catalogToolbar").hidden = T.length === 0;
  categories.forEach(function (id) {
    var b = document.createElement("button"); b.type = "button"; b.dataset.cat = id;
    b.innerHTML = esc(t_("cat." + id)) + ' <span class="num"></span>';
    b.addEventListener("click", function () { cat = id; changeFilters(); });
    f.appendChild(b);
  });
  var sel = document.getElementById("dest"), catalogDest = document.getElementById("catalogDest");
  [sel, catalogDest].forEach(function (select) {
    select.options[0].textContent = text.allDestinations;
    orderedDestinations.forEach(function (entry) { select.add(new Option(entry[1], entry[0])); });
    select.value = dest;
    select.addEventListener("change", function () {
      dest = select.value;
      if (cat !== "todos" && !matchingOffers().some(function (tour) { return details.get(tour.slug).category === cat; })) cat = "todos";
      changeFilters();
    });
  });
  var w = document.getElementById("when");
  var fortalezaToday = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  w.min = fortalezaToday;
  var initialDate = incoming.get("data");
  if (initialDate && initialDate >= w.min) w.value = initialDate;
  var packDialog = document.getElementById("packDialog"), packForm = document.getElementById("packDetails");
  var packDate = document.getElementById("packDate"), packPeople = document.getElementById("packPeople"), packPickup = document.getElementById("packPickup");
  var packGo = document.getElementById("packGo"), packCode = "";
  packDate.min = fortalezaToday;
  var catalogStatus = document.getElementById("catalogStatus"), box = document.getElementById("cards");
  var cardRatings = new Map();
  var priceUnit = function (t) { return t_(t.per_vehicle ? "card.from_vehicle" : "card.from_person"); };
  function booking(t) { return data.live && t.sales_mode === "booking" && Number(t.capacity_per_day) > 0 && (t.departure_weekdays || []).length > 0; }
  function leaves(t, weekday) {
    return !weekday || !Array.isArray(t.departure_weekdays) || !t.departure_weekdays.length || t.departure_weekdays.map(Number).indexOf(weekday) !== -1;
  }
  function matchingOffers() {
    var weekday = w.value ? new Date(w.value + "T12:00:00Z").getUTCDay() || 7 : 0;
    return T.filter(function (t) { return (!dest || details.get(t.slug).places.has(dest)) && leaves(t, weekday); });
  }
  function changeFilters() {
    var url = new URL(location.href);
    [["destino", dest], ["tipo", cat === "todos" ? "" : cat], ["data", w.value]].forEach(function (entry) {
      if (entry[1]) url.searchParams.set(entry[0], entry[1]);
      else url.searchParams.delete(entry[0]);
    });
    history.replaceState(history.state, "", url);
    sel.value = catalogDest.value = dest;
    render();
  }
  function dateLabel(value) {
    return value ? new Intl.DateTimeFormat(I.es ? "es-AR" : "pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(value + "T12:00:00Z")) : "";
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
    var matches = matchingOffers();
    var counts = new Map();
    matches.forEach(function (tour) {
      var category = details.get(tour.slug).category;
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    f.querySelectorAll("button").forEach(function (b) {
      var id = b.dataset.cat, count = id === "todos" ? matches.length : counts.get(id) || 0;
      b.setAttribute("aria-pressed", id === cat);
      b.querySelector(".num").textContent = count;
      b.disabled = count === 0 && id !== cat && id !== "todos";
    });
    var list = cat === "todos" ? matches : matches.filter(function (tour) { return details.get(tour.slug).category === cat; });
    var countLabel = list.length + (list.length === 1 ? copy(" opção", " opción") : copy(" opções", " opciones"));
    var currentDate = dateLabel(w.value);
    catalogStatus.textContent = [T.length ? countLabel : "", currentDate ? text.departure + currentDate : "", data.live ? "" : text.offline].filter(Boolean).join(" · ");
    catalogStatus.hidden = !catalogStatus.textContent;
    document.getElementById("listTitle").textContent = destinations.get(dest) || text.catalogTitle;
    cardRatings.clear();
    box.innerHTML = "";
    box.setAttribute("aria-busy", "false");
    if (!list.length) {
      var filtered = T.length && (dest || cat !== "todos" || w.value);
      box.innerHTML = '<div class="empty"><p>' + esc(filtered ? text.emptyFilters : t_("home.empty_cat")) + '</p>' +
        (filtered ? '<button class="btn btn-ghost" type="button">' + esc(text.clearFilters) + '</button>' : '') + '</div>';
      if (filtered) box.querySelector("button").addEventListener("click", clearFilters);
      return;
    }
    var groups = new Map();
    list.forEach(function (tour) {
      var route = details.get(tour.slug), id = dest ? route.category : route.groupId;
      if (!groups.has(id)) groups.set(id, {
        title: dest ? t_("cat." + route.category) : route.group || text.otherDestinations,
        tours: []
      });
      groups.get(id).tours.push(tour);
    });
    var groupKeys = dest ? categories.filter(function (id) { return groups.has(id); }) : Array.from(groups.keys());
    groupKeys.forEach(function (id) {
      var group = groups.get(id), section = document.createElement("section");
      section.className = "catalog-group";
      var heading = document.createElement("h3");
      heading.className = "catalog-group-title";
      heading.textContent = group.title;
      var grid = document.createElement("div");
      grid.className = "cards";
      group.tours.forEach(function (tour) { grid.appendChild(renderCard(tour)); });
      section.append(heading, grid);
      box.appendChild(section);
    });
  }

  function renderCard(t) {
    var route = details.get(t.slug), displayName = route.name;
    var inPack = pack.indexOf(t.slug) > -1, fav = !!favs[t.slug];
    var href = esc(link(t)), name = esc(displayName);
    var visit = route.stops.join(" · ");
    var location = visit && visit !== displayName ? visit : I.tr(t, "location");
    var typeBadge = route.category === "transfers" ? copy("Transfer", "Traslado") :
      route.category === "pacotes" ? copy("Pacote", "Paquete") : copy("Passeio", "Paseo");
    var book = booking(t);
    var pricing = data.live && Number(t.price_pix) > 0
      ? '<div><small>' + esc(book ? priceUnit(t) : text.reference + (t.per_vehicle ? copy(" · por veículo", " · por vehículo") : copy(" · por pessoa", " · por persona"))) + '</small><b class="num">' + esc(D.brl(t.price_pix)) + "</b></div>"
      : '<span class="muted">' + esc(text.checkPrices) + "</span>";
    var cardPay = book && Number(t.price_card) > 0 ? '<span class="pix num">' + esc(D.brl(t.price_card)) + " " + copy("no cartão", "con tarjeta") + "</span>" : "";
    var el = document.createElement("article"); el.className = "card";
    el.innerHTML =
      '<div class="card-media"><a class="card-photo-link" href="' + href + '" aria-label="' + name + '">' + U.photo((t.photos || [])[0], t.slug, U.alt(t, 0)) + '</a>' +
      '<div class="tags"><span class="tag">' + esc(typeBadge) + "</span>" + (t.featured ? '<span class="tag hot">' + t_("card.featured") + "</span>" : "") + "</div>" +
      '<button class="fav" type="button" aria-pressed="' + fav + '" aria-label="' + esc(t_("card.save", displayName)) + '">' + (fav ? "♥" : "♡") + "</button></div>" +
      '<div class="body"><a class="card-text-link" href="' + href + '"><h4 class="card-name">' + name + '</h4>' +
      '<div class="where">' + (location && location !== displayName ? '<span class="card-route">' + esc(location) + '</span>' : '') + '<span class="tour-rating" hidden></span></div>' +
      '<div class="time">' + esc(I.tr(t, "times")) + '</div>' +
      '<span class="offer-mode">' + esc(book ? text.booking : text.consultation) + "</span>" +
      '<div class="price">' + pricing + cardPay + '</div></a>' +
      '<div class="row"><a class="btn btn-mar tour-link" href="' + href + '">' + esc(book ? t_("card.view") : text.consult) + '</a>' +
      '<button class="btn btn-ghost add" type="button" aria-pressed="' + inPack + '">' + t_(inPack ? "card.in_pack" : "card.add_pack") + "</button></div></div>";
    el.querySelector(".fav").addEventListener("click", function () { favs[t.slug] = !favs[t.slug]; try { localStorage.setItem("site-favs", JSON.stringify(favs)); } catch (e) {} U.toast(t_(favs[t.slug] ? "fav.on" : "fav.off")); render(); });
    el.querySelector(".add").addEventListener("click", function () { var i = pack.indexOf(t.slug); if (i > -1) pack.splice(i, 1); else pack.push(t.slug); render(); paintPack(); });
    var rating = el.querySelector(".tour-rating");
    cardRatings.set(t, rating);
    paintCardRating(rating, t);
    return el;
  }

  function clearFilters() {
    cat = "todos";
    dest = w.value = packDate.value = "";
    changeFilters();
    paintPack();
    catalogDest.focus({ preventScroll: true });
  }

  function paintPack() {
    var bar = document.getElementById("packbar");
    if (!pack.length) { bar.hidden = true; document.body.classList.remove("has-bar"); return; }
    document.getElementById("packCount").textContent = pack.length + (pack.length === 1 ? copy(" passeio", " paseo") : copy(" passeios", " paseos"));
    document.getElementById("packSave").textContent = text.packageTerms;
    if (packDialog.open) paintPackLink();
    bar.hidden = false; document.body.classList.add("has-bar");
  }

  function packageNames() {
    return pack.map(function (slug) { return details.get(slug).name; });
  }

  function paintPackLink() {
    var lines = [copy("Olá! Quero consultar datas e valor para este pacote:", "¡Hola! Quiero consultar fechas y precio para este paquete:")]
      .concat(packageNames().map(function (name) { return "• " + name; }));
    if (packDate.value) lines.push(copy("Data de referência: ", "Fecha de referencia: ") + dateLabel(packDate.value));
    lines.push(text.packagePeople + ": " + packPeople.value);
    var pickup = packPickup.value.trim();
    if (pickup) lines.push(copy("Bairro do embarque: ", "Barrio de embarque: ") + pickup);
    if (coupon) lines.push(copy("Cupom: ", "Cupón: ") + coupon.code);
    lines.push(copy("Referência: ", "Referencia: ") + packCode);
    var origin = typeof U.attributionRef === "function" ? U.attributionRef() : "";
    if (origin) lines.push(copy("Origem: ", "Origen: ") + origin);
    packGo.href = D.waLink(S.whatsapp, lines.join("\n")) || "#";
  }

  document.getElementById("packReview").addEventListener("click", function () {
    if (!packCode) packCode = "MT-P-" + Array.from(crypto.getRandomValues(new Uint8Array(5)), function (b) { return b.toString(16).padStart(2, "0"); }).join("").toUpperCase();
    document.getElementById("packItems").innerHTML = packageNames().map(function (name) { return "<li>" + esc(name) + "</li>"; }).join("");
    if (!packDate.value) packDate.value = w.value;
    paintPackLink();
    packDialog.showModal();
  });
  document.getElementById("packBack").addEventListener("click", function () { packDialog.close(); });
  packForm.addEventListener("input", paintPackLink);
  packForm.addEventListener("submit", function (e) { e.preventDefault(); packGo.click(); });
  packGo.addEventListener("click", function (e) {
    if (!packForm.reportValidity() || packGo.getAttribute("href") === "#") {
      e.preventDefault();
      if (packGo.getAttribute("href") === "#") U.toast(t_("wa.missing"));
    }
  });
  document.getElementById("search").addEventListener("submit", function (e) { e.preventDefault(); changeFilters(); document.getElementById("passeios").scrollIntoView(); });
  w.addEventListener("change", function () { packDate.value = w.value; changeFilters(); paintPack(); });
  function goPack() { cat = "todos"; dest = ""; changeFilters(); document.getElementById("passeios").scrollIntoView(); U.toast(t_("pack.hint")); }
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
