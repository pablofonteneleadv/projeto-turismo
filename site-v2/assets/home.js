(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc, I = window.I18N, t_ = I.t;
  var data = await D.load();
  var S = data.settings, T = data.tours;
  var cat = "todos", dest = "", pack = [], favs = {};
  try { favs = JSON.parse(localStorage.getItem("site-favs") || "{}") || {}; } catch (e) { favs = {}; }

  U.brand(S); U.chat(S);
  document.title = t_("home.title");
  var mdesc = document.querySelector('meta[name="description"]'); if (mdesc) mdesc.content = t_("home.desc");
  document.getElementById("heroPhoto").innerHTML = U.photo({ url: "fotos/hero-2.jpg", credit: t_("home.hero_credit") }, "hero", t_("home.hero_alt"), true);
  if (S.hero_eyebrow) document.getElementById("heroEyebrow").textContent = I.tx(S.hero_eyebrow);
  if (S.hero_title) document.getElementById("heroTitle").textContent = I.tx(S.hero_title);
  document.getElementById("promises").innerHTML = (S.hero_promises || []).map(function (p) { return "<li>" + esc(I.tx(p)) + "</li>"; }).join("");
  // Avaliações: só notas reais. Usa a nota do Google cadastrada no painel ou a média das avaliações publicadas (mínimo 3).
  var R = U.ratings(S, data.reviews), showRatings = !!R;
  if (R) {
    var hr = document.querySelector(".hero .rating"); hr.hidden = false;
    document.getElementById("ratingValue").textContent = R.value;
    document.getElementById("ratingCount").textContent = "· " + R.label;
  }
  if (!data.reviews.length) document.getElementById("reviewsSection").hidden = true;
  else document.getElementById("reviewsSummary").textContent = data.reviews.length >= 3 ? t_("home.rating_sum", U.ratings(null, data.reviews).value) : t_("home.rating_sum_few");
  document.getElementById("packPct").textContent = S.pack_discount_pct;
  var minPix = T.filter(function (t) { return !t.per_vehicle; }).reduce(function (m, t) { return Math.min(m, Number(t.price_pix)); }, Infinity);
  if (isFinite(minPix)) document.getElementById("fromPrice").textContent = D.brl(minPix);

  var coupon = await U.applyCouponFromUrl();
  if (coupon) { document.getElementById("couponBand").hidden = false; document.getElementById("couponTxt").textContent = t_("home.coupon", coupon.code, coupon.discount_pct, coupon.agent_name); }

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
  var dt = new Date(); dt.setDate(dt.getDate() + 1);
  var w = document.getElementById("when"); w.value = dt.toISOString().slice(0, 10); w.min = w.value;

  function link(t) { var u = U.tourUrl(t.slug); return u + (u.indexOf("?") < 0 ? "?" : "&") + "data=" + w.value; }

  function render() {
    f.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.cat === cat); });
    var list = T.filter(function (t) { return (cat === "todos" || t.category === cat) && (!dest || t.slug === dest); });
    var box = document.getElementById("cards"); box.innerHTML = "";
    if (!list.length) { box.innerHTML = '<div class="empty">' + esc(t_("home.empty_cat")) + "</div>"; return; }
    list.forEach(function (t) {
      var inPack = pack.indexOf(t.slug) > -1, fav = !!favs[t.slug];
      var el = document.createElement("article"); el.className = "card";
      el.innerHTML =
        '<div style="position:relative">' + U.photo((t.photos || [])[0], t.slug, U.alt(t, 0)) +
        '<div class="tags"><span class="tag">' + t_(t.category === "transfers" ? "card.door" : "card.pickup") + "</span>" + (t.featured ? '<span class="tag hot">' + t_("card.featured") + "</span>" : "") + "</div>" +
        '<button class="fav" type="button" aria-pressed="' + fav + '" aria-label="' + esc(t_("card.save", I.tr(t, "name"))) + '">' + (fav ? "♥" : "♡") + "</button></div>" +
        '<div class="body"><h3>' + esc(I.tr(t, "name")) + "</h3>" +
        '<div class="where"><span>📍 ' + esc(I.tr(t, "location")) + "</span>" + (function () { var tr = U.tourRating(t, data.reviews); return tr ? '<span><span class="stars" aria-hidden="true">★</span> ' + tr.value + ' <small class="muted">(' + tr.count + ")</small></span>" : ""; })() + "</div>" +
        '<div class="time">' + esc(I.tr(t, "times")) + "</div>" +
        '<div class="price"><div><small>' + t_(t.per_vehicle ? "card.from_vehicle" : "card.from_person") + '</small><b class="num">' + D.brl(t.price_card) + '</b></div><span class="pix num">' + t_("card.pix", D.brl(t.price_pix)) + "</span></div>" +
        '<div class="row"><a class="btn btn-mar" href="' + link(t) + '">' + t_("card.view") + '</a>' +
        '<button class="btn btn-ghost add" type="button" aria-pressed="' + inPack + '">' + t_(inPack ? "card.in_pack" : "card.add_pack") + "</button></div></div>";
      el.querySelector(".fav").addEventListener("click", function () { favs[t.slug] = !favs[t.slug]; try { localStorage.setItem("site-favs", JSON.stringify(favs)); } catch (e) {} U.toast(t_(favs[t.slug] ? "fav.on" : "fav.off")); render(); });
      el.querySelector(".add").addEventListener("click", function () { var i = pack.indexOf(t.slug); if (i > -1) pack.splice(i, 1); else pack.push(t.slug); render(); paintPack(); });
      box.appendChild(el);
    });
    var name = t_("cat." + cat);
    document.getElementById("listTitle").textContent = dest ? t_("home.your_tour") : (cat === "todos" ? t_("home.pick_day") : name);
  }

  function paintPack() {
    var bar = document.getElementById("packbar");
    if (!pack.length) { bar.hidden = true; document.body.classList.remove("has-bar"); return; }
    var items = pack.map(function (s) { return T.filter(function (t) { return t.slug === s; })[0]; });
    var sum = items.reduce(function (a, t) { return a + Number(t.price_pix); }, 0);
    var off = pack.length >= 2 ? S.pack_discount_pct / 100 : 0, cup = coupon ? coupon.discount_pct / 100 : 0;
    document.getElementById("packCount").textContent = t_(pack.length === 1 ? "pack.one" : "pack.many", pack.length);
    document.getElementById("packSave").textContent = pack.length >= 2 ? t_("pack.save", S.pack_discount_pct) + (coupon ? t_("pack.save_cup", coupon.discount_pct, coupon.code) : "") : t_("pack.add_more", S.pack_discount_pct);
    document.getElementById("packTotal").textContent = D.brl(sum * (1 - off - cup));
    var msg = t_("pack.wa", items.map(function (t) { return I.tr(t, "name"); }).join(", "), coupon ? t_("pack.wa_coupon", coupon.code) : "");
    var go = document.getElementById("packGo"); var l = D.waLink(S.whatsapp, msg);
    go.href = l || "#"; go.target = l ? "_blank" : ""; go.onclick = l ? null : function (e) { e.preventDefault(); U.toast(t_("wa.missing")); };
    bar.hidden = false; document.body.classList.add("has-bar");
  }

  document.getElementById("search").addEventListener("submit", function (e) { e.preventDefault(); dest = sel.value; cat = "todos"; render(); document.getElementById("passeios").scrollIntoView(); });
  function goPack() { cat = "todos"; dest = ""; sel.value = ""; render(); document.getElementById("passeios").scrollIntoView(); U.toast(t_("pack.hint")); }
  document.getElementById("packOpen").addEventListener("click", goPack);
  document.getElementById("packCta").addEventListener("click", goPack);

  document.getElementById("reviews").innerHTML = data.reviews.map(U.review).join("");
  document.getElementById("faqs").innerHTML = data.faqs.map(function (q) { return "<details><summary>" + esc(I.tx(q.question)) + "</summary><p>" + esc(I.tx(q.answer)) + "</p></details>"; }).join("");

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
})();
