(async function () {
  var D = window.SiteData, U = window.UI, esc = D.esc, app = document.getElementById("app");
  var sb = D.client();
  if (!sb) { app.innerHTML = '<div class="login"><h2>Painel</h2><p class="warn">O banco de dados ainda não foi ligado ao site. Assim que ele for criado, o painel funciona aqui.</p></div>'; return; }

  var STATUS = ["pendente", "pago", "confirmado", "realizado", "cancelado"];
  var STATUS_TXT = { pendente: "Pendente", pago: "Pago", confirmado: "Confirmado", realizado: "Realizado", cancelado: "Cancelado" };
  var tab = "inicio", cache = {};

  async function session() { var r = await sb.auth.getSession(); return r.data.session; }
  async function isAdmin() { var r = await sb.rpc("is_admin"); return !r.error && r.data === true; }

  function loginView(msg) {
    document.getElementById("logout").hidden = true;
    app.innerHTML = '<form class="login" id="loginForm"><h2>Entrar no painel</h2>' + (msg ? '<p class="warn">' + esc(msg) + "</p>" : "") +
      '<div class="field"><label class="label" for="em">E-mail</label><input id="em" type="email" required autocomplete="username"></div>' +
      '<div class="field"><label class="label" for="pw">Senha</label><input id="pw" type="password" required minlength="8" autocomplete="current-password"></div>' +
      '<button class="btn btn-mar" type="submit">Entrar</button>' +
      '<button class="btn btn-ghost" type="button" id="first">Primeiro acesso: criar minha senha</button>' +
      '<p class="note">O primeiro acesso só funciona para e-mails autorizados como administradores.</p></form>';
    var em = document.getElementById("em"), pw = document.getElementById("pw");
    document.getElementById("loginForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var r = await sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
      if (r.error) return loginView("Não foi possível entrar: confira e-mail e senha.");
      boot();
    });
    document.getElementById("first").addEventListener("click", async function () {
      if (!em.value || pw.value.length < 8) return U.toast("Digite seu e-mail e uma senha com pelo menos 8 caracteres.");
      var r = await sb.auth.signUp({ email: em.value.trim(), password: pw.value });
      if (r.error) return loginView("Não foi possível criar o acesso: " + r.error.message);
      var s = await sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value });
      if (s.error) return loginView("Acesso criado. Se o e-mail não for de administrador, ele precisa ser liberado antes.");
      boot();
    });
  }

  async function boot() {
    var s = await session();
    if (!s) return loginView();
    if (!(await isAdmin())) { await sb.auth.signOut(); return loginView("Este e-mail não tem permissão de administrador."); }
    document.getElementById("logout").hidden = false;
    render();
  }
  document.getElementById("logout").addEventListener("click", async function () { await sb.auth.signOut(); loginView(); });

  var TABS = [["inicio", "Resumo"], ["reservas", "Reservas"], ["precos", "Preços"], ["passeios", "Passeios"], ["cupons", "Cupons e agentes"], ["parceiros", "Parceiros"], ["contatos", "Contatos"], ["avaliacoes", "Avaliações"], ["perguntas", "Perguntas"], ["config", "Configurações"]];

  function shell(inner) {
    app.innerHTML = '<div class="adm"><nav class="tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + '</nav><section class="panel" id="panel">' + inner + "</section></div>";
    app.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab = b.dataset.tab; render(); }); });
  }
  function fail(r) { if (r && r.error) { U.toast("Erro: " + r.error.message); return true; } return false; }
  function ddmm(d) { return d ? String(d).slice(0, 10).split("-").reverse().join("/") : ""; }

  async function render() {
    shell('<div class="empty">Carregando…</div>');
    var p = document.getElementById("panel");
    try { await VIEWS[tab](p); } catch (e) { p.innerHTML = '<div class="warn">Erro ao carregar: ' + esc(e.message || e) + "</div>"; }
  }

  var VIEWS = {};

  VIEWS.inicio = async function (p) {
    var r = await sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(500);
    if (fail(r)) return;
    var b = r.data, today = new Date().toISOString().slice(0, 10), month = today.slice(0, 7);
    var paid = b.filter(function (x) { return ["pago", "confirmado", "realizado"].indexOf(x.status) > -1; });
    var monthPaid = paid.filter(function (x) { return String(x.created_at).slice(0, 7) === month; });
    var sum = monthPaid.reduce(function (a, x) { return a + Number(x.total || 0); }, 0);
    var t = await sb.from("tours").select("slug", { count: "exact", head: true });
    p.innerHTML = '<div class="kpis">' +
      '<div class="kpi"><b class="num">' + b.filter(function (x) { return x.status === "pendente"; }).length + "</b><span>reservas esperando pagamento</span></div>" +
      '<div class="kpi"><b class="num">' + b.filter(function (x) { return x.tour_date === today && x.status !== "cancelado"; }).length + "</b><span>passeios hoje</span></div>" +
      '<div class="kpi"><b class="num">' + D.brl(sum) + "</b><span>vendido no mês (pagas)</span></div>" +
      '<div class="kpi"><b class="num">' + (t.count || 0) + "</b><span>passeios cadastrados</span></div></div>" +
      (t.count ? "" : '<div class="item"><h3>Banco vazio</h3><p>Carregue os 15 passeios, avaliações, perguntas e configurações iniciais para começar a editar.</p><div class="row"><button class="btn btn-mar" type="button" id="seed">Carregar dados iniciais</button></div></div>') +
      '<div class="item"><h3>Próximos passeios</h3>' + (b.filter(function (x) { return x.tour_date >= today && x.status !== "cancelado"; }).sort(function (a, c) { return a.tour_date < c.tour_date ? -1 : 1; }).slice(0, 8).map(function (x) {
        return '<div class="row small"><span class="st st-' + x.status + '">' + STATUS_TXT[x.status] + "</span><b>" + ddmm(x.tour_date) + "</b> " + esc(x.tour_name) + " · " + esc(x.customer_name) + " · " + (x.adults + x.children + x.seniors) + " pessoas</div>";
      }).join("") || '<p class="muted">Nenhum passeio marcado.</p>') + "</div>";
    var sd = document.getElementById("seed");
    if (sd) sd.addEventListener("click", async function () {
      sd.disabled = true; sd.textContent = "Carregando…";
      var S = D.SEED;
      var tours = S.tours.map(function (x) { var y = Object.assign({}, x); return y; });
      var a = await sb.from("tours").upsert(tours); if (fail(a)) return;
      var c = await sb.from("settings").upsert({ id: 1, data: S.settings }); if (fail(c)) return;
      if (S.reviews.length) { var d = await sb.from("reviews").insert(S.reviews.map(function (x, i) { return Object.assign({ sort: i + 1 }, x); })); if (fail(d)) return; }
      var e = await sb.from("faqs").insert(S.faqs.map(function (x, i) { return Object.assign({ sort: i + 1 }, x); })); if (fail(e)) return;
      U.toast("Dados iniciais carregados."); render();
    });
  };

  VIEWS.reservas = async function (p) {
    var filt = cache.resFilter || "ativas";
    var r = await sb.from("bookings").select("*").order("tour_date", { ascending: true }).limit(1000);
    if (fail(r)) return;
    var S = (await D.load()).settings;
    var list = r.data.filter(function (x) { return filt === "todas" ? true : filt === "ativas" ? ["cancelado", "realizado"].indexOf(x.status) < 0 : x.status === filt; });
    p.innerHTML = '<div class="row"><label class="label" for="rf">Mostrar</label><select id="rf" style="width:auto">' + ["ativas", "todas"].concat(STATUS).map(function (s) { return '<option value="' + s + '"' + (s === filt ? " selected" : "") + ">" + (STATUS_TXT[s] || (s === "ativas" ? "Em aberto" : "Todas")) + "</option>"; }).join("") + "</select><span class=\"muted small\">" + list.length + " reservas</span></div>" +
      (list.map(function (x) {
        var people = x.adults + " ad., " + x.children + " cri., " + x.seniors + " ido.";
        var wa = D.waLink(x.phone, "Olá, " + x.customer_name.split(" ")[0] + "! Sobre sua reserva de " + x.tour_name + " em " + ddmm(x.tour_date) + ":");
        var conf = D.waLink(x.phone, ["✅ Reserva confirmada · " + S.brand + " Passeios", "", "Passeio: " + x.tour_name, "Data: " + ddmm(x.tour_date), "Pessoas: " + people + (x.buggy_cars ? " · Buggy: " + x.buggy_cars : ""), "Busca: " + (x.hotel || "a confirmar"), "Valor: " + D.brl(x.total) + " (" + (x.status === "pendente" ? "a pagar" : "pago") + ")", "Código: #" + x.id, "", "O horário exato da busca vai na véspera. " + (S.cancel_policy || "")].join("\n"));
        return '<div class="item"><div class="item-head"><div><h3>' + esc(x.tour_name) + " · " + ddmm(x.tour_date) + '</h3><p class="small muted">#' + x.id + " · feita em " + ddmm(x.created_at) + "</p></div><span class=\"st st-" + x.status + '">' + STATUS_TXT[x.status] + "</span></div>" +
          '<p class="small"><b>' + esc(x.customer_name) + "</b> · " + esc(x.phone) + (x.hotel ? " · Busca: " + esc(x.hotel) : "") + "</p>" +
          '<p class="small">' + (x.kind === "priv" ? "Privativo" : "Em grupo") + " · " + people + (x.buggy_cars ? " · Buggy: " + x.buggy_cars : "") + (x.coupon ? " · Cupom " + esc(x.coupon) : "") + " · <b>" + D.brl(x.total) + "</b> " + (x.pay_method === "pix" ? "Pix" : "cartão") + "</p>" +
          '<div class="row"><select data-status="' + x.id + '" style="width:auto">' + STATUS.map(function (s) { return '<option value="' + s + '"' + (s === x.status ? " selected" : "") + ">" + STATUS_TXT[s] + "</option>"; }).join("") + "</select>" +
          (conf ? '<a class="btn btn-mar" href="' + conf + '" target="_blank" rel="noopener">Mandar confirmação</a>' : "") +
          (wa ? '<a class="btn btn-ghost" href="' + wa + '" target="_blank" rel="noopener">WhatsApp do cliente</a>' : "") +
          '<button class="btn btn-ghost" type="button" data-note="' + x.id + '">Anotação</button></div>' + (x.notes ? '<p class="small muted">📝 ' + esc(x.notes) + "</p>" : "") + "</div>";
      }).join("") || '<div class="empty">Nenhuma reserva aqui.</div>');
    document.getElementById("rf").addEventListener("change", function (e) { cache.resFilter = e.target.value; render(); });
    p.querySelectorAll("[data-status]").forEach(function (s) { s.addEventListener("change", async function () { var u = await sb.from("bookings").update({ status: s.value }).eq("id", s.dataset.status); if (!fail(u)) { U.toast("Status atualizado."); render(); } }); });
    p.querySelectorAll("[data-note]").forEach(function (b) { b.addEventListener("click", async function () {
      var x = r.data.filter(function (y) { return String(y.id) === b.dataset.note; })[0];
      var box = document.createElement("div"); box.className = "field"; box.innerHTML = '<textarea aria-label="Anotação">' + esc(x.notes || "") + '</textarea><button class="btn btn-mar" type="button">Salvar anotação</button>';
      b.closest(".item").appendChild(box); b.disabled = true;
      box.querySelector("button").addEventListener("click", async function () { var u = await sb.from("bookings").update({ notes: box.querySelector("textarea").value }).eq("id", x.id); if (!fail(u)) { U.toast("Anotação salva."); render(); } });
    }); });
    void S;
  };

  VIEWS.precos = async function (p) {
    var r = await sb.from("tours").select("slug,name,price_card,price_pix,price_private,per_vehicle,active,extras").order("sort");
    if (fail(r)) return;
    p.innerHTML = '<p class="note">Revise e toque em Salvar tudo. Pix normalmente fica de 5% a 10% abaixo do cartão. O privativo é o preço do veículo inteiro.</p>' +
      r.data.map(function (t) {
        var bug = (t.extras || []).filter(function (e) { return e.buggy; })[0];
        return '<div class="item" data-slug="' + esc(t.slug) + '"><div class="item-head"><h3>' + esc(t.name) + "</h3>" + (t.active ? "" : '<span class="st st-cancelado">Oculto</span>') + '</div><div class="formgrid">' +
          f("pc_" + t.slug, "Cartão (R$)" + (t.per_vehicle ? " por veículo" : " por pessoa"), t.price_card, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
          f("pp_" + t.slug, "Pix (R$)", t.price_pix, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
          (t.per_vehicle ? "" : f("pv_" + t.slug, "Privativo por veículo (vazio = não oferece)", t.price_private == null ? "" : t.price_private, "", 'type="number" step="0.01" min="0" inputmode="decimal"')) +
          (bug ? f("pb_" + t.slug, "Buggy por carro (R$)", bug.price, "", 'type="number" step="0.01" min="0" inputmode="decimal"') : "") +
          "</div></div>";
      }).join("") + '<div class="row" style="position:sticky;bottom:0;background:var(--bg);padding-block:10px"><button class="btn btn-mar" type="button" id="saveAll" style="flex:1">Salvar tudo</button></div>';
    document.getElementById("saveAll").addEventListener("click", async function () {
      var btn = this; btn.disabled = true; btn.textContent = "Salvando…"; var errs = 0;
      for (var i = 0; i < r.data.length; i++) {
        var t = r.data[i], v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : null; };
        var row = { price_card: Number(v("pc_" + t.slug)) || 0, price_pix: Number(v("pp_" + t.slug)) || 0, updated_at: new Date().toISOString() };
        if (!t.per_vehicle) row.price_private = v("pv_" + t.slug) === "" ? null : Number(v("pv_" + t.slug));
        if (v("pb_" + t.slug) !== null) row.extras = (t.extras || []).map(function (e) { return e.buggy ? Object.assign({}, e, { price: Number(v("pb_" + t.slug)) || 0 }) : e; });
        var u = await sb.from("tours").update(row).eq("slug", t.slug); if (u.error) errs++;
      }
      btn.disabled = false; btn.textContent = "Salvar tudo";
      U.toast(errs ? "Alguns preços não salvaram (" + errs + "). Tente de novo." : "Preços salvos. O site já mostra os novos valores.");
    });
  };

  VIEWS.passeios = async function (p) {
    var r = await sb.from("tours").select("*").order("sort");
    if (fail(r)) return;
    if (cache.editTour !== undefined) return tourForm(p, cache.editTour ? r.data.filter(function (x) { return x.slug === cache.editTour; })[0] : null);
    p.innerHTML = '<div class="row"><button class="btn btn-mar" type="button" id="newTour">+ Novo passeio</button><span class="muted small">' + r.data.length + " passeios</span></div>" +
      r.data.map(function (t) {
        return '<div class="item"><div class="item-head"><div style="display:flex;gap:12px;align-items:center">' + ((t.photos || [])[0] ? '<img src="' + esc(t.photos[0].url) + '" alt="" style="width:72px;height:52px;object-fit:cover;border-radius:8px">' : "") + "<div><h3>" + esc(t.name) + '</h3><p class="small muted">' + esc(t.category) + " · " + D.brl(t.price_pix) + " no Pix · " + D.brl(t.price_card) + " cartão</p></div></div>" +
          '<span class="st ' + (t.active ? "st-pago" : "st-cancelado") + '">' + (t.active ? "No ar" : "Oculto") + "</span></div>" +
          '<div class="row"><button class="btn btn-ghost" type="button" data-edit="' + esc(t.slug) + '">Editar</button><button class="btn btn-ghost" type="button" data-toggle="' + esc(t.slug) + '">' + (t.active ? "Ocultar" : "Publicar") + '</button><a class="btn btn-ghost" href="passeio.html?p=' + encodeURIComponent(t.slug) + '" target="_blank" rel="noopener">Ver</a></div></div>';
      }).join("");
    document.getElementById("newTour").addEventListener("click", function () { cache.editTour = null; render(); });
    p.querySelectorAll("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { cache.editTour = b.dataset.edit; render(); }); });
    p.querySelectorAll("[data-toggle]").forEach(function (b) { b.addEventListener("click", async function () { var t = r.data.filter(function (x) { return x.slug === b.dataset.toggle; })[0]; var u = await sb.from("tours").update({ active: !t.active }).eq("slug", t.slug); if (!fail(u)) render(); }); });
  };

  function linesOf(arr, fn) { return (arr || []).map(fn).join("\n"); }
  function tourForm(p, t) {
    var isNew = !t; t = t || { slug: "", name: "", category: "passeios", location: "", times: "", duration: "", price_card: 0, price_pix: 0, price_private: null, per_vehicle: false, rating: 5, featured: false, active: true, sort: 100, summary: "", description: "", includes: [], extras: [], itinerary: [], photos: [] };
    var photos = (t.photos || []).slice();
    p.innerHTML = '<div class="item"><div class="item-head"><h3>' + (isNew ? "Novo passeio" : "Editar: " + esc(t.name)) + '</h3><button class="btn btn-ghost" type="button" id="back">Voltar</button></div>' +
      '<form id="tf" class="formgrid">' +
      f("name", "Nome", t.name, "full") + f("slug", "Endereço na página (sem espaços)", t.slug, "", isNew ? "" : "readonly") +
      '<div class="field"><label class="label" for="category">Categoria</label><select id="category">' + D.CATS.slice(1).map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === t.category ? " selected" : "") + ">" + c[1] + "</option>"; }).join("") + "</select></div>" +
      f("location", "Local", t.location) + f("times", "Horários", t.times) + f("duration", "Duração", t.duration) +
      f("price_card", "Preço no cartão (R$)", t.price_card, "", 'type="number" step="0.01" min="0"') + f("price_pix", "Preço no Pix (R$)", t.price_pix, "", 'type="number" step="0.01" min="0"') +
      f("price_private", "Preço privativo por veículo (R$, opcional)", t.price_private == null ? "" : t.price_private, "", 'type="number" step="0.01" min="0"') +
      f("rating", "Nota (0 a 5)", t.rating, "", 'type="number" step="0.1" min="0" max="5"') + f("sort", "Ordem na lista", t.sort, "", 'type="number"') +
      '<label class="check"><input type="checkbox" id="per_vehicle"' + (t.per_vehicle ? " checked" : "") + "> Preço por veículo</label>" +
      '<label class="check"><input type="checkbox" id="featured"' + (t.featured ? " checked" : "") + "> Mais vendido (destaque)</label>" +
      '<label class="check"><input type="checkbox" id="active"' + (t.active ? " checked" : "") + "> Publicado no site</label>" +
      ta("summary", "Resumo (aparece nos cartões e no Google)", t.summary) + ta("description", "Descrição completa", t.description) +
      ta("includes", "Incluso (um por linha)", (t.includes || []).join("\n")) +
      ta("extras", "Extras à parte (um por linha: nome | preço). Escreva 'buggy' no fim para virar opção na reserva", linesOf(t.extras, function (e) { return e.name + " | " + e.price + (e.buggy ? " | buggy" : ""); })) +
      ta("itinerary", "Roteiro (um por linha: horário | o que acontece)", linesOf(t.itinerary, function (e) { return e.time + " | " + e.text; })) +
      '<div class="field full"><span class="label">Fotos (a primeira é a capa)</span><div class="thumbs" id="thumbs"></div>' +
      '<div class="row"><input type="file" id="up" accept="image/*" multiple style="width:auto"><input id="purl" placeholder="ou cole o endereço de uma foto" style="flex:1;min-width:200px"><button class="btn btn-ghost" type="button" id="addUrl">Adicionar</button></div></div>' +
      '<div class="row full"><button class="btn btn-mar" type="submit">Salvar passeio</button>' + (isNew ? "" : '<button class="btn btn-danger" type="button" id="del">Excluir</button>') + "</div></form></div>";
    function paintThumbs() {
      document.getElementById("thumbs").innerHTML = photos.map(function (ph, i) { return '<div><img src="' + esc(ph.url) + '" alt=""><button type="button" data-first="' + i + '">Usar como capa</button><button type="button" data-rm="' + i + '">Remover</button></div>'; }).join("") || '<p class="muted small">Sem fotos.</p>';
      document.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { photos.splice(+b.dataset.rm, 1); paintThumbs(); }); });
      document.querySelectorAll("[data-first]").forEach(function (b) { b.addEventListener("click", function () { var x = photos.splice(+b.dataset.first, 1)[0]; photos.unshift(x); paintThumbs(); }); });
    }
    paintThumbs();
    document.getElementById("back").addEventListener("click", function () { delete cache.editTour; render(); });
    document.getElementById("addUrl").addEventListener("click", function () { var u = document.getElementById("purl").value.trim(); if (u) { photos.push({ url: u }); document.getElementById("purl").value = ""; paintThumbs(); } });
    document.getElementById("up").addEventListener("change", async function (e) {
      var slug = (document.getElementById("slug").value || "passeio").trim();
      for (var i = 0; i < e.target.files.length; i++) {
        var file = e.target.files[i], path = slug + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.]+/g, "-").toLowerCase();
        U.toast("Enviando " + file.name + "…");
        var up = await sb.storage.from("fotos").upload(path, file, { upsert: false, contentType: file.type });
        if (fail(up)) continue;
        photos.push({ url: sb.storage.from("fotos").getPublicUrl(path).data.publicUrl });
        paintThumbs();
      }
      U.toast("Fotos enviadas. Lembre de salvar o passeio.");
    });
    if (!isNew) document.getElementById("del").addEventListener("click", async function () {
      var b = this; if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toque de novo para excluir de vez"; return; }
      var d = await sb.from("tours").delete().eq("slug", t.slug); if (!fail(d)) { U.toast("Passeio excluído."); delete cache.editTour; render(); }
    });
    document.getElementById("tf").addEventListener("submit", async function (e) {
      e.preventDefault();
      var g = function (id) { return document.getElementById(id).value.trim(); };
      var slug = g("slug").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
      if (!slug || !g("name")) return U.toast("Preencha nome e endereço da página.");
      var row = {
        slug: slug, name: g("name"), category: g("category"), location: g("location"), times: g("times"), duration: g("duration"),
        price_card: Number(g("price_card")) || 0, price_pix: Number(g("price_pix")) || 0, price_private: g("price_private") === "" ? null : Number(g("price_private")),
        rating: Number(g("rating")) || 5, sort: Number(g("sort")) || 100,
        per_vehicle: document.getElementById("per_vehicle").checked, featured: document.getElementById("featured").checked, active: document.getElementById("active").checked,
        summary: g("summary"), description: g("description"),
        includes: g("includes").split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
        extras: g("extras").split("\n").map(function (s) { var a = s.split("|").map(function (y) { return y.trim(); }); if (!a[0]) return null; var n = Number(String(a[1] || "").replace(",", ".")); var o = { name: a[0], price: isNaN(n) || a[1] === "" ? (a[1] || "") : n }; if ((a[2] || "").toLowerCase() === "buggy") o.buggy = true; return o; }).filter(Boolean),
        itinerary: g("itinerary").split("\n").map(function (s) { var a = s.split("|").map(function (y) { return y.trim(); }); return a[0] ? { time: a[0], text: a[1] || "" } : null; }).filter(Boolean),
        photos: photos, updated_at: new Date().toISOString()
      };
      var r = await sb.from("tours").upsert(row);
      if (!fail(r)) { U.toast("Passeio salvo e publicado."); delete cache.editTour; render(); }
    });
  }
  function f(id, label, val, cls, attrs) { return '<div class="field ' + (cls || "") + '"><label class="label" for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val == null ? "" : val) + '" ' + (attrs || "") + "></div>"; }
  function ta(id, label, val) { return '<div class="field full"><label class="label" for="' + id + '">' + label + '</label><textarea id="' + id + '">' + esc(val || "") + "</textarea></div>"; }

  VIEWS.cupons = async function (p) {
    var r = await sb.from("coupons").select("*").order("created_at");
    var b = await sb.from("bookings").select("coupon,total,status").not("coupon", "is", null);
    if (fail(r) || fail(b)) return;
    var stats = {};
    b.data.forEach(function (x) { if (["pago", "confirmado", "realizado"].indexOf(x.status) < 0) return; var k = x.coupon.toUpperCase(); stats[k] = stats[k] || { n: 0, v: 0 }; stats[k].n++; stats[k].v += Number(x.total || 0); });
    var site = location.origin + location.pathname.replace(/admin\.html$/, "");
    p.innerHTML = '<div class="item"><h3>Novo cupom</h3><form id="cf" class="formgrid">' +
      f("c_code", "Código (ex.: BRUNO)", "") + f("c_agent", "Nome do agente", "") +
      f("c_disc", "Desconto do cliente (%)", 5, "", 'type="number" step="0.5" min="0" max="50"') + f("c_comm", "Comissão do agente (%)", 8, "", 'type="number" step="0.5" min="0" max="50"') +
      f("c_leader", "Líder (opcional)", "") + f("c_lpct", "Comissão do líder (%)", 0, "", 'type="number" step="0.5" min="0" max="20"') +
      '<div class="row full"><button class="btn btn-mar" type="submit">Criar cupom</button></div></form><p class="note">Comissões são calculadas só sobre reservas pagas, confirmadas ou realizadas.</p></div>' +
      r.data.map(function (c) {
        var s = stats[c.code.toUpperCase()] || { n: 0, v: 0 };
        var link = site + "?cupom=" + encodeURIComponent(c.code);
        return '<div class="item"><div class="item-head"><div><h3>' + esc(c.code) + " · " + esc(c.agent_name) + '</h3><p class="small muted">Cliente ganha ' + c.discount_pct + "% · agente ganha " + c.commission_pct + "%" + (c.leader ? " · líder " + esc(c.leader) + " ganha " + c.leader_pct + "%" : "") + '</p></div><span class="st ' + (c.active ? "st-pago" : "st-cancelado") + '">' + (c.active ? "Ativo" : "Pausado") + "</span></div>" +
          '<p class="small"><b>' + s.n + "</b> vendas · " + D.brl(s.v) + " vendido · comissão do agente <b>" + D.brl(s.v * c.commission_pct / 100) + "</b>" + (c.leader ? " · do líder <b>" + D.brl(s.v * c.leader_pct / 100) + "</b>" : "") + "</p>" +
          '<div class="row"><button class="btn btn-ghost" type="button" data-copy="' + esc(link) + '">Copiar link do agente</button><button class="btn btn-ghost" type="button" data-ctoggle="' + esc(c.code) + '">' + (c.active ? "Pausar" : "Ativar") + '</button><button class="btn btn-danger" type="button" data-cdel="' + esc(c.code) + '">Excluir</button></div></div>';
      }).join("");
    document.getElementById("cf").addEventListener("submit", async function (e) {
      e.preventDefault();
      var code = document.getElementById("c_code").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      var agent = document.getElementById("c_agent").value.trim();
      if (!code || !agent) return U.toast("Preencha código e nome do agente.");
      var x = await sb.from("coupons").insert({ code: code, agent_name: agent, discount_pct: +document.getElementById("c_disc").value || 0, commission_pct: +document.getElementById("c_comm").value || 0, leader: document.getElementById("c_leader").value.trim() || null, leader_pct: +document.getElementById("c_lpct").value || 0 });
      if (!fail(x)) { U.toast("Cupom criado."); render(); }
    });
    p.querySelectorAll("[data-copy]").forEach(function (b) { b.addEventListener("click", function () { var l = b.dataset.copy; if (navigator.clipboard) navigator.clipboard.writeText(l).then(function () { U.toast("Link copiado: mande para o agente."); }, function () { U.toast(l); }); else U.toast(l); }); });
    p.querySelectorAll("[data-ctoggle]").forEach(function (b) { b.addEventListener("click", async function () { var c = r.data.filter(function (y) { return y.code === b.dataset.ctoggle; })[0]; var u = await sb.from("coupons").update({ active: !c.active }).eq("code", c.code); if (!fail(u)) render(); }); });
    p.querySelectorAll("[data-cdel]").forEach(function (b) { b.addEventListener("click", async function () { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toque de novo para excluir"; return; } var u = await sb.from("coupons").delete().eq("code", b.dataset.cdel); if (!fail(u)) render(); }); });
  };

  VIEWS.parceiros = async function (p) {
    var r = await sb.from("partner_requests").select("*").order("created_at", { ascending: false });
    if (fail(r)) return;
    p.innerHTML = r.data.map(function (x) {
      var wa = D.waLink(x.phone, "Olá, " + x.name.split(" ")[0] + "! Recebemos seu pedido para ser parceiro.");
      return '<div class="item"><div class="item-head"><div><h3>' + esc(x.name) + '</h3><p class="small muted">' + esc(x.role) + " · " + esc(x.phone) + " · " + ddmm(x.created_at) + "</p></div><span class=\"st " + (x.status === "novo" ? "st-pendente" : "st-pago") + '">' + esc(x.status) + "</span></div>" +
        '<div class="row">' + (wa ? '<a class="btn btn-ghost" href="' + wa + '" target="_blank" rel="noopener">Chamar no WhatsApp</a>' : "") + '<button class="btn btn-ghost" type="button" data-done="' + x.id + '">Marcar como atendido</button></div></div>';
    }).join("") || '<div class="empty">Nenhum pedido de parceria ainda.</div>';
    p.querySelectorAll("[data-done]").forEach(function (b) { b.addEventListener("click", async function () { var u = await sb.from("partner_requests").update({ status: "atendido" }).eq("id", b.dataset.done); if (!fail(u)) render(); }); });
  };

  VIEWS.contatos = async function (p) {
    var r = await sb.from("leads").select("*").order("created_at", { ascending: false });
    if (fail(r)) return;
    p.innerHTML = '<div class="row"><button class="btn btn-ghost" type="button" id="copyAll">Copiar todos os números</button><span class="muted small">' + r.data.length + " contatos da lista de promoções</span></div>" +
      r.data.map(function (x) { return '<div class="item small"><div class="row"><b>' + esc(x.phone) + '</b><span class="muted">' + ddmm(x.created_at) + "</span></div></div>"; }).join("");
    document.getElementById("copyAll").addEventListener("click", function () { var t = r.data.map(function (x) { return x.phone; }).join("\n"); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { U.toast("Números copiados."); }); });
  };

  function simpleCrud(table, fields, title) {
    return async function (p) {
      var r = await sb.from(table).select("*").order("sort");
      if (fail(r)) return;
      p.innerHTML = '<div class="item"><h3>Adicionar ' + title + '</h3><form id="nf" class="formgrid">' + fields.map(function (x) { return x[2] === "ta" ? ta("n_" + x[0], x[1], "") : f("n_" + x[0], x[1], ""); }).join("") + '<div class="row full"><button class="btn btn-mar" type="submit">Adicionar</button></div></form></div>' +
        r.data.map(function (x) {
          return '<div class="item" data-id="' + x.id + '"><div class="formgrid">' + fields.map(function (fl) { return fl[2] === "ta" ? ta("e" + x.id + "_" + fl[0], fl[1], x[fl[0]]) : f("e" + x.id + "_" + fl[0], fl[1], x[fl[0]]); }).join("") +
            f("e" + x.id + "_sort", "Ordem", x.sort, "", 'type="number"') + '<label class="check"><input type="checkbox" id="e' + x.id + '_published"' + (x.published ? " checked" : "") + "> Publicado</label></div>" +
            '<div class="row"><button class="btn btn-mar" type="button" data-save="' + x.id + '">Salvar</button><button class="btn btn-danger" type="button" data-del="' + x.id + '">Excluir</button></div></div>';
        }).join("");
      document.getElementById("nf").addEventListener("submit", async function (e) {
        e.preventDefault(); var row = { sort: r.data.length + 1 }; var ok = true;
        fields.forEach(function (x) { row[x[0]] = document.getElementById("n_" + x[0]).value.trim(); if (x[3] && !row[x[0]]) ok = false; });
        if (!ok) return U.toast("Preencha os campos obrigatórios.");
        var i = await sb.from(table).insert(row); if (!fail(i)) { U.toast("Adicionado."); render(); }
      });
      p.querySelectorAll("[data-save]").forEach(function (b) { b.addEventListener("click", async function () {
        var id = b.dataset.save, row = { sort: +document.getElementById("e" + id + "_sort").value || 100, published: document.getElementById("e" + id + "_published").checked };
        fields.forEach(function (x) { row[x[0]] = document.getElementById("e" + id + "_" + x[0]).value.trim(); });
        var u = await sb.from(table).update(row).eq("id", id); if (!fail(u)) U.toast("Salvo.");
      }); });
      p.querySelectorAll("[data-del]").forEach(function (b) { b.addEventListener("click", async function () { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toque de novo para excluir"; return; } var u = await sb.from(table).delete().eq("id", b.dataset.del); if (!fail(u)) render(); }); });
    };
  }
  VIEWS.avaliacoes = simpleCrud("reviews", [["name", "Nome", "", 1], ["origin", "Estado ou país"], ["tour", "Passeio"], ["month", "Mês (ex.: Nov 2026)"], ["stars", "Estrelas (1 a 5)", "", 1], ["text", "Texto da avaliação (só de cliente real)", "ta", 1]], "avaliação");
  VIEWS.perguntas = simpleCrud("faqs", [["question", "Pergunta", "", 1], ["answer", "Resposta", "ta", 1]], "pergunta");

  VIEWS.config = async function (p) {
    var r = await sb.from("settings").select("data").eq("id", 1).maybeSingle();
    if (fail(r)) return;
    var s = Object.assign({}, D.SEED.settings, (r.data && r.data.data) || {});
    var F = [["brand", "Nome da marca"], ["brand_sub", "Linha abaixo do nome"], ["whatsapp", "WhatsApp de atendimento (com 55 e DDD)"], ["instagram", "Instagram (sem @)"],
      ["pix_key", "Chave Pix"], ["pix_name", "Nome que aparece no Pix"], ["hero_eyebrow", "Selo da capa"], ["hero_title", "Título da capa"],
      ["rating_value", "Nota real do Google (deixe vazio até ter)"], ["rating_count", "Quantidade real de avaliações (vazio esconde as notas)"], ["pack_discount_pct", "Desconto de pacote (%)", "n"], ["deposit_per_person", "Sinal por pessoa (R$)", "n"],
      ["child_factor", "Criança paga (0,5 = meia)", "n"], ["footer_note", "Rodapé"]];
    p.innerHTML = '<div class="item"><h3>Configurações do site</h3><form id="sf" class="formgrid">' +
      F.map(function (x) { return f("s_" + x[0], x[1], s[x[0]], "", x[2] === "n" ? 'type="number" step="0.01"' : ""); }).join("") +
      ta("s_hero_promises", "Promessas da capa (uma por linha)", (s.hero_promises || []).join("\n")) + ta("s_cancel_policy", "Regra de cancelamento e chuva", s.cancel_policy) +
      '<div class="row full"><button class="btn btn-mar" type="submit">Salvar configurações</button></div></form></div>' +
      '<div class="item"><h3>Administradores</h3><p class="small muted">E-mails que podem entrar neste painel.</p><div id="admins"></div><form id="af" class="row"><input id="newAdmin" type="email" placeholder="email@exemplo.com" style="flex:1;min-width:200px"><button class="btn btn-ghost" type="submit">Adicionar</button></form></div>';
    document.getElementById("sf").addEventListener("submit", async function (e) {
      e.preventDefault(); var d = {};
      F.forEach(function (x) { var v = document.getElementById("s_" + x[0]).value.trim(); d[x[0]] = x[2] === "n" ? Number(v.replace(",", ".")) || 0 : v; });
      d.whatsapp = d.whatsapp.replace(/\D/g, "");
      d.hero_promises = document.getElementById("s_hero_promises").value.split("\n").map(function (z) { return z.trim(); }).filter(Boolean);
      d.cancel_policy = document.getElementById("s_cancel_policy").value.trim();
      var u = await sb.from("settings").upsert({ id: 1, data: d, updated_at: new Date().toISOString() }); if (!fail(u)) U.toast("Configurações salvas. O site já mostra as mudanças.");
    });
    async function paintAdmins() {
      var a = await sb.from("admin_emails").select("*"); if (fail(a)) return;
      document.getElementById("admins").innerHTML = a.data.map(function (x) { return '<div class="row small"><b>' + esc(x.email) + '</b><button class="btn btn-ghost" type="button" data-adel="' + esc(x.email) + '">Remover</button></div>'; }).join("");
      document.querySelectorAll("[data-adel]").forEach(function (b) { b.addEventListener("click", async function () { if (a.data.length <= 1) return U.toast("Precisa ficar pelo menos um administrador."); var u = await sb.from("admin_emails").delete().eq("email", b.dataset.adel); if (!fail(u)) paintAdmins(); }); });
    }
    paintAdmins();
    document.getElementById("af").addEventListener("submit", async function (e) { e.preventDefault(); var v = document.getElementById("newAdmin").value.trim().toLowerCase(); if (!v) return; var u = await sb.from("admin_emails").insert({ email: v }); if (!fail(u)) { document.getElementById("newAdmin").value = ""; paintAdmins(); U.toast("Administrador adicionado. Ele cria a senha em “Primeiro acesso”."); } });
  };

  var st = await D.load(); U.brand(st.settings);
  sb.auth.onAuthStateChange(function () {});
  boot();
})();
