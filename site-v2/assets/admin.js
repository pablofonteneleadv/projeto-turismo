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

  var GROUPS = [
    ["Vendas", [["inicio", "Resumo", "◎"], ["operacao", "Operação do dia", "☀"], ["reservas", "Reservas", "▤"], ["financeiro", "Financeiro", "$"]]],
    ["Catálogo", [["passeios", "Passeios", "⛱"], ["precos", "Preços", "R$"], ["empresas", "Empresas e net", "⚓"]]],
    ["Divulgação", [["cupons", "Cupons e agentes", "%"], ["avaliacoes", "Avaliações", "★"], ["perguntas", "Perguntas", "?"], ["contatos", "Contatos", "☎"], ["parceiros", "Parceiros", "♟"]]],
    ["Sistema", [["config", "Configurações", "⚙"]]]
  ];
  var TABS = []; GROUPS.forEach(function (g) { g[1].forEach(function (t) { TABS.push(t); }); });
  var BOTTOM = ["operacao", "reservas", "passeios", "financeiro"];
  function tabInfo(k) { return TABS.filter(function (t) { return t[0] === k; })[0] || TABS[0]; }

  function shell(inner) {
    var side = GROUPS.map(function (g) { return '<div class="nav-group"><small>' + g[0] + "</small>" + g[1].map(function (t) { return '<button type="button" data-tab="' + t[0] + '" aria-current="' + (t[0] === tab ? "page" : "false") + '"><span class="ico" aria-hidden="true">' + t[2] + "</span>" + t[1] + "</button>"; }).join("") + "</div>"; }).join("");
    var bottom = BOTTOM.map(function (k) { var t = tabInfo(k); return '<button type="button" data-tab="' + k + '" aria-current="' + (k === tab ? "page" : "false") + '"><span class="ico" aria-hidden="true">' + t[2] + "</span>" + t[1].split(" ")[0] + "</button>"; }).join("") +
      '<button type="button" id="moreBtn" aria-expanded="false" aria-current="' + (BOTTOM.indexOf(tab) < 0 ? "page" : "false") + '"><span class="ico" aria-hidden="true">☰</span>Mais</button>';
    app.innerHTML = '<div class="adm2"><aside class="side" aria-label="Seções">' + side + '</aside><div class="main"><div class="ptitle"><h2>' + tabInfo(tab)[1] + '</h2><span class="muted small" id="pcount"></span></div><div id="tools"></div><section class="panel" id="panel">' + inner + "</section></div></div>" +
      '<nav class="bnav" aria-label="Seções principais">' + bottom + "</nav>" +
      '<div class="msheet" id="msheet" hidden><div class="msheet-in" role="dialog" aria-label="Todas as seções">' + side + '<button class="btn btn-ghost" type="button" id="mclose">Fechar</button></div></div>';
    app.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab = b.dataset.tab; cache.editTour = undefined; window.scrollTo(0, 0); render(); }); });
    var mb = document.getElementById("moreBtn"), ms = document.getElementById("msheet");
    mb.addEventListener("click", function () { ms.hidden = false; mb.setAttribute("aria-expanded", "true"); });
    document.getElementById("mclose").addEventListener("click", function () { ms.hidden = true; mb.setAttribute("aria-expanded", "false"); });
    ms.addEventListener("click", function (e) { if (e.target === ms) { ms.hidden = true; } });
  }

  // ---------- Busca, filtros e ordenação (gestor 2.0) ----------
  var TODAY = function () { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); };
  function addDays(d, n) { return new Date(new Date(d + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10); }
  var SORT_NAME = [["name", "Nome A–Z", "name", "s", 1], ["name_d", "Nome Z–A", "name", "s", -1]];
  var STATUS_OPTS = [["", "Todos os status"], ["_open", "Em aberto"]].concat(STATUS.map(function (k) { return [k, STATUS_TXT[k]]; }));
  var TOOLS = {
    reservas: { search: "Buscar nome, telefone, código, hotel…", filters: [{ k: "status", label: "Status", opts: STATUS_OPTS, def: "_open" }, { k: "date", label: "Período", type: "period", opts: [["", "Qualquer data"], ["next", "Próximos"], ["today", "Hoje"], ["tomorrow", "Amanhã"], ["week", "Próximos 7 dias"], ["past", "Já passaram"]] }, { k: "tour", label: "Passeio", dyn: true }, { k: "sup", label: "Empresa", dyn: true }],
      sorts: [["date", "Data do passeio ↑", "date", "s", 1], ["date_d", "Data do passeio ↓", "date", "s", -1], ["created_d", "Mais recentes", "created", "s", -1], ["value_d", "Maior valor", "value", "n", -1]].concat(SORT_NAME) },
    passeios: { search: "Buscar passeio…", filters: [{ k: "status", label: "Situação", opts: [["", "Todos"], ["on", "No ar"], ["off", "Ocultos"]] }, { k: "cat", label: "Categoria", opts: [["", "Todas"], ["passeios", "Passeios"], ["pacotes", "Pacotes"], ["transfers", "Transfers"]] }],
      sorts: [["sort", "Ordem do site", "sort", "n", 1]].concat(SORT_NAME, [["price", "Menor preço", "price", "n", 1], ["price_d", "Maior preço", "price", "n", -1]]) },
    precos: { search: "Buscar passeio…", filters: [{ k: "status", label: "Situação", opts: [["", "Todos"], ["on", "No ar"], ["off", "Ocultos"]], def: "on" }, { k: "cat", label: "Categoria", opts: [["", "Todas"], ["passeios", "Passeios"], ["pacotes", "Pacotes"], ["transfers", "Transfers"]] }],
      sorts: [["sort", "Ordem do site", "sort", "n", 1]].concat(SORT_NAME, [["price", "Menor preço", "price", "n", 1], ["price_d", "Maior preço", "price", "n", -1]]) },
    empresas: { search: "Buscar passeio…", filters: [{ k: "net", label: "Net", opts: [["", "Todos"], ["sem", "Sem net"], ["com", "Com net"]] }, { k: "status", label: "Situação", opts: [["", "Todos"], ["on", "No ar"], ["off", "Ocultos"]], def: "on" }],
      sorts: [["sort", "Ordem do site", "sort", "n", 1]].concat(SORT_NAME, [["margin", "Menor sobra", "margin", "n", 1], ["margin_d", "Maior sobra", "margin", "n", -1]]) },
    cupons: { search: "Buscar código ou agente…", filters: [{ k: "status", label: "Situação", opts: [["", "Todos"], ["on", "Ativos"], ["off", "Pausados"]] }],
      sorts: SORT_NAME.concat([["value_d", "Mais vendas", "value", "n", -1]]) },
    avaliacoes: { search: "Buscar avaliação…", filters: [{ k: "status", label: "Situação", opts: [["", "Todas"], ["on", "Publicadas"], ["off", "Escondidas"]] }], sorts: [["sort", "Ordem", "sort", "n", 1]].concat(SORT_NAME) },
    perguntas: { search: "Buscar pergunta…", filters: [{ k: "status", label: "Situação", opts: [["", "Todas"], ["on", "Publicadas"], ["off", "Escondidas"]] }], sorts: [["sort", "Ordem", "sort", "n", 1]].concat(SORT_NAME) },
    contatos: { search: "Buscar telefone…", filters: [], sorts: [["created_d", "Mais recentes", "created", "s", -1], ["created", "Mais antigos", "created", "s", 1]] },
    parceiros: { search: "Buscar nome ou telefone…", filters: [{ k: "status", label: "Situação", opts: [["", "Todos"], ["novo", "Novos"], ["atendido", "Atendidos"]] }], sorts: [["created_d", "Mais recentes", "created", "s", -1]].concat(SORT_NAME) }
  };
  function toolState(k) { cache.tools = cache.tools || {}; if (!cache.tools[k]) { var saved = null; try { saved = JSON.parse(localStorage.getItem("adm-tools-" + k) || "null"); } catch (e) {} var c = TOOLS[k], d = { q: "", sort: c.sorts[0][0], f: {} }; c.filters.forEach(function (fl) { d.f[fl.k] = fl.def || ""; }); cache.tools[k] = Object.assign(d, saved || {}, { q: "" }); } return cache.tools[k]; }
  function saveTools(k) { try { var s0 = Object.assign({}, cache.tools[k], { q: "" }); localStorage.setItem("adm-tools-" + k, JSON.stringify(s0)); } catch (e) {} }
  function mountTools(p) {
    var box = document.getElementById("tools"), c = TOOLS[tab], rows = [].slice.call(p.querySelectorAll("[data-row]"));
    var cnt = document.getElementById("pcount");
    if (!c || !rows.length) { box.innerHTML = ""; if (cnt) cnt.textContent = rows.length ? rows.length + " itens" : ""; return; }
    var st = toolState(tab);
    function opts(fl) {
      if (!fl.dyn) return fl.opts.map(function (o) { return o[0] === "" ? ["", fl.label + ": " + o[1].toLowerCase()] : o; });
      var seen = {}, o = [["", fl.label + ": todos"]];
      rows.forEach(function (r) { var v = r.dataset[fl.k], l = r.dataset[fl.k + "Label"] || v; if (v && !seen[v]) { seen[v] = 1; o.push([v, l]); } });
      return o.slice(0, 1).concat(o.slice(1).sort(function (a, b) { return a[1].localeCompare(b[1], "pt-BR"); }));
    }
    box.innerHTML = '<div class="tools"><input type="search" id="tq" placeholder="' + esc(c.search) + '" value="' + esc(st.q) + '" aria-label="Buscar">' +
      c.filters.map(function (fl) { return '<select data-fk="' + fl.k + '" aria-label="' + esc(fl.label) + '">' + opts(fl).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (st.f[fl.k] === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; }).join("") +
      '<select id="tsort" aria-label="Ordenar">' + c.sorts.map(function (o) { return '<option value="' + o[0] + '"' + (st.sort === o[0] ? " selected" : "") + ">↕ " + esc(o[1]) + "</option>"; }).join("") + "</select>" +
      '<button class="btn btn-ghost" type="button" id="tclear">Limpar</button></div>';
    function apply() {
      var q = st.q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), t0 = TODAY(), shown = 0;
      var so = c.sorts.filter(function (o) { return o[0] === st.sort; })[0] || c.sorts[0];
      rows.forEach(function (r) {
        var ok = !q || (r.dataset.search || r.textContent).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").indexOf(q) > -1;
        c.filters.forEach(function (fl) {
          var v = st.f[fl.k]; if (!ok || !v) return; var d = r.dataset[fl.k] || "";
          if (fl.type === "period") ok = v === "next" ? d >= t0 : v === "today" ? d === t0 : v === "tomorrow" ? d === addDays(t0, 1) : v === "week" ? d >= t0 && d <= addDays(t0, 7) : v === "past" ? d < t0 : true;
          else if (v === "_open") ok = ["cancelado", "realizado"].indexOf(d) < 0;
          else ok = d === v;
        });
        r.hidden = !ok; if (ok) shown++;
      });
      var groups = [];
      rows.forEach(function (r) { if (groups.indexOf(r.parentNode) < 0) groups.push(r.parentNode); });
      groups.forEach(function (g) {
        var mine = rows.filter(function (r) { return r.parentNode === g; }), last = null;
        [].forEach.call(g.children, function (ch) { if (mine.indexOf(ch) > -1) last = ch; });
        var anchor = last.nextSibling;
        mine.sort(function (a, b) { var x = a.dataset[so[2]] || "", y = b.dataset[so[2]] || ""; if (so[3] === "n") { x = Number(x) || 0; y = Number(y) || 0; return (x - y) * so[4]; } return x.localeCompare(y, "pt-BR") * so[4]; });
        mine.forEach(function (r) { g.insertBefore(r, anchor); });
      });
      if (cnt) cnt.textContent = shown === rows.length ? rows.length + (rows.length === 1 ? " item" : " itens") : shown + " de " + rows.length;
      var em = p.querySelector(".empty-filter");
      if (!shown && !em) { em = document.createElement("div"); em.className = "empty empty-filter"; em.textContent = "Nada encontrado com esses filtros."; p.appendChild(em); }
      if (shown && em) em.remove();
    }
    var tq = document.getElementById("tq"), tm;
    tq.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { st.q = tq.value; apply(); }, 120); });
    box.querySelectorAll("[data-fk]").forEach(function (sel) { sel.addEventListener("change", function () { st.f[sel.dataset.fk] = sel.value; saveTools(tab); apply(); }); });
    document.getElementById("tsort").addEventListener("change", function (e) { st.sort = e.target.value; saveTools(tab); apply(); });
    document.getElementById("tclear").addEventListener("click", function () { st.q = ""; tq.value = ""; c.filters.forEach(function (fl) { st.f[fl.k] = ""; }); box.querySelectorAll("[data-fk]").forEach(function (x) { x.value = ""; }); saveTools(tab); apply(); });
    apply();
  }

  function fail(r) { if (r && r.error) { U.toast("Erro: " + r.error.message); return true; } return false; }
  function ddmm(d) { return d ? String(d).slice(0, 10).split("-").reverse().join("/") : ""; }

  async function render() {
    shell('<div class="empty">Carregando…</div>'); try { localStorage.setItem("adm-tab", tab); } catch (e) {}
    var p = document.getElementById("panel");
    try { await VIEWS[tab](p); if (p.innerHTML.indexOf("Carregando…") > -1 && p.children.length === 1) p.innerHTML = '<div class="warn">Não foi possível carregar agora. Confira a internet e toque na seção de novo.</div>'; mountTools(p); } catch (e) { p.innerHTML = '<div class="warn">Erro ao carregar: ' + esc(e.message || e) + "</div>"; }
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
    var r = await sb.from("bookings").select("*").order("tour_date", { ascending: true }).limit(1000);
    if (fail(r)) return;
    var LD = await D.load(), S = LD.settings;
    var ex = await Promise.all([sb.from("suppliers").select("*").order("name"), sb.from("tour_rates").select("tour_slug,supplier_id,active"), sb.from("tours").select("slug,name,price_pix,active,category,featured,sort")]);
    var sups = ex[0].data || [], rts = ex[1].data || [], allTours = ex[2].data || [];
    var q = (cache.resCode || "").toUpperCase();
    var list = r.data;
    if (q) { var stq = toolState("reservas"); stq.q = q; stq.f.status = ""; stq.f.date = ""; cache.resCode = ""; }
    p.innerHTML =
      (list.map(function (x) {
        var people = x.adults + " ad., " + x.children + " cri., " + x.seniors + " ido.";
        var wa = D.waLink(x.phone, "Olá, " + x.customer_name.split(" ")[0] + "! Sobre sua reserva de " + x.tour_name + " em " + ddmm(x.tour_date) + ":");
        var conf = D.waLink(x.phone, ["✅ Reserva confirmada · " + S.brand + " Passeios", "", "Passeio: " + x.tour_name, "Data: " + ddmm(x.tour_date), "Pessoas: " + people + (x.buggy_cars ? " · Buggy: " + x.buggy_cars : ""), "Busca: " + (x.hotel || "a confirmar"), "Valor: " + D.brl(x.total) + " (" + (x.status === "pendente" ? "a pagar" : "pago") + ")", "Código: #" + x.id, "", "O horário exato da busca vai na véspera. " + (S.cancel_policy || "")].join("\n"));
        var sup = sups.filter(function (z) { return z.id === x.supplier_id; })[0], sl = supLink(x, sup, S);
        var opts = sups.filter(function (z) { return rts.some(function (rt) { return rt.tour_slug === x.tour_slug && rt.supplier_id === z.id && rt.active; }); });
        var fin = x.net_total == null ? '<p class="small" style="color:var(--ruim)">Sem net: escolha a empresa (o net precisa estar cadastrado em Empresas e net).</p>' :
          '<p class="small muted">Net ' + D.brl(x.net_total) + " · sinal " + D.brl(x.deposit) + " · receber no embarque " + D.brl(x.collect_at_boarding) + " · acerto " + (Number(x.supplier_settlement) >= 0 ? "empresa devolve " : "pagar à empresa ") + D.brl(Math.abs(x.supplier_settlement)) + " · <b>lucro " + D.brl(x.profit) + "</b>" + (x.floor_applied ? " · desconto limitado pelo mínimo" : "") + (x.source ? " · origem " + esc(x.source) : "") + "</p>";
        return '<div class="item" data-row data-name="' + esc(x.customer_name) + '" data-search="' + esc([x.code, x.customer_name, x.phone, x.hotel, x.tour_name, x.coupon, sup ? sup.name : ""].join(" ")) + '" data-status="' + x.status + '" data-date="' + x.tour_date + '" data-created="' + esc(x.created_at) + '" data-value="' + x.total + '" data-tour="' + esc(x.tour_slug) + '" data-tour-label="' + esc(x.tour_name) + '" data-sup="' + (x.supplier_id || "") + '" data-sup-label="' + esc(sup ? sup.name : "") + '"><div class="item-head"><div><h3>' + esc(x.tour_name) + " · " + ddmm(x.tour_date) + '</h3><p class="small muted">' + esc(x.code || "#" + x.id) + " · feita em " + ddmm(x.created_at) + (x.lang && x.lang !== "pt" ? " · idioma " + esc(x.lang.toUpperCase()) : "") + "</p></div><span class=\"st st-" + x.status + '">' + STATUS_TXT[x.status] + "</span></div>" +
          '<p class="small"><b>' + esc(x.customer_name) + "</b> · " + esc(x.phone) + (x.hotel ? " · Busca: " + esc(x.hotel) : "") + "</p>" +
          '<p class="small">' + (x.kind === "priv" ? "Privativo" : "Em grupo") + " · " + people + (x.buggy_cars ? " · Buggy: " + x.buggy_cars : "") + (x.coupon ? " · Cupom " + esc(x.coupon) : "") + " · <b>" + D.brl(x.total) + "</b> " + (x.pay_method === "pix" ? "Pix" : "cartão") + "</p>" +
          fin + '<div class="row small"><label for="sup' + x.id + '">Empresa</label><select id="sup' + x.id + '" data-sup="' + x.id + '" style="width:auto"><option value="">' + (opts.length ? "Escolher…" : "Nenhuma com net") + "</option>" + opts.map(function (z) { return '<option value="' + z.id + '"' + (z.id === x.supplier_id ? " selected" : "") + ">" + esc(z.name) + "</option>"; }).join("") + "</select>" +
          (sl ? '<a class="btn btn-mar" href="' + sl + '" target="_blank" rel="noopener" data-sent="' + x.id + '">Enviar à empresa</a>' : "") + (x.sent_to_supplier_at ? "<span>✓ enviada</span>" : "") + "</div>" +
          (x.status === "realizado" ? '<div class="row small"><a class="btn btn-ghost" href="' + reviewLink(x, S) + '" target="_blank" rel="noopener" data-review="' + x.id + '">Pedir avaliação</a><a class="btn btn-ghost" href="' + offerLink(x, S, allTours) + '" target="_blank" rel="noopener" data-offer="' + x.id + '">Oferecer próximo passeio</a>' + (x.review_asked_at ? "<span>✓ avaliação pedida</span>" : "") + (x.offer_sent_at ? "<span>✓ oferta enviada</span>" : "") + "</div>" : "") +
          '<div class="row"><select data-status="' + x.id + '" style="width:auto">' + STATUS.map(function (s) { return '<option value="' + s + '"' + (s === x.status ? " selected" : "") + ">" + STATUS_TXT[s] + "</option>"; }).join("") + "</select>" +
          (conf ? '<a class="btn btn-mar" href="' + conf + '" target="_blank" rel="noopener">Mandar confirmação</a>' : "") +
          (wa ? '<a class="btn btn-ghost" href="' + wa + '" target="_blank" rel="noopener">WhatsApp do cliente</a>' : "") +
          '<button class="btn btn-ghost" type="button" data-note="' + x.id + '">Anotação</button></div>' + (x.notes ? '<p class="small muted">📝 ' + esc(x.notes) + "</p>" : "") + "</div>";
      }).join("") || '<div class="empty">Nenhuma reserva aqui.</div>');
    p.querySelectorAll("[data-sup]").forEach(function (sl) { sl.addEventListener("change", async function () { if (!sl.value) return; var u = await sb.rpc("assign_supplier", { p_booking: Number(sl.dataset.sup), p_supplier: Number(sl.value) }); if (!fail(u)) { U.toast("Empresa definida e acerto recalculado."); render(); } }); });
    p.querySelectorAll("[data-sent]").forEach(function (a) { a.addEventListener("click", function () { stamp(a.dataset.sent, { sent_to_supplier_at: new Date().toISOString() }).then(function () { setTimeout(render, 400); }); }); });
    p.querySelectorAll("[data-review]").forEach(function (a) { a.addEventListener("click", function () { stamp(a.dataset.review, { review_asked_at: new Date().toISOString() }); }); });
    p.querySelectorAll("[data-offer]").forEach(function (a) { a.addEventListener("click", function () { stamp(a.dataset.offer, { offer_sent_at: new Date().toISOString() }); }); });
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
    var r = await sb.from("tours").select("slug,name,price_card,price_pix,price_private,per_vehicle,active,extras,category,sort").order("sort");
    if (fail(r)) return;
    p.innerHTML = '<p class="note">Revise e toque em Salvar tudo. Pix normalmente fica de 5% a 10% abaixo do cartão. O privativo é o preço do veículo inteiro.</p>' +
      r.data.map(function (t) {
        var bug = (t.extras || []).filter(function (e) { return e.buggy; })[0];
        return '<div class="item" data-row data-slug="' + esc(t.slug) + '" data-name="' + esc(t.name) + '" data-status="' + (t.active ? "on" : "off") + '" data-cat="' + esc(t.category) + '" data-price="' + t.price_pix + '" data-sort="' + t.sort + '"><div class="item-head"><h3>' + esc(t.name) + "</h3>" + (t.active ? "" : '<span class="st st-cancelado">Oculto</span>') + '</div><div class="formgrid">' +
          f("pc_" + t.slug, "Cartão (R$)" + (t.per_vehicle ? " por veículo" : " por pessoa"), t.price_card, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
          f("pp_" + t.slug, "Pix (R$)", t.price_pix, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
          (t.per_vehicle ? "" : f("pv_" + t.slug, "Privativo por veículo (vazio = não oferece)", t.price_private == null ? "" : t.price_private, "", 'type="number" step="0.01" min="0" inputmode="decimal"')) +
          (bug ? f("pb_" + t.slug, "Buggy por carro (R$)", bug.price, "", 'type="number" step="0.01" min="0" inputmode="decimal"') : "") +
          "</div></div>";
      }).join("") + '<div class="row" style="position:sticky;bottom:0;background:var(--bg);padding-block:10px"><button class="btn btn-mar" type="button" id="saveAll" style="flex:1">Salvar tudo</button></div>';
    document.getElementById("saveAll").addEventListener("click", async function () {
      var btn = this; btn.disabled = true; btn.textContent = "Salvando…"; var errs = 0, saved = 0, msgs = [];
      for (var i = 0; i < r.data.length; i++) {
        var t = r.data[i], v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : null; };
        var row = { price_card: Number(v("pc_" + t.slug)) || 0, price_pix: Number(v("pp_" + t.slug)) || 0, updated_at: new Date().toISOString() };
        if (!t.per_vehicle) row.price_private = v("pv_" + t.slug) === "" ? null : Number(v("pv_" + t.slug));
        if (v("pb_" + t.slug) !== null) row.extras = (t.extras || []).map(function (e) { return e.buggy ? Object.assign({}, e, { price: Number(v("pb_" + t.slug)) || 0 }) : e; });
        var changed = Number(row.price_card) !== Number(t.price_card) || Number(row.price_pix) !== Number(t.price_pix) || ("price_private" in row && String(row.price_private) !== String(t.price_private)) || (row.extras && JSON.stringify(row.extras) !== JSON.stringify(t.extras));
        if (!changed) continue;
        var u = await sb.from("tours").update(row).eq("slug", t.slug); if (u.error) { errs++; msgs.push(u.error.message); } else { Object.assign(t, row); saved++; }
      }
      btn.disabled = false; btn.textContent = "Salvar tudo";
      U.toast(errs ? msgs[0] + (errs > 1 ? " (+" + (errs - 1) + ")" : "") : saved ? saved + " preço(s) salvo(s). O site já mostra os novos valores." : "Nada mudou.");
    });
  };

  VIEWS.passeios = async function (p) {
    var r = await sb.from("tours").select("*").order("sort");
    if (fail(r)) return;
    if (cache.editTour !== undefined) return tourForm(p, cache.editTour ? r.data.filter(function (x) { return x.slug === cache.editTour; })[0] : null);
    p.innerHTML = '<div class="row"><button class="btn btn-mar" type="button" id="newTour">+ Novo passeio</button></div>' +
      r.data.map(function (t) {
        return '<div class="item trow" data-row data-name="' + esc(t.name) + '" data-status="' + (t.active ? "on" : "off") + '" data-cat="' + esc(t.category) + '" data-price="' + t.price_pix + '" data-sort="' + t.sort + '"><div class="item-head"><div style="display:flex;gap:12px;align-items:center">' + ((t.photos || [])[0] ? '<img class="thumb" src="' + esc(t.photos[0].url) + '" alt="" loading="lazy">' : '<span class="thumb"></span>') + "<div><h3>" + esc(t.name) + '</h3><p class="small muted">' + esc(t.category) + " · " + D.brl(t.price_pix) + " no Pix · " + D.brl(t.price_card) + " cartão</p></div></div>" +
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
    b.data.forEach(function (x) { if (["pago", "confirmado", "realizado"].indexOf(x.status) < 0) return; var k = String(x.coupon || "").toUpperCase(); stats[k] = stats[k] || { n: 0, v: 0 }; stats[k].n++; stats[k].v += Number(x.total || 0); });
    var site = location.origin + location.pathname.replace(/admin\.html$/, "");
    p.innerHTML = '<div class="item"><h3>Novo cupom</h3><form id="cf" class="formgrid">' +
      f("c_code", "Código (ex.: BRUNO)", "") + f("c_agent", "Nome do agente", "") +
      f("c_disc", "Desconto do cliente (%)", 5, "", 'type="number" step="0.5" min="0" max="50"') + f("c_comm", "Comissão do agente (%)", 8, "", 'type="number" step="0.5" min="0" max="50"') +
      f("c_leader", "Líder (opcional)", "") + f("c_lpct", "Comissão do líder (%)", 0, "", 'type="number" step="0.5" min="0" max="20"') +
      '<div class="row full"><button class="btn btn-mar" type="submit">Criar cupom</button></div></form><p class="note">Comissões são calculadas só sobre reservas pagas, confirmadas ou realizadas.</p></div>' +
      r.data.map(function (c) {
        var s = stats[c.code.toUpperCase()] || { n: 0, v: 0 };
        var link = site + "?cupom=" + encodeURIComponent(c.code);
        return '<div class="item" data-row data-name="' + esc(c.code) + '" data-search="' + esc(c.code + " " + c.agent_name + " " + (c.leader || "")) + '" data-status="' + (c.active ? "on" : "off") + '" data-value="' + s.v + '"><div class="item-head"><div><h3>' + esc(c.code) + " · " + esc(c.agent_name) + '</h3><p class="small muted">Cliente ganha ' + c.discount_pct + "% · agente ganha " + c.commission_pct + "%" + (c.leader ? " · líder " + esc(c.leader) + " ganha " + c.leader_pct + "%" : "") + '</p></div><span class="st ' + (c.active ? "st-pago" : "st-cancelado") + '">' + (c.active ? "Ativo" : "Pausado") + "</span></div>" +
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
      return '<div class="item" data-row data-name="' + esc(x.name) + '" data-status="' + esc(x.status) + '" data-created="' + esc(x.created_at) + '"><div class="item-head"><div><h3>' + esc(x.name) + '</h3><p class="small muted">' + esc(x.role) + " · " + esc(x.phone) + " · " + ddmm(x.created_at) + "</p></div><span class=\"st " + (x.status === "novo" ? "st-pendente" : "st-pago") + '">' + esc(x.status) + "</span></div>" +
        '<div class="row">' + (wa ? '<a class="btn btn-ghost" href="' + wa + '" target="_blank" rel="noopener">Chamar no WhatsApp</a>' : "") + '<button class="btn btn-ghost" type="button" data-done="' + x.id + '">Marcar como atendido</button></div></div>';
    }).join("") || '<div class="empty">Nenhum pedido de parceria ainda.</div>';
    p.querySelectorAll("[data-done]").forEach(function (b) { b.addEventListener("click", async function () { var u = await sb.from("partner_requests").update({ status: "atendido" }).eq("id", b.dataset.done); if (!fail(u)) render(); }); });
  };

  VIEWS.contatos = async function (p) {
    var r = await sb.from("leads").select("*").order("created_at", { ascending: false });
    if (fail(r)) return;
    p.innerHTML = '<div class="row"><button class="btn btn-ghost" type="button" id="copyAll">Copiar todos os números</button><span class="muted small">' + r.data.length + " contatos da lista de promoções</span></div>" +
      r.data.map(function (x) { return '<div class="item small" data-row data-created="' + esc(x.created_at) + '"><div class="row"><b>' + esc(x.phone) + '</b><span class="muted">' + ddmm(x.created_at) + "</span></div></div>"; }).join("");
    document.getElementById("copyAll").addEventListener("click", function () { var t = r.data.map(function (x) { return x.phone; }).join("\n"); if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { U.toast("Números copiados."); }); });
  };

  function simpleCrud(table, fields, title) {
    return async function (p) {
      var r = await sb.from(table).select("*").order("sort");
      if (fail(r)) return;
      p.innerHTML = '<div class="item"><h3>Adicionar ' + title + '</h3><form id="nf" class="formgrid">' + fields.map(function (x) { return x[2] === "ta" ? ta("n_" + x[0], x[1], "") : f("n_" + x[0], x[1], ""); }).join("") + '<div class="row full"><button class="btn btn-mar" type="submit">Adicionar</button></div></form></div>' +
        r.data.map(function (x) {
          return '<div class="item" data-row data-id="' + x.id + '" data-name="' + esc(x[fields[0][0]]) + '" data-sort="' + x.sort + '" data-status="' + (x.published ? "on" : "off") + '" data-search="' + esc(fields.map(function (fl) { return x[fl[0]]; }).join(" ")) + '"><div class="formgrid">' + fields.map(function (fl) { return fl[2] === "ta" ? ta("e" + x.id + "_" + fl[0], fl[1], x[fl[0]]) : f("e" + x.id + "_" + fl[0], fl[1], x[fl[0]]); }).join("") +
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

  // ===== Operação, empresas, net e financeiro (regra: docs/alma-do-negocio.md) =====
  var DEFAULT_TPL = "Nova reserva {marca} · {codigo}\nPasseio: {passeio}\nData: {data}\nCliente: {cliente} · {telefone}\nBusca: {hotel}\nPessoas: {pessoas}\nReceber do cliente no embarque: {cobrar}\nObs.: {obs}";
  async function bizData() { var r = await sb.from("biz_settings").select("data").eq("id", 1).maybeSingle(); return (r.data && r.data.data) || {}; }
  function pax(x) { return x.adults + " adulto(s)" + (x.children ? ", " + x.children + " criança(s)" : "") + (x.seniors ? ", " + x.seniors + " idoso(s)" : ""); }
  function people(x) { return (x.adults || 0) + (x.children || 0) + (x.seniors || 0); }
  function fillTpl(tpl, x, S) {
    var v = { marca: S.brand || "Maré Tur", codigo: x.code || ("#" + x.id), passeio: x.tour_name, data: ddmm(x.tour_date), cliente: x.customer_name, telefone: x.phone, hotel: x.hotel || "a confirmar com o cliente",
      pessoas: pax(x), cobrar: D.brl(x.collect_at_boarding == null ? x.total : x.collect_at_boarding), total: D.brl(x.total), obs: x.notes || "—" };
    return String(tpl || DEFAULT_TPL).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; });
  }
  function supLink(x, sup, S) { return sup && sup.whatsapp ? D.waLink(sup.whatsapp, fillTpl(sup.msg_template, x, S)) : ""; }
  function remindLink(x, S) {
    return D.waLink(x.phone, ["Olá, " + x.customer_name.split(" ")[0] + "! Amanhã é dia de " + x.tour_name + " 🌊", "", "Reserva: " + (x.code || "#" + x.id),
      "Busca: " + (x.hotel || "confirme seu hotel respondendo esta mensagem"), "O horário exato da busca chega por aqui. Leve protetor solar, roupa de banho e documento com foto.",
      x.collect_at_boarding ? "No embarque: " + D.brl(x.collect_at_boarding) + " (dinheiro, Pix ou cartão)." : "", "", "Qualquer dúvida é só responder. " + (S.brand || "")].filter(function (l, i, a) { return l || a[i - 1]; }).join("\n"));
  }
  function reviewLink(x, S) {
    return D.waLink(x.phone, "Olá, " + x.customer_name.split(" ")[0] + "! Como foi o passeio de " + x.tour_name + "? Sua avaliação ajuda muito outros viajantes" + (S.google_review_url ? ": " + S.google_review_url : ". Pode responder aqui mesmo com uma nota de 1 a 5.") + " Obrigado! " + (S.brand || ""));
  }
  function offerLink(x, S, tours) {
    var site = location.origin + location.pathname.replace(/admin\.html$/, "");
    var picks = tours.filter(function (t) { return t.slug !== x.tour_slug && t.active && t.category !== "transfers"; }).sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sort - b.sort; }).slice(0, 3);
    var cup = S.followup_coupon ? "?cupom=" + encodeURIComponent(S.followup_coupon) : "";
    return D.waLink(x.phone, ["Olá, " + x.customer_name.split(" ")[0] + "! Que bom ter você com a gente no " + x.tour_name + ". Para os próximos dias em Fortaleza:", ""].concat(picks.map(function (t) { return "• " + t.name + " · " + D.brl(t.price_pix) + " no Pix\n  " + site + U.tourUrl(t.slug) + cup; })).concat(S.followup_coupon ? ["", "Com o cupom " + S.followup_coupon + " você tem desconto de cliente da casa."] : []).join("\n"));
  }
  async function stamp(id, patch) { var u = await sb.from("bookings").update(patch).eq("id", id); return !fail(u); }

  VIEWS.operacao = async function (p) {
    var tz = new Date(Date.now() - 3 * 3600e3), today = tz.toISOString().slice(0, 10), tmr = new Date(tz.getTime() + 864e5).toISOString().slice(0, 10);
    var day = cache.opDay || tmr;
    var S = (await D.load()).settings;
    var res = await Promise.all([sb.from("bookings").select("*").eq("tour_date", day).neq("status", "cancelado").order("tour_name"), sb.from("suppliers").select("*").order("name")]);
    if (fail(res[0]) || fail(res[1])) return;
    var sups = {}; res[1].data.forEach(function (s) { sups[s.id] = s; });
    var groups = {}; res[0].data.forEach(function (x) { var k = x.supplier_id || 0; (groups[k] = groups[k] || []).push(x); });
    var total = res[0].data.reduce(function (a, x) { return a + people(x); }, 0);
    p.innerHTML = '<div class="row"><button class="btn ' + (day === today ? "btn-mar" : "btn-ghost") + '" type="button" data-day="' + today + '">Hoje</button><button class="btn ' + (day === tmr ? "btn-mar" : "btn-ghost") + '" type="button" data-day="' + tmr + '">Amanhã</button><input type="date" id="opDay" value="' + day + '" style="width:auto"><span class="muted small">' + res[0].data.length + " reservas · " + total + " pessoas</span></div>" +
      '<p class="note">Fluxo do dia: 1) enviar cada reserva (ou a lista) à empresa; 2) lembrete ao cliente na véspera; 3) de manhã, marcar quem embarcou. Depois do embarque, o passeio é com a empresa.</p>' +
      (Object.keys(groups).map(function (k) {
        var sup = sups[k], list = groups[k];
        var all = sup && sup.whatsapp ? D.waLink(sup.whatsapp, ["Lista " + (S.brand || "") + " · " + ddmm(day), ""].concat(list.map(function (x, i) { return (i + 1) + ") " + fillTpl("{codigo} · {passeio} · {cliente} {telefone} · {hotel} · {pessoas} · receber {cobrar}", x, S); })).join("\n")) : "";
        return '<div class="item"><div class="item-head"><h3>' + (sup ? esc(sup.name) : "⚠ Sem empresa definida") + '</h3><span class="muted small">' + list.length + " reservas</span></div>" +
          (all ? '<div class="row"><a class="btn btn-ghost" href="' + all + '" target="_blank" rel="noopener" data-sendall="' + k + '">Enviar lista do dia à empresa</a></div>' : sup ? '<p class="warn small">Cadastre o WhatsApp de ' + esc(sup.name) + " em Empresas e net.</p>" : '<p class="warn small">Defina a empresa de cada reserva em Reservas.</p>') +
          list.map(function (x) {
            var sl = supLink(x, sup, S), rl = remindLink(x, S);
            return '<div class="item" style="background:var(--bg)"><div class="item-head"><div><b>' + esc(x.code || "#" + x.id) + " · " + esc(x.tour_name) + '</b><p class="small">' + esc(x.customer_name) + " · " + esc(x.phone) + " · " + esc(x.hotel || "sem hotel") + " · " + pax(x) + '</p><p class="small muted">Receber no embarque: <b>' + D.brl(x.collect_at_boarding == null ? x.total : x.collect_at_boarding) + "</b> · " + STATUS_TXT[x.status] + "</p></div>" +
              '<div class="small">' + (x.sent_to_supplier_at ? "✓ enviada à empresa<br>" : "") + (x.reminder_sent_at ? "✓ lembrete enviado<br>" : "") + (x.boarded_at ? "<b style=\"color:var(--bom)\">✓ embarcou</b>" : x.no_show ? '<b style="color:var(--ruim)">não apareceu</b>' : "") + "</div></div>" +
              '<div class="row">' + (sl ? '<a class="btn btn-mar" href="' + sl + '" target="_blank" rel="noopener" data-sent="' + x.id + '">Enviar à empresa</a>' : "") +
              (rl ? '<a class="btn btn-ghost" href="' + rl + '" target="_blank" rel="noopener" data-remind="' + x.id + '">Lembrete ao cliente</a>' : "") +
              '<button class="btn btn-ghost" type="button" data-board="' + x.id + '">Embarcou</button><button class="btn btn-ghost" type="button" data-noshow="' + x.id + '">Não apareceu</button></div></div>';
          }).join("") + "</div>";
      }).join("") || '<div class="empty">Nenhuma reserva para ' + ddmm(day) + ".</div>");
    p.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { cache.opDay = b.dataset.day; render(); }); });
    document.getElementById("opDay").addEventListener("change", function (e) { cache.opDay = e.target.value; render(); });
    p.querySelectorAll("[data-sent]").forEach(function (a) { a.addEventListener("click", function () { stamp(a.dataset.sent, { sent_to_supplier_at: new Date().toISOString() }).then(function () { setTimeout(render, 400); }); }); });
    p.querySelectorAll("[data-sendall]").forEach(function (a) { a.addEventListener("click", function () { var ids = (groups[a.dataset.sendall] || []).map(function (x) { return x.id; }); sb.from("bookings").update({ sent_to_supplier_at: new Date().toISOString() }).in("id", ids).then(function () { setTimeout(render, 400); }); }); });
    p.querySelectorAll("[data-remind]").forEach(function (a) { a.addEventListener("click", function () { stamp(a.dataset.remind, { reminder_sent_at: new Date().toISOString() }).then(function () { setTimeout(render, 400); }); }); });
    p.querySelectorAll("[data-board]").forEach(function (b) { b.addEventListener("click", async function () { if (await stamp(b.dataset.board, { boarded_at: new Date().toISOString(), no_show: false, status: "realizado" })) { U.toast("Embarque confirmado."); render(); } }); });
    p.querySelectorAll("[data-noshow]").forEach(function (b) { b.addEventListener("click", async function () { if (await stamp(b.dataset.noshow, { no_show: true, boarded_at: null })) { U.toast("Marcado como não compareceu."); render(); } }); });
  };

  VIEWS.empresas = async function (p) {
    var res = await Promise.all([sb.from("suppliers").select("*").order("name"), sb.from("tour_rates").select("*"), sb.from("tours").select("slug,name,price_pix,price_card,active,sort,capacity_per_day").order("sort"), bizData()]);
    if (fail(res[0]) || fail(res[1]) || fail(res[2])) return;
    var sups = res[0].data, rates = res[1].data, tours = res[2].data, B = res[3];
    var AD = Number(B.ad_cost_per_pax || 0), MM = Number(B.min_margin_per_pax || 0), FEE = Number(B.card_fee_pct || 0);
    var only = cache.netTour || "";
    p.innerHTML = '<div class="item"><h3>Empresas parceiras</h3><p class="small muted">Quem opera os passeios. O WhatsApp é para onde vai o botão "Enviar à empresa". No modelo da mensagem dá para usar {marca} {codigo} {passeio} {data} {cliente} {telefone} {hotel} {pessoas} {cobrar} {total} {obs}.</p>' +
      sups.map(function (s) {
        return '<div class="item" style="background:var(--bg)"><div class="formgrid">' + f("su" + s.id + "_name", "Nome", s.name) + f("su" + s.id + "_whatsapp", "WhatsApp (55 + DDD)", s.whatsapp, "", 'inputmode="tel"') + f("su" + s.id + "_contact_name", "Contato", s.contact_name) + f("su" + s.id + "_pickup_notes", "Observações (horários, ponto de encontro)", s.pickup_notes) +
          ta("su" + s.id + "_msg_template", "Modelo da mensagem para a empresa (vazio = padrão)", s.msg_template) + '<label class="check"><input type="checkbox" id="su' + s.id + '_active"' + (s.active ? " checked" : "") + "> Ativa</label></div>" +
          '<div class="row"><button class="btn btn-mar" type="button" data-ssave="' + s.id + '">Salvar empresa</button><button class="btn btn-danger" type="button" data-sdel="' + s.id + '">Excluir</button></div></div>';
      }).join("") +
      '<form id="sNew" class="row"><input id="sNewName" placeholder="Nome da nova empresa (ex.: Enseada Turismo)" style="flex:1;min-width:200px"><input id="sNewWa" placeholder="WhatsApp 5585..." inputmode="tel" style="width:170px"><button class="btn btn-ghost" type="submit">Adicionar empresa</button></form></div>' +
      '<div class="item"><h3>Net por passeio</h3><p class="small muted">Mínimo = net + anúncio (' + D.brl(AD) + ') + margem mínima (' + D.brl(MM) + ') por pessoa. O site nunca vende abaixo disso: cupom e desconto param no mínimo. A empresa preferida recebe as reservas novas.</p>' +

      tours.filter(function (t) { return !only || t.slug === only; }).map(function (t) {
        var tr = rates.filter(function (r) { return r.tour_slug === t.slug; });
        var pref = tr.filter(function (r) { return r.preferred && r.active; })[0] || tr.filter(function (r) { return r.active; }).sort(function (a, b) { return a.net_adult - b.net_adult; })[0];
        var floor = pref ? Math.ceil(Number(pref.net_adult) + AD + MM) : null, floorCard = pref ? Math.ceil((Number(pref.net_adult) + AD + MM) / (1 - FEE / 100)) : null;
        var margin = pref ? Number(t.price_pix) - Number(pref.net_adult) - AD : null;
        return '<div class="item sub" data-row data-name="' + esc(t.name) + '" data-net="' + (pref ? "com" : "sem") + '" data-status="' + (t.active ? "on" : "off") + '" data-sort="' + t.sort + '" data-margin="' + (margin == null ? -1 : margin) + '"><div class="item-head"><div><h3>' + esc(t.name) + (t.active ? "" : " (oculto)") + '</h3><p class="small muted">Site: ' + D.brl(t.price_pix) + " Pix · " + D.brl(t.price_card) + " cartão" +
          (pref ? " · <b>mínimo " + D.brl(floor) + " Pix / " + D.brl(floorCard) + " cartão</b> · sobra por pessoa " + D.brl(margin) + " (cada sócio " + D.brl(margin * Number(B.partner_split_pct || 50) / 100) + ")" : ' · <b style="color:var(--ruim)">sem net: o site vende sem trava de mínimo</b>') + "</p></div>" +
          '<div class="field" style="width:150px"><label class="label" for="cap_' + esc(t.slug) + '">Vagas por dia</label><input id="cap_' + esc(t.slug) + '" type="number" min="0" placeholder="sem limite" value="' + (t.capacity_per_day == null ? "" : t.capacity_per_day) + '" data-cap="' + esc(t.slug) + '"></div></div>' +
          tr.map(function (r) {
            var s = sups.filter(function (z) { return z.id === r.supplier_id; })[0];
            return '<div class="row small" data-rate="' + r.id + '"><b style="min-width:130px">' + esc(s ? s.name : "?") + "</b>" +
              '<label>Net adulto <input type="number" step="0.01" min="0" value="' + r.net_adult + '" data-k="net_adult" style="width:90px"></label>' +
              '<label>Net criança <input type="number" step="0.01" min="0" value="' + (r.net_child == null ? "" : r.net_child) + '" placeholder="= adulto" data-k="net_child" style="width:90px"></label>' +
              '<label>Net veículo <input type="number" step="0.01" min="0" value="' + (r.net_vehicle == null ? "" : r.net_vehicle) + '" placeholder="—" data-k="net_vehicle" style="width:90px"></label>' +
              '<label class="check"><input type="radio" name="pref_' + esc(t.slug) + '" data-k="preferred"' + (r.preferred ? " checked" : "") + "> Preferida</label>" +
              '<label class="check"><input type="checkbox" data-k="active"' + (r.active ? " checked" : "") + "> Ativo</label>" +
              '<button class="btn btn-mar" type="button" data-rsave="' + r.id + '">Salvar</button><button class="btn btn-danger" type="button" data-rdel="' + r.id + '">Excluir</button></div>';
          }).join("") +
          (sups.length ? '<div class="row small"><select data-newsup="' + esc(t.slug) + '" style="width:auto">' + sups.filter(function (s) { return !tr.some(function (r) { return r.supplier_id === s.id; }); }).map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + "</option>"; }).join("") + '</select><input type="number" step="0.01" min="0" placeholder="Net adulto (R$)" data-newnet="' + esc(t.slug) + '" style="width:150px"><button class="btn btn-ghost" type="button" data-radd="' + esc(t.slug) + '">Adicionar net</button></div>' : '<p class="small muted">Cadastre uma empresa acima para lançar o net.</p>') + "</div>";
      }).join("") + "</div>";

    document.getElementById("sNew").addEventListener("submit", async function (e) { e.preventDefault(); var n = document.getElementById("sNewName").value.trim(); if (!n) return U.toast("Digite o nome da empresa."); var i = await sb.from("suppliers").insert({ name: n, whatsapp: document.getElementById("sNewWa").value.replace(/\D/g, "") }); if (!fail(i)) { U.toast("Empresa adicionada."); render(); } });
    p.querySelectorAll("[data-ssave]").forEach(function (b) { b.addEventListener("click", async function () {
      var id = b.dataset.ssave, g = function (k) { return document.getElementById("su" + id + "_" + k); };
      var u = await sb.from("suppliers").update({ name: g("name").value.trim(), whatsapp: g("whatsapp").value.replace(/\D/g, ""), contact_name: g("contact_name").value.trim(), pickup_notes: g("pickup_notes").value.trim(), msg_template: g("msg_template").value.trim(), active: g("active").checked }).eq("id", id);
      if (!fail(u)) U.toast("Empresa salva."); }); });
    p.querySelectorAll("[data-sdel]").forEach(function (b) { b.addEventListener("click", async function () { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toque de novo: apaga a empresa e os nets dela"; return; } var u = await sb.from("suppliers").delete().eq("id", b.dataset.sdel); if (!fail(u)) render(); }); });
    p.querySelectorAll("[data-cap]").forEach(function (inp) { inp.addEventListener("change", async function () { var v = inp.value === "" ? null : Math.max(0, parseInt(inp.value, 10) || 0); var u = await sb.from("tours").update({ capacity_per_day: v }).eq("slug", inp.dataset.cap); if (!fail(u)) U.toast(v == null ? "Sem limite de vagas." : "Limite de " + v + " vagas por dia salvo."); }); });
    p.querySelectorAll("[data-radd]").forEach(function (b) { b.addEventListener("click", async function () {
      var slug = b.dataset.radd, sel = p.querySelector('[data-newsup="' + slug + '"]'), net = p.querySelector('[data-newnet="' + slug + '"]');
      if (!sel.value || net.value === "") return U.toast("Escolha a empresa e digite o net.");
      var first = !rates.some(function (r) { return r.tour_slug === slug && r.preferred && r.active; });
      var i = await sb.from("tour_rates").insert({ tour_slug: slug, supplier_id: Number(sel.value), net_adult: Number(net.value), preferred: first }); if (!fail(i)) { U.toast("Net salvo."); render(); } }); });
    p.querySelectorAll("[data-rsave]").forEach(function (b) { b.addEventListener("click", async function () {
      var row = b.closest("[data-rate]"), id = Number(b.dataset.rsave), v = function (k) { return row.querySelector('[data-k="' + k + '"]'); };
      var r0 = rates.filter(function (r) { return r.id === id; })[0];
      var upd = { net_adult: Number(v("net_adult").value), net_child: v("net_child").value === "" ? null : Number(v("net_child").value), net_vehicle: v("net_vehicle").value === "" ? null : Number(v("net_vehicle").value), preferred: v("preferred").checked, active: v("active").checked, updated_at: new Date().toISOString() };
      if (upd.preferred) { var c = await sb.from("tour_rates").update({ preferred: false }).eq("tour_slug", r0.tour_slug).neq("id", id); if (fail(c)) return; }
      var u = await sb.from("tour_rates").update(upd).eq("id", id); if (!fail(u)) { U.toast("Net salvo."); render(); } }); });
    p.querySelectorAll("[data-rdel]").forEach(function (b) { b.addEventListener("click", async function () { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toque de novo"; return; } var u = await sb.from("tour_rates").delete().eq("id", b.dataset.rdel); if (!fail(u)) render(); }); });
  };

  VIEWS.financeiro = async function (p) {
    var month = cache.finMonth || new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7);
    var y = +month.slice(0, 4), m = +month.slice(5, 7), end = (m === 12 ? (y + 1) + "-01" : y + "-" + String(m + 1).padStart(2, "0")) + "-01";
    var res = await Promise.all([sb.from("bookings").select("*").gte("tour_date", month + "-01").lt("tour_date", end).neq("status", "cancelado"), sb.from("suppliers").select("id,name"), bizData(),
      sb.from("bookings").select("*").is("settlement_done_at", null).not("boarded_at", "is", null).neq("supplier_settlement", 0)]);
    if (fail(res[0]) || fail(res[1]) || fail(res[3])) return;
    var B = res[2], partner = B.partner_name || "Sócio", owner = B.owner_name || "Pablo";
    var sname = {}; res[1].data.forEach(function (s) { sname[s.id] = s.name; });
    var sold = res[0].data.filter(function (x) { return ["pago", "confirmado", "realizado"].indexOf(x.status) > -1 && !x.no_show; });
    var sum = function (k, l) { return (l || sold).reduce(function (a, x) { return a + Number(x[k] || 0); }, 0); };
    var noNet = sold.filter(function (x) { return x.net_total == null; });
    var profit = sum("profit"), share = sum("partner_share");
    var open = res[3].data, byS = {};
    open.forEach(function (x) { var k = x.supplier_id || 0; (byS[k] = byS[k] || []).push(x); });
    p.innerHTML = '<div class="row"><label class="label" for="finM">Mês dos passeios</label><input type="month" id="finM" value="' + month + '" style="width:auto"><span class="muted small">' + sold.length + " vendas pagas · " + res[0].data.filter(function (x) { return x.status === "pendente"; }).length + " esperando pagamento</span></div>" +
      '<div class="kpis"><div class="kpi"><b class="num">' + D.brl(sum("total")) + '</b><span>vendido</span></div><div class="kpi"><b class="num">' + D.brl(sum("net_total")) + '</b><span>net das empresas</span></div>' +
      '<div class="kpi"><b class="num">' + D.brl(sum("ad_cost")) + '</b><span>anúncio (estimado)</span></div><div class="kpi"><b class="num">' + D.brl(sum("commission") + sum("card_fee")) + "</b><span>comissões e taxa de cartão</span></div></div>" +
      '<div class="kpis"><div class="kpi"><b class="num">' + D.brl(profit) + '</b><span>lucro</span></div><div class="kpi"><b class="num">' + D.brl(share) + "</b><span>" + esc(partner) + '</span></div><div class="kpi"><b class="num">' + D.brl(profit - share) + "</b><span>" + esc(owner) + '</span></div><div class="kpi"><b class="num">' + sum("adults") + "/" + (sum("adults") + sum("children") + sum("seniors")) + "</b><span>adultos / passageiros</span></div></div>" +
      (noNet.length ? '<p class="warn">' + noNet.length + " venda(s) sem net cadastrado ficaram fora do lucro: " + noNet.map(function (x) { return esc(x.code || "#" + x.id); }).join(", ") + ". Cadastre o net em Empresas e net e escolha a empresa na reserva.</p>" : "") +
      '<div class="item"><h3>Acertos com as empresas</h3><p class="small muted">Depois do embarque: a empresa cobra do cliente, fica com o net e devolve a diferença (positivo). Negativo = a Maré Tur deve pagar o net à empresa (cliente pagou tudo antes, no cartão).</p>' +
      (Object.keys(byS).map(function (k) {
        var l = byS[k], tot = sum("supplier_settlement", l);
        return '<div class="item" style="background:var(--bg)"><div class="item-head"><h3>' + esc(sname[k] || "Sem empresa") + '</h3><b class="num" style="color:' + (tot >= 0 ? "var(--bom)" : "var(--ruim)") + '">' + (tot >= 0 ? "a receber " : "a pagar ") + D.brl(Math.abs(tot)) + "</b></div>" +
          l.map(function (x) { var v = Number(x.supplier_settlement); return '<div class="row small"><span>' + esc(x.code || "#" + x.id) + " · " + ddmm(x.tour_date) + " · " + esc(x.customer_name) + "</span><b>" + (v >= 0 ? "receber " : "pagar ") + D.brl(Math.abs(v)) + '</b><button class="btn btn-ghost" type="button" data-settle="' + x.id + '">Acertado</button></div>'; }).join("") + "</div>";
      }).join("") || '<p class="muted">Nenhum acerto em aberto.</p>') + "</div>";
    document.getElementById("finM").addEventListener("change", function (e) { cache.finMonth = e.target.value; render(); });
    p.querySelectorAll("[data-settle]").forEach(function (b) { b.addEventListener("click", async function () { if (await stamp(b.dataset.settle, { settlement_done_at: new Date().toISOString() })) { U.toast("Acerto registrado."); render(); } }); });
  };

  VIEWS.config = async function (p) {
    var r = await sb.from("settings").select("data").eq("id", 1).maybeSingle();
    if (fail(r)) return;
    var s = Object.assign({}, D.SEED.settings, (r.data && r.data.data) || {});
    var F = [["brand", "Nome da marca"], ["brand_sub", "Linha abaixo do nome"], ["whatsapp", "WhatsApp de atendimento (com 55 e DDD)"], ["instagram", "Instagram (sem @)"],
      ["pix_key", "Chave Pix"], ["pix_name", "Nome que aparece no Pix"], ["hero_eyebrow", "Selo da capa"], ["hero_title", "Título da capa"],
      ["rating_value", "Nota real do Google (deixe vazio até ter)"], ["rating_count", "Quantidade real de avaliações (vazio esconde as notas)"], ["pack_discount_pct", "Desconto de pacote (%)", "n"], ["deposit_per_person", "Sinal por pessoa (R$)", "n"],
      ["child_factor", "Criança paga (0,5 = meia)", "n"], ["footer_note", "Rodapé"],
      ["cutoff_hour", "Horário de corte das saídas do dia seguinte (0 a 23)", "n"], ["google_review_url", "Link de avaliação no Google"], ["followup_coupon", "Cupom para cliente da casa (pós-venda)"]];
    var BZ = await bizData();
    var BF = [["partner_name", "Nome do sócio operador"], ["owner_name", "Seu nome"], ["partner_split_pct", "Parte do sócio no lucro (%)", "n"], ["ad_cost_per_pax", "Custo de anúncio por passageiro (R$)", "n"],
      ["min_margin_per_pax", "Margem mínima por passageiro (R$)", "n"], ["card_fee_pct", "Taxa do cartão (%)", "n"], ["ops_whatsapp", "WhatsApp do sócio operador"], ["notify_topic", "Canal de aviso no celular (ntfy)"], ["admin_url", "Endereço do painel"]];
    p.innerHTML = '<div class="item"><h3>Configurações do site</h3><form id="sf" class="formgrid">' +
      F.map(function (x) { return f("s_" + x[0], x[1], s[x[0]], "", x[2] === "n" ? 'type="number" step="0.01"' : ""); }).join("") +
      ta("s_hero_promises", "Promessas da capa (uma por linha)", (s.hero_promises || []).join("\n")) + ta("s_cancel_policy", "Regra de cancelamento e chuva", s.cancel_policy) +
      '<div class="row full"><button class="btn btn-mar" type="submit">Salvar configurações</button></div></form></div>' +
      '<div class="item"><h3>Regras do negócio (só administradores veem)</h3><p class="small muted">Base do preço mínimo e da divisão do lucro. Aviso de nova reserva: instale o app ntfy no celular e assine o canal abaixo (grátis, sem cadastro). O aviso não leva nome nem telefone do cliente.</p><form id="bf" class="formgrid">' +
      BF.map(function (x) { return f("b_" + x[0], x[1], BZ[x[0]], "", x[2] === "n" ? 'type="number" step="0.01"' : ""); }).join("") +
      '<div class="row full"><button class="btn btn-mar" type="submit">Salvar regras</button>' + (BZ.notify_topic ? '<a class="btn btn-ghost" href="https://ntfy.sh/' + encodeURIComponent(BZ.notify_topic) + '" target="_blank" rel="noopener">Abrir canal de aviso</a>' : "") + '<button class="btn btn-ghost" type="button" id="ntest">Mandar aviso de teste</button></div></form></div>' +
      '<div class="item"><h3>Administradores</h3><p class="small muted">E-mails que podem entrar neste painel.</p><div id="admins"></div><form id="af" class="row"><input id="newAdmin" type="email" placeholder="email@exemplo.com" style="flex:1;min-width:200px"><button class="btn btn-ghost" type="submit">Adicionar</button></form></div>';
    document.getElementById("sf").addEventListener("submit", async function (e) {
      e.preventDefault(); var d = {};
      F.forEach(function (x) { var v = document.getElementById("s_" + x[0]).value.trim(); d[x[0]] = x[2] === "n" ? Number(v.replace(",", ".")) || 0 : v; });
      d.whatsapp = d.whatsapp.replace(/\D/g, "");
      d.hero_promises = document.getElementById("s_hero_promises").value.split("\n").map(function (z) { return z.trim(); }).filter(Boolean);
      d.cancel_policy = document.getElementById("s_cancel_policy").value.trim();
      var u = await sb.from("settings").upsert({ id: 1, data: d, updated_at: new Date().toISOString() }); if (!fail(u)) U.toast("Configurações salvas. O site já mostra as mudanças.");
    });
    document.getElementById("bf").addEventListener("submit", async function (e) {
      e.preventDefault(); var d = Object.assign({}, BZ);
      BF.forEach(function (x) { var v = document.getElementById("b_" + x[0]).value.trim(); d[x[0]] = x[2] === "n" ? Number(v.replace(",", ".")) || 0 : v; });
      d.ops_whatsapp = String(d.ops_whatsapp || "").replace(/\D/g, "");
      if (d.partner_split_pct < 0 || d.partner_split_pct > 100) return U.toast("A parte do sócio vai de 0 a 100%.");
      var u = await sb.from("biz_settings").upsert({ id: 1, data: d, updated_at: new Date().toISOString() }); if (!fail(u)) U.toast("Regras salvas.");
    });
    document.getElementById("ntest").addEventListener("click", async function () { var u = await sb.rpc("admin_notify_test"); if (!fail(u)) U.toast("Aviso de teste enviado ao canal."); });
    async function paintAdmins() {
      var a = await sb.from("admin_emails").select("*"); if (fail(a)) return;
      var adm = document.getElementById("admins"); if (!adm) return;
      adm.innerHTML = a.data.map(function (x) { return '<div class="row small"><b>' + esc(x.email) + '</b><button class="btn btn-ghost" type="button" data-adel="' + esc(x.email) + '">Remover</button></div>'; }).join("");
      document.querySelectorAll("[data-adel]").forEach(function (b) { b.addEventListener("click", async function () { if (a.data.length <= 1) return U.toast("Precisa ficar pelo menos um administrador."); var u = await sb.from("admin_emails").delete().eq("email", b.dataset.adel); if (!fail(u)) paintAdmins(); }); });
    }
    paintAdmins();
    document.getElementById("af").addEventListener("submit", async function (e) { e.preventDefault(); var v = document.getElementById("newAdmin").value.trim().toLowerCase(); if (!v) return; var u = await sb.from("admin_emails").insert({ email: v }); if (!fail(u)) { document.getElementById("newAdmin").value = ""; paintAdmins(); U.toast("Administrador adicionado. Ele cria a senha em “Primeiro acesso”."); } });
  };

  var hm = (location.hash || "").match(/^#(MT-\d+)$/i);
  if (hm) { tab = "reservas"; cache.resCode = hm[1].toUpperCase(); }
  else { try { var lt = localStorage.getItem("adm-tab"); if (lt && VIEWS[lt]) tab = lt; } catch (e) {} }
  var st = await D.load(); U.brand(st.settings);
  sb.auth.onAuthStateChange(function () {});
  boot();
})();
