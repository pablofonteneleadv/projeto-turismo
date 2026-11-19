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
    ["Catálogo", [["passeios", "Passeios e preços", "⛱"], ["empresas", "Empresas e net", "⚓"]]],
    ["Divulgação", [["cupons", "Cupons e agentes", "%"], ["avaliacoes", "Avaliações", "★"], ["perguntas", "Perguntas", "?"], ["contatos", "Contatos", "☎"], ["parceiros", "Parceiros", "♟"]]],
    ["Sistema", [["config", "Configurações", "⚙"]]]
  ];
  var TABS = []; GROUPS.forEach(function (g) { g[1].forEach(function (t) { TABS.push(t); }); });
  var BOTTOM = ["operacao", "reservas", "passeios", "financeiro"];
  function tabInfo(k) { if (k === "precos") return ["precos", "Tabela de preços", "R$"]; return TABS.filter(function (t) { return t[0] === k; })[0] || TABS[0]; }

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
    passeios: { search: "Buscar passeio…", filters: [{ k: "status", label: "Situação", emptyLabel: "Situação", opts: [["", "Todos"], ["on", "No ar"], ["off", "Ocultos"]] }, { k: "cat", label: "Categoria", emptyLabel: "Categoria", opts: [["", "Todas"], ["passeios", "Passeios"], ["pacotes", "Pacotes"], ["transfers", "Transfers"]] }, { k: "net", label: "Net", opts: [["", "Todos"], ["com", "Com net"], ["sem", "Sem net"]] }],
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
    function filterDisabled(k) { return k === "net" && p.dataset.netUnavailable === "true"; }
    function opts(fl) {
      if (!fl.dyn) return fl.opts.map(function (o) { return o[0] === "" ? ["", fl.emptyLabel || (fl.label + ": " + o[1].toLowerCase())] : o; });
      var seen = {}, o = [["", fl.label + ": todos"]];
      rows.forEach(function (r) { var v = r.dataset[fl.k], l = r.dataset[fl.k + "Label"] || v; if (v && !seen[v]) { seen[v] = 1; o.push([v, l]); } });
      return o.slice(0, 1).concat(o.slice(1).sort(function (a, b) { return a[1].localeCompare(b[1], "pt-BR"); }));
    }
    box.innerHTML = '<div class="tools' + (tab === "passeios" ? " tools-tours" : "") + '"><input type="search" id="tq" placeholder="' + esc(c.search) + '" value="' + esc(st.q) + '" aria-label="Buscar">' +
      c.filters.map(function (fl) { var disabled = filterDisabled(fl.k), selected = disabled ? "" : st.f[fl.k]; return '<select data-fk="' + fl.k + '" aria-label="' + esc(fl.label) + '"' + (disabled ? ' disabled' : '') + '>' + opts(fl).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (selected === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; }).join("") +
      '<select id="tsort" aria-label="Ordenar">' + c.sorts.map(function (o) { return '<option value="' + o[0] + '"' + (st.sort === o[0] ? " selected" : "") + ">↕ " + esc(o[1]) + "</option>"; }).join("") + "</select>" +
      '<button class="btn btn-ghost" type="button" id="tclear">Limpar</button></div>';
    function apply() {
      var q = st.q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), t0 = TODAY(), shown = 0;
      var so = c.sorts.filter(function (o) { return o[0] === st.sort; })[0] || c.sorts[0];
      rows.forEach(function (r) {
        var ok = !q || (r.dataset.search || r.textContent).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").indexOf(q) > -1;
        c.filters.forEach(function (fl) {
          var v = st.f[fl.k]; if (!ok || !v || filterDisabled(fl.k)) return; var d = r.dataset[fl.k] || "";
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
    try {
      await VIEWS[tab](p);
      if (!p.isConnected) return;
      if (p.innerHTML.indexOf("Carregando…") > -1 && p.children.length === 1) p.innerHTML = '<div class="warn">Não foi possível carregar agora. Confira a internet e toque na seção de novo.</div>';
      mountTools(p);
    } catch (e) { p.innerHTML = '<div class="warn">Erro ao carregar: ' + esc(e.message || e) + "</div>"; }
  }

  var VIEWS = {};

  VIEWS.inicio = async function (p) {
    var r = await sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(500);
    if (fail(r)) return;
    var b = r.data, today = TODAY(), month = today.slice(0, 7);
    var paid = b.filter(function (x) { return ["pago", "confirmado", "realizado"].indexOf(x.status) > -1; });
    var monthPaid = paid.filter(function (x) { return String(x.created_at).slice(0, 7) === month; });
    var sum = monthPaid.reduce(function (a, x) { return a + Number(x.total || 0); }, 0);
    var t = await sb.from("tours").select("slug", { count: "exact", head: true });
    p.innerHTML = '<div class="kpis">' +
      '<div class="kpi"><b class="num">' + b.filter(function (x) { return x.status === "pendente" && !holdExpired(x); }).length + "</b><span>reservas esperando pagamento</span></div>" +
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
        var conf = x.status === "confirmado" ? D.waLink(x.phone, ["✅ Reserva confirmada · " + S.brand + " Passeios", "", "Passeio: " + x.tour_name, "Data: " + ddmm(x.tour_date), "Pessoas: " + people + (x.buggy_cars ? " · Buggy: " + x.buggy_cars : ""), "Busca: " + (x.hotel || "a confirmar"), "Valor total: " + D.brl(x.total), "Saldo no embarque: " + D.brl(x.collect_at_boarding), "Código: " + (x.code || "#" + x.id), "", "O horário exato da busca vai na véspera. " + (S.cancel_policy || "")].join("\n")) : "";
        var sup = sups.find(function (z) { return z.id === x.supplier_id; });
        var sl = canDispatch(x) ? supLink(x, sup, S) : "";
        var vl = (x.status === "pendente" || x.status === "pago") && !holdExpired(x) && sup && sup.active && sup.whatsapp
          ? D.waLink(sup.whatsapp, "Olá! Pode confirmar a disponibilidade de " + x.tour_name + " em " + ddmm(x.tour_date) + " para " + pax(x) + "? Referência: " + (x.code || "#" + x.id)) : "";
        var opts = sups.filter(function (z) { return z.active && rts.some(function (rt) { return rt.tour_slug === x.tour_slug && rt.supplier_id === z.id && rt.active; }); });
        var fin = x.net_total == null ? '<p class="small" style="color:var(--ruim)">Sem net: escolha a empresa (o net precisa estar cadastrado em Empresas e net).</p>' :
          '<p class="small muted">Net ' + D.brl(x.net_total) + " · sinal " + D.brl(x.deposit) + " · receber no embarque " + D.brl(x.collect_at_boarding) + " · acerto " + (Number(x.supplier_settlement) >= 0 ? "empresa devolve " : "pagar à empresa ") + D.brl(Math.abs(x.supplier_settlement)) + " · <b>lucro " + D.brl(x.profit) + "</b>" + (x.floor_applied ? " · desconto limitado pelo mínimo" : "") + (x.source ? " · origem " + esc(x.source) : "") + "</p>";
        return '<div class="item" data-row data-name="' + esc(x.customer_name) + '" data-search="' + esc([x.code, x.customer_name, x.phone, x.hotel, x.tour_name, x.coupon, sup ? sup.name : ""].join(" ")) + '" data-status="' + x.status + '" data-date="' + x.tour_date + '" data-created="' + esc(x.created_at) + '" data-value="' + x.total + '" data-tour="' + esc(x.tour_slug) + '" data-tour-label="' + esc(x.tour_name) + '" data-sup="' + (x.supplier_id || "") + '" data-sup-label="' + esc(sup ? sup.name : "") + '"><div class="item-head"><div><h3>' + esc(x.tour_name) + " · " + ddmm(x.tour_date) + '</h3><p class="small muted">' + esc(x.code || "#" + x.id) + " · feita em " + ddmm(x.created_at) + (x.lang && x.lang !== "pt" ? " · idioma " + esc(x.lang.toUpperCase()) : "") + "</p></div><span class=\"st st-" + x.status + '">' + STATUS_TXT[x.status] + "</span></div>" +
          '<p class="small"><b>' + esc(x.customer_name) + "</b> · " + esc(x.phone) + (x.hotel ? " · Busca: " + esc(x.hotel) : "") + "</p>" +
          '<p class="small">' + (x.kind === "priv" ? "Privativo" : "Em grupo") + " · " + people + (x.buggy_cars ? " · Buggy: " + x.buggy_cars : "") + (x.coupon ? " · Cupom " + esc(x.coupon) : "") + " · <b>" + D.brl(x.total) + "</b> " + (x.pay_method === "pix" ? "Pix" : "cartão") + "</p>" +
          fin + attributionLine(x) + (holdExpired(x) ? '<p class="warn small">Prazo expirado. Confira eventual pagamento antes de tratar esta reserva.</p>' : "") +
          (x.boarded_at ? '<p class="small"><strong>Embarque registrado</strong></p>' : "") +
          '<div class="row small"><label for="sup' + x.id + '">Empresa</label><select id="sup' + x.id + '" data-sup="' + x.id + '" style="width:auto"><option value="">' + (opts.length ? "Escolher…" : "Nenhuma com net") + "</option>" + opts.map(function (z) { return '<option value="' + z.id + '"' + (z.id === x.supplier_id ? " selected" : "") + ">" + esc(z.name) + "</option>"; }).join("") + "</select>" +
          (vl ? '<a class="btn btn-ghost" href="' + vl + '" target="_blank" rel="noopener">Consultar vaga com a empresa</a>' : "") +
          messageAction(x, sl, "sent", "Abrir WhatsApp da empresa", "Registrar envio à empresa", "Envio à empresa registrado") + "</div>" +
          (x.status === "realizado" && !x.no_show ? '<div class="row small">' +
            messageAction(x, reviewLink(x, S), "review", "Abrir pedido de avaliação", "Registrar pedido enviado", "Pedido de avaliação registrado") +
            messageAction(x, offerLink(x, S, allTours), "offer", "Abrir oferta com consentimento", "Registrar oferta enviada", "Envio da oferta registrado") + "</div>" : "") +
          '<div class="row">' + bookingActions(x, true, !!(sup && sup.active && x.net_total != null)) +
          (conf ? '<a class="btn btn-mar" href="' + conf + '" target="_blank" rel="noopener">Abrir confirmação no WhatsApp</a>' : "") +
          (wa ? '<a class="btn btn-ghost" href="' + wa + '" target="_blank" rel="noopener">WhatsApp do cliente</a>' : "") +
          '<button class="btn btn-ghost" type="button" data-note="' + x.id + '">Anotação</button></div>' + (x.notes ? '<p class="small muted">📝 ' + esc(x.notes) + "</p>" : "") + "</div>";
      }).join("") || '<div class="empty">Nenhuma reserva aqui.</div>');
    p.querySelectorAll("[data-sup]").forEach(function (sl) { sl.addEventListener("change", async function () { if (!sl.value) return; var u = await sb.rpc("assign_supplier", { p_booking: Number(sl.dataset.sup), p_supplier: Number(sl.value) }); if (!fail(u)) { U.toast("Empresa definida e acerto recalculado."); render(); } }); });
    bindMessageActions(p, list);
    bindBookingActions(p, list);
    p.querySelectorAll("[data-note]").forEach(function (b) { b.addEventListener("click", async function () {
      var x = r.data.filter(function (y) { return String(y.id) === b.dataset.note; })[0];
      var box = document.createElement("div"); box.className = "field"; box.innerHTML = '<textarea aria-label="Anotação">' + esc(x.notes || "") + '</textarea><button class="btn btn-mar" type="button">Salvar anotação</button>';
      b.closest(".item").appendChild(box); b.disabled = true;
      box.querySelector("button").addEventListener("click", async function () { var u = await sb.from("bookings").update({ notes: box.querySelector("textarea").value }).eq("id", x.id); if (!fail(u)) { U.toast("Anotação salva."); render(); } });
    }); });
    void S;
  };

  VIEWS.precos = async function (p) {
    var back = document.createElement("div");
    var r = await sb.from("tours").select("slug,name,price_card,price_pix,price_private,per_vehicle,active,extras,category,sort").order("sort");
    if (fail(r)) return;
    void back;
    p.innerHTML = '<div class="row"><button class="btn btn-ghost" type="button" id="backTours">← Voltar para Passeios</button></div><p class="note">Revise e toque em Salvar tudo. Pix normalmente fica de 5% a 10% abaixo do cartão. O privativo é o preço do veículo inteiro.</p>' +
      r.data.map(function (t) {
        var bug = (t.extras || []).filter(function (e) { return e.buggy; })[0];
        return '<div class="item" data-row data-slug="' + esc(t.slug) + '" data-name="' + esc(t.name) + '" data-status="' + (t.active ? "on" : "off") + '" data-cat="' + esc(t.category) + '" data-price="' + t.price_pix + '" data-sort="' + t.sort + '"><div class="item-head"><h3>' + esc(t.name) + "</h3>" + (t.active ? "" : '<span class="st st-cancelado">Oculto</span>') + '</div><div class="formgrid">' +
          f("pc_" + t.slug, "Cartão (R$)" + (t.per_vehicle ? " por veículo" : " por pessoa"), t.price_card, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
          f("pp_" + t.slug, "Pix (R$)", t.price_pix, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
          (t.per_vehicle ? "" : f("pv_" + t.slug, "Privativo por veículo (vazio = não oferece)", t.price_private == null ? "" : t.price_private, "", 'type="number" step="0.01" min="0" inputmode="decimal"')) +
          (bug ? f("pb_" + t.slug, "Buggy por carro (R$)", bug.price, "", 'type="number" step="0.01" min="0" inputmode="decimal"') : "") +
          "</div></div>";
      }).join("") + '<div class="row" style="position:sticky;bottom:0;background:var(--bg);padding-block:10px"><button class="btn btn-mar" type="button" id="saveAll" style="flex:1">Salvar tudo</button></div>';
    document.getElementById("backTours").addEventListener("click", function () { tab = "passeios"; render(); });
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
    if (cache.editTour === null) return tourForm(p, null);
    if (cache.editTour !== undefined) {
      var edit = await sb.from("tours").select("*").eq("slug", cache.editTour).single();
      if (!fail(edit)) return tourForm(p, edit.data);
      return;
    }
    var [r, rateResult, BZ] = await Promise.all([
      sb.from("tours").select("*").order("sort"),
      sb.from("tour_rates").select("tour_slug,net_adult,preferred,active"),
      bizData()
    ]);
    if (fail(r)) return;
    var netUnavailable = !!rateResult.error;
    p.dataset.netUnavailable = String(netUnavailable);
    var AD = Number(BZ.ad_cost_per_pax || 0), MM = Number(BZ.min_margin_per_pax || 0), FEE = Number(BZ.card_fee_pct || 0);
    var ratesByTour = new Map();
    (rateResult.data || []).forEach(function (rate) {
      if (!rate.active) return;
      var current = ratesByTour.get(rate.tour_slug);
      if (!current || (rate.preferred && !current.preferred) || (!rate.preferred && !current.preferred && Number(rate.net_adult) < Number(current.net_adult))) ratesByTour.set(rate.tour_slug, rate);
    });
    function floorOf(slug) {
      var rate = ratesByTour.get(slug);
      if (!rate) return null;
      var net = Number(rate.net_adult), base = net + AD + MM;
      return { net: net, pix: Math.ceil(base), card: Math.ceil(base / (1 - FEE / 100)) };
    }
    p.innerHTML = '<div class="row tour-toolbar"><button class="btn btn-mar" type="button" id="newTour">+ Novo passeio</button><button class="btn btn-ghost" type="button" id="allPrices">Tabela de preços</button></div>' +
      (netUnavailable ? '<p class="warn" role="status">Não foi possível carregar os nets. Abra a seção novamente para tentar.</p>' : '') +
      r.data.map(function (t) {
        var slug = esc(t.slug), extraId = "tour-actions-" + slug, fl = floorOf(t.slug);
        var netLabel = fl ? "Net " + D.brl(fl.net) : netUnavailable ? "Net indisponível" : "Sem net";
        var margin = fl ? '<span>Sobra ' + D.brl(Number(t.price_pix) - fl.net - AD) + (t.per_vehicle ? "/veículo" : "/pessoa") + '</span>' : "";
        return '<article class="item tour-catalog-card" data-row data-slug="' + slug + '" data-name="' + esc(t.name) + '" data-net="' + (netUnavailable ? "" : fl ? "com" : "sem") + '" data-status="' + (t.active ? "on" : "off") + '" data-cat="' + esc(t.category) + '" data-price="' + t.price_pix + '" data-sort="' + t.sort + '">' +
          '<div class="tour-card-intro">' + ((t.photos || [])[0] ? '<img class="thumb" src="' + esc(t.photos[0].url) + '" alt="" loading="lazy" decoding="async">' : '') +
          '<div><h3>' + esc(t.name) + '</h3><p class="tour-card-prices"><span>Pix ' + D.brl(t.price_pix) + '</span><span>Cartão ' + D.brl(t.price_card) + '</span></p></div></div>' +
          '<div class="tour-card-meta"><span class="st ' + (t.active ? "st-pago" : "st-cancelado") + '">' + (t.active ? "No ar" : "Oculto") + '</span>' +
          '<span>' + (t.sales_mode === "booking" ? "Reserva online" : "Sob consulta") + '</span><strong class="' + (fl ? "" : "tour-net-missing") + '">' + netLabel + '</strong>' + margin + '</div>' +
          '<div class="tour-card-actions"><button class="btn btn-mar" type="button" data-prices="' + slug + '" aria-expanded="false">Preços</button>' +
          '<button class="btn btn-ghost" type="button" data-edit="' + slug + '">Editar</button><button class="btn btn-ghost" type="button" data-more-tour aria-label="Mais ações" aria-expanded="false" aria-controls="' + extraId + '">Mais</button></div>' +
          '<div class="row tour-card-extra" id="' + extraId + '" hidden><button class="btn btn-ghost" type="button" data-sales-nav="' + slug + '">Operadora e vagas</button>' +
          '<button class="btn btn-ghost" type="button" data-toggle="' + slug + '">' + (t.active ? "Ocultar" : "Publicar") + '</button><a class="btn btn-ghost" href="passeio.html?p=' + encodeURIComponent(t.slug) + '" target="_blank" rel="noopener">Ver passeio</a></div></article>';
      }).join("");
    document.getElementById("newTour").addEventListener("click", function () { cache.editTour = null; render(); });
    document.getElementById("allPrices").addEventListener("click", function () { tab = "precos"; render(); });
    p.querySelectorAll("[data-more-tour]").forEach(function (button) { button.addEventListener("click", function () {
      var actions = document.getElementById(button.getAttribute("aria-controls"));
      actions.hidden = !actions.hidden;
      button.setAttribute("aria-expanded", String(!actions.hidden));
    }); });
    p.querySelectorAll("[data-prices]").forEach(function (b) { b.addEventListener("click", function () {
      var card = b.closest(".item"), open = card.querySelector(".pedit");
      if (open) { open.remove(); b.setAttribute("aria-expanded", "false"); return; }
      var t = r.data.filter(function (x) { return x.slug === b.dataset.prices; })[0], fl = floorOf(t.slug), id = "pe_" + t.slug.replace(/\W/g, "_");
      var bug = (t.extras || []).filter(function (e) { return e.buggy; })[0];
      var box = document.createElement("div"); box.className = "pedit";
      box.innerHTML = '<div class="formgrid">' +
        f(id + "_pix", "Pix (R$)" + (t.per_vehicle ? " por veículo" : " por pessoa"), t.price_pix, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
        f(id + "_card", "Cartão (R$)", t.price_card, "", 'type="number" step="0.01" min="0" inputmode="decimal"') +
        (t.per_vehicle ? "" : f(id + "_priv", "Privativo por veículo (vazio = não oferece)", t.price_private == null ? "" : t.price_private, "", 'type="number" step="0.01" min="0" inputmode="decimal"')) +
        (bug ? f(id + "_bug", "Buggy por carro (R$)", bug.price, "", 'type="number" step="0.01" min="0" inputmode="decimal"') : "") + "</div>" +
        '<p class="small muted" data-hint>' + (fl ? "Não aceita abaixo de " + D.brl(fl.pix) + " no Pix e " + D.brl(fl.card) + " no cartão." : netUnavailable ? "A conferência do preço mínimo será feita ao salvar." : "Sem net: não há trava de mínimo para este passeio.") + "</p>" +
        '<div class="row"><button class="btn btn-ghost" type="button" data-card5>Cartão = Pix + ' + (FEE || 5) + '%</button><button class="btn btn-mar" type="button" data-psave>Salvar preços</button><button class="btn btn-ghost" type="button" data-pcancel>Fechar</button></div>';
      card.appendChild(box); b.setAttribute("aria-expanded", "true");
      var g = function (k) { var el = document.getElementById(id + "_" + k); return el ? el.value.trim() : null; };
      box.querySelector("[data-card5]").addEventListener("click", function () { var v = Number(g("pix")); if (v) document.getElementById(id + "_card").value = Math.round(v * (1 + (FEE || 5) / 100)); });
      box.querySelector("[data-pcancel]").addEventListener("click", function () { box.remove(); b.setAttribute("aria-expanded", "false"); });
      box.querySelector("[data-psave]").addEventListener("click", async function () {
        var row = { price_pix: Number(g("pix")) || 0, price_card: Number(g("card")) || 0, updated_at: new Date().toISOString() };
        if (!row.price_pix || !row.price_card) return U.toast("Preencha Pix e cartão.");
        if (fl && (row.price_pix < fl.pix || row.price_card < fl.card)) return U.toast("Abaixo do mínimo: " + D.brl(fl.pix) + " no Pix e " + D.brl(fl.card) + " no cartão.");
        if (!t.per_vehicle) row.price_private = g("priv") === "" ? null : Number(g("priv"));
        if (bug) row.extras = (t.extras || []).map(function (e) { return e.buggy ? Object.assign({}, e, { price: Number(g("bug")) || 0 }) : e; });
        var u = await sb.from("tours").update(row).eq("slug", t.slug); if (!fail(u)) { U.toast("Preços de " + t.name + " salvos. O site já mostra."); render(); }
      });
    }); });
    p.querySelectorAll("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { cache.editTour = b.dataset.edit; render(); }); });
    p.querySelectorAll("[data-sales-nav]").forEach(function (b) { b.addEventListener("click", function () {
      tab = "empresas"; cache.netTour = b.dataset.salesNav;
      var st = toolState(tab); st.q = ""; st.f.status = ""; st.f.net = "";
      render();
    }); });
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
    var [r, b] = await Promise.all([
      sb.from("coupons").select("*").order("created_at"),
      sb.from("bookings").select("coupon,total,status,commission,no_show", { count: "exact" }).not("coupon", "is", null).in("status", ["pago", "confirmado", "realizado"]).order("id", { ascending: false })
    ]);
    if (fail(r) || fail(b)) return;
    function emptyStats() { return { scheduled: 0, completed: 0, bookedTotal: 0, completedTotal: 0, estimated: 0, eligible: 0, missing: 0 }; }
    var stats = Object.create(null);
    b.data.forEach(function (booking) {
      if (booking.no_show) return;
      var code = booking.coupon.trim().toUpperCase();
      if (!code) return;
      var s = stats[code] || (stats[code] = emptyStats());
      var total = Number(booking.total || 0);
      var amount = booking.commission == null ? 0 : Number(booking.commission);
      if (booking.commission == null) s.missing++;
      s.bookedTotal += total;
      if (booking.status === "realizado") {
        s.completed++;
        s.completedTotal += total;
        s.eligible += amount;
      } else {
        s.scheduled++;
        s.estimated += amount;
      }
    });
    p.innerHTML = '<div class="item"><h3>Novo cupom</h3><form id="cf" class="formgrid">' +
      f("c_code", "Código (ex.: BRUNO)", "") + f("c_agent", "Nome do agente", "") +
      f("c_disc", "Desconto do cliente (%)", 5, "", 'type="number" step="0.5" min="0" max="50"') + f("c_comm", "Comissão do agente (%)", 8, "", 'type="number" step="0.5" min="0" max="50"') +
      f("c_leader", "Líder (opcional)", "") + f("c_lpct", "Comissão do líder (%)", 0, "", 'type="number" step="0.5" min="0" max="20"') +
      '<div class="row full"><button class="btn btn-mar" type="submit">Criar cupom</button></div></form><p class="note">A comissão do agente fica elegível quando o passeio é realizado. Os valores vêm das reservas.</p></div>' +
      (b.count > b.data.length ? '<p class="warn">Resumo parcial com as ' + b.data.length + ' reservas mais recentes de ' + b.count + '.</p>' : '') +
      r.data.map(function (c) {
        var s = stats[c.code.toUpperCase()] || emptyStats();
        var link = U.publicUrl("/");
        link.search = new URLSearchParams({ cupom: c.code, utm_source: "parceiro", utm_medium: "indicacao", utm_campaign: "indicacoes", utm_content: c.code.toLowerCase() });
        return '<div class="item" data-row data-name="' + esc(c.code) + '" data-search="' + esc(c.code + " " + c.agent_name + " " + (c.leader || "")) + '" data-status="' + (c.active ? "on" : "off") + '" data-value="' + s.bookedTotal + '"><div class="item-head"><div><h3>' + esc(c.code) + " · " + esc(c.agent_name) + '</h3><p class="small muted">Cliente ganha ' + c.discount_pct + "% · agente ganha " + c.commission_pct + "%" + (c.leader ? " · líder " + esc(c.leader) + " ganha " + c.leader_pct + "%" : "") + '</p></div><span class="st ' + (c.active ? "st-pago" : "st-cancelado") + '">' + (c.active ? "Ativo" : "Pausado") + "</span></div>" +
          '<p class="small">' + s.scheduled + " aguardando passeio · " + s.completed + " realizados · " + D.brl(s.bookedTotal) + " em reservas</p>" +
          '<p class="small">Comissão estimada <b>' + D.brl(s.estimated) + '</b> · elegível <b>' + D.brl(s.eligible) + '</b></p>' +
          (c.leader ? '<p class="small muted">Líder em passeios realizados · estimativa pela taxa atual ' + D.brl(s.completedTotal * c.leader_pct / 100) + '</p>' : '') +
          (s.missing ? '<p class="small muted">' + s.missing + (s.missing === 1 ? " reserva sem comissão registrada" : " reservas sem comissão registrada") + '</p>' : '') +
          '<div class="row"><button class="btn btn-ghost" type="button" data-copy="' + esc(link.href) + '">Copiar link do agente</button><button class="btn btn-ghost" type="button" data-ctoggle="' + esc(c.code) + '">' + (c.active ? "Pausar" : "Ativar") + '</button><button class="btn btn-danger" type="button" data-cdel="' + esc(c.code) + '">Excluir</button></div></div>';
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

  async function saveBizFields(fields, expected) {
    var keys = Object.keys(fields);
    if (!keys.length) return { error: null };
    for (var attempt = 0; attempt < 2; attempt++) {
      var row = await sb.from("biz_settings").select("data,updated_at").eq("id", 1).maybeSingle();
      if (row.error) return row;
      var current = row.data && row.data.data || {};
      if (expected && keys.some(function (key) { return JSON.stringify(current[key]) !== JSON.stringify(expected[key]); })) {
        return { error: { message: "Outra pessoa alterou estes dados. Copie sua edição e reabra a seção para conferir." } };
      }
      var patch = { data: Object.assign({}, current, fields), updated_at: new Date().toISOString() };
      if (!row.data) return sb.from("biz_settings").insert(Object.assign({ id: 1 }, patch));
      var write = sb.from("biz_settings").update(patch).eq("id", 1);
      write = row.data.updated_at ? write.eq("updated_at", row.data.updated_at) : write.is("updated_at", null);
      var saved = await write.select("id");
      if (saved.error || (saved.data && saved.data.length)) return saved;
    }
    return { error: { message: "As configurações mudaram durante o salvamento. Tente salvar novamente." } };
  }

  var netDateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Fortaleza" });
  function rateDate(rate) {
    var updated = Date.parse(rate.updated_at);
    if (!Number.isFinite(updated)) return '<span class="net-date bad">Net sem data · revisar</span>';
    var days = Math.floor((Date.now() - updated) / 864e5);
    return '<span class="net-date' + (days >= 30 ? ' bad' : '') + '">Net atualizado em <time datetime="' + new Date(updated).toISOString() + '">' + netDateFormat.format(updated) + '</time>' +
      (days >= 30 ? " · revisar (" + days + " dias)" : "") + '</span>';
  }
  function pax(x) { return x.adults + " adulto(s)" + (x.children ? ", " + x.children + " criança(s)" : "") + (x.seniors ? ", " + x.seniors + " idoso(s)" : ""); }
  function people(x) { return (x.adults || 0) + (x.children || 0) + (x.seniors || 0); }
  function fillTpl(tpl, x, S) {
    var v = { marca: S.brand || "Maré Tur", codigo: x.code || ("#" + x.id), passeio: x.tour_name, data: ddmm(x.tour_date), cliente: x.customer_name, telefone: x.phone, hotel: x.hotel || "a confirmar com o cliente",
      pessoas: pax(x), cobrar: D.brl(x.collect_at_boarding == null ? x.total : x.collect_at_boarding), total: D.brl(x.total), obs: x.notes || "—" };
    return String(tpl || DEFAULT_TPL).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; });
  }
  function supLink(x, sup, S) { return sup && sup.active && sup.whatsapp ? D.waLink(sup.whatsapp, fillTpl(sup.msg_template, x, S)) : ""; }
  function remindLink(x, S) {
    return D.waLink(x.phone, ["Olá, " + x.customer_name.split(" ")[0] + "! Seu passeio de " + x.tour_name + " é em " + ddmm(x.tour_date) + " 🌊", "", "Reserva: " + (x.code || "#" + x.id),
      "Busca: " + (x.hotel || "confirme seu hotel respondendo esta mensagem"), "O horário exato da busca chega por aqui. Leve protetor solar, roupa de banho e documento com foto.",
      x.collect_at_boarding ? "No embarque: " + D.brl(x.collect_at_boarding) + " (dinheiro, Pix ou cartão)." : "", "", "Qualquer dúvida é só responder. " + (S.brand || "")].filter(function (l, i, a) { return l || a[i - 1]; }).join("\n"));
  }
  function reviewLink(x, S) {
    return D.waLink(x.phone, "Olá, " + x.customer_name.split(" ")[0] + "! Como foi o passeio de " + x.tour_name + "? Sua avaliação ajuda muito outros viajantes" + (S.google_review_url ? ": " + S.google_review_url : ". Pode responder aqui mesmo com uma nota de 1 a 5.") + " Obrigado! " + (S.brand || ""));
  }
  function offerLink(x, S, tours) {
    var site = U.publicUrl("/").href;
    var picks = tours.filter(function (t) { return t.slug !== x.tour_slug && t.active && t.category !== "transfers"; }).sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sort - b.sort; }).slice(0, 3);
    var cup = S.followup_coupon ? "?cupom=" + encodeURIComponent(S.followup_coupon) : "";
    return D.waLink(x.phone, ["Olá, " + x.customer_name.split(" ")[0] + "! Que bom ter você com a gente no " + x.tour_name + ". Para os próximos dias em Fortaleza:", ""].concat(picks.map(function (t) { return "• " + t.name + " · " + D.brl(t.price_pix) + " no Pix\n  " + site + U.tourUrl(t.slug) + cup; })).concat(S.followup_coupon ? ["", "Com o cupom " + S.followup_coupon + " você tem desconto de cliente da casa."] : []).join("\n"));
  }
  function holdExpired(x) {
    return x.status === "pendente" && !!x.reservation_expires_at && Date.parse(x.reservation_expires_at) <= Date.now();
  }
  function canDispatch(x) { return (x.status === "confirmado" || x.status === "realizado") && !x.no_show; }
  function attributionLine(x) {
    var a = x.attribution && typeof x.attribution === "object" ? x.attribution : {};
    var parts = [a.source, a.medium, a.campaign, a.content, a.term].filter(Boolean);
    return parts.length ? '<p class="small muted">Campanha · ' + esc(parts.join(" · ")) + "</p>" : "";
  }
  var MESSAGE_FIELDS = { sent: "sent_to_supplier_at", remind: "reminder_sent_at", review: "review_asked_at", offer: "offer_sent_at" };
  function messageAction(x, href, kind, openLabel, registerLabel, sentLabel) {
    var id = x.id, sent = x[MESSAGE_FIELDS[kind]];
    return (href ? '<a class="btn btn-ghost" href="' + esc(href) + '" target="_blank" rel="noopener" data-' + kind + '="' + id + '">' + openLabel + "</a>" : "") +
      (sent ? '<span class="small">✓ ' + sentLabel + "</span>" : href ? '<button class="btn btn-ghost" type="button" data-record-message="' + kind + '" data-booking="' + id + '">' + registerLabel + "</button>" : "");
  }
  function bindMessageActions(p, list) {
    p.querySelectorAll("[data-record-message]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var field = MESSAGE_FIELDS[b.dataset.recordMessage], x = list.find(function (r) { return String(r.id) === b.dataset.booking; });
        b.disabled = true;
        if (await stamp(x.id, { [field]: new Date().toISOString() }, { [field]: null, status: x.status })) {
          U.toast("Envio registrado."); render();
        } else b.disabled = false;
      });
    });
  }
  var BOOKING_ACTIONS = {
    paid: { label: "Registrar pagamento conferido", verify: "Confirmar que recebi o valor exigido" },
    confirmed: { label: "Confirmar vaga e reserva", verify: "Registrar confirmação da operadora" },
    boarded: { label: "Registrar embarque" },
    completed: { label: "Marcar passeio realizado", verify: "Confirmar que o passeio aconteceu" },
    noShow: { label: "Registrar não comparecimento", verify: "Confirmar não comparecimento" },
    canceled: { label: "Cancelar reserva", verify: "Confirmar cancelamento e acerto de valores" }
  };
  function bookingActions(x, showCommercial, assigned) {
    var buttons = [];
    if (showCommercial && x.status === "pendente" && !holdExpired(x)) buttons.push("paid");
    if (showCommercial && x.status === "pago" && assigned) buttons.push("confirmed");
    if (x.status === "confirmado" && !x.no_show && x.tour_date <= TODAY()) {
      if (x.boarded_at) buttons.push("completed");
      else buttons.push("boarded", "noShow");
    }
    if (showCommercial && STATUS.slice(0, 3).includes(x.status) && !x.boarded_at) buttons.push("canceled");
    return buttons.map(function (action) { return '<button class="btn btn-ghost" type="button" data-booking-action="' + action + '" data-booking="' + x.id + '">' + BOOKING_ACTIONS[action].label + "</button>"; }).join("");
  }
  function bindBookingActions(p, list) {
    p.querySelectorAll("[data-booking-action]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var action = b.dataset.bookingAction, confirm = BOOKING_ACTIONS[action].verify;
        if (confirm && b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = confirm; return; }
        var x = list.find(function (r) { return String(r.id) === b.dataset.booking; });
        if (action === "paid" && holdExpired(x)) { U.toast("Prazo expirado. Confira eventual pagamento para tratar este caso."); render(); return; }
        var updates = {
          paid: { status: "pago" }, confirmed: { status: "confirmado" }, completed: { status: "realizado" },
          boarded: { boarded_at: new Date().toISOString(), no_show: false }, noShow: { no_show: true }, canceled: { status: "cancelado" }
        };
        var match = { status: x.status };
        if (["boarded", "completed", "noShow", "canceled"].includes(action)) {
          match.boarded_at = x.boarded_at || null;
          match.no_show = x.no_show == null ? null : x.no_show;
        }
        b.disabled = true;
        if (await stamp(x.id, updates[action], match)) { U.toast("Registro atualizado."); render(); }
        else b.disabled = false;
      });
    });
  }
  async function stamp(id, patch, match) {
    var q = sb.from("bookings").update(patch, { count: "exact" }).eq("id", id);
    Object.entries(match || {}).forEach(function (entry) { q = entry[1] === null ? q.is(entry[0], null) : q.eq(entry[0], entry[1]); });
    var u = await q;
    if (fail(u)) return false;
    if (u.count === 0) { U.toast("A reserva mudou. Atualize a seção antes de registrar."); render(); return false; }
    return true;
  }

  VIEWS.operacao = async function (p) {
    var tz = new Date(Date.now() - 3 * 3600e3), today = tz.toISOString().slice(0, 10), tmr = new Date(tz.getTime() + 864e5).toISOString().slice(0, 10);
    var day = cache.opDay || tmr;
    var S = (await D.load()).settings;
    var res = await Promise.all([sb.from("bookings").select("*").eq("tour_date", day).neq("status", "cancelado").order("tour_name"), sb.from("suppliers").select("*").order("name")]);
    if (fail(res[0]) || fail(res[1])) return;
    var sups = {}; res[1].data.forEach(function (s) { sups[s.id] = s; });
    var allBookings = res[0].data.filter(function (x) { return x.tour_date === day && x.status !== "cancelado"; });
    var queue = allBookings.filter(function (x) { return canDispatch(x) || x.no_show; });
    var awaiting = allBookings.filter(function (x) { return x.status === "pago" || (x.status === "pendente" && !holdExpired(x)); }).length;
    var groups = {}, batch = {};
    queue.forEach(function (x) { var k = x.supplier_id || 0; (groups[k] = groups[k] || []).push(x); });
    var total = queue.reduce(function (a, x) { return a + people(x); }, 0);
    p.innerHTML = '<div class="row"><button class="btn ' + (day === today ? "btn-mar" : "btn-ghost") + '" type="button" data-day="' + today + '">Hoje</button><button class="btn ' + (day === tmr ? "btn-mar" : "btn-ghost") + '" type="button" data-day="' + tmr + '">Amanhã</button><input type="date" id="opDay" aria-label="Data da operação" value="' + esc(day) + '" style="width:auto"><span class="muted small">' + queue.length + " no roteiro · " + total + " pessoas</span></div>" +
      '<p class="note">Abra o WhatsApp para enviar por lá e registre o envio no painel. Registre o embarque na saída e a realização quando a empresa confirmar a conclusão.</p>' +
      (awaiting ? '<p class="warn small">' + awaiting + " aguardando pagamento ou confirmação. Confira em Reservas.</p>" : "") +
      (Object.keys(groups).map(function (k) {
        var sup = sups[k], list = groups[k];
        var pending = list.filter(function (x) { return canDispatch(x) && x.status === "confirmado" && !x.sent_to_supplier_at; });
        batch[k] = pending.map(function (x) { return x.id; });
        var all = sup && sup.active && sup.whatsapp && pending.length ? D.waLink(sup.whatsapp, ["Lista " + (S.brand || "") + " · " + ddmm(day), ""].concat(pending.map(function (x, i) { return (i + 1) + ") " + fillTpl("{codigo} · {passeio} · {cliente} {telefone} · {hotel} · {pessoas} · receber {cobrar}", x, S); })).join("\n")) : "";
        return '<div class="item"><div class="item-head"><h3>' + (sup ? esc(sup.name) : "⚠ Sem empresa definida") + '</h3><span class="muted small">' + list.length + " reservas</span></div>" +
          (all ? '<div class="row"><a class="btn btn-ghost" href="' + esc(all) + '" target="_blank" rel="noopener" data-sendall="' + k + '">Abrir lista de envios pendentes</a><button type="button" class="btn btn-ghost" data-record-list="' + k + '">Registrar envio da lista (' + pending.length + ')</button></div>' :
            !sup || !sup.active ? '<p class="warn small">Defina uma empresa ativa para cada reserva em Reservas.</p>' :
            !sup.whatsapp ? '<p class="warn small">Cadastre o WhatsApp de ' + esc(sup.name) + " em Empresas e net.</p>" : "") +
          list.map(function (x) {
            var sl = canDispatch(x) && x.status === "confirmado" ? supLink(x, sup, S) : "";
            var rl = canDispatch(x) && x.status === "confirmado" && !x.boarded_at ? remindLink(x, S) : "";
            return '<div class="item" style="background:var(--bg)"><div class="item-head"><div><b>' + esc(x.code || "#" + x.id) + " · " + esc(x.tour_name) + '</b><p class="small">' + esc(x.customer_name) + " · " + esc(x.phone) + " · " + esc(x.hotel || "sem hotel") + " · " + pax(x) + '</p><p class="small muted">Receber no embarque: <b>' + D.brl(x.collect_at_boarding == null ? x.total : x.collect_at_boarding) + "</b> · " + STATUS_TXT[x.status] + "</p></div>" +
              '<div class="small">' + (x.boarded_at ? "<b>✓ Embarcou</b>" : x.no_show ? '<b style="color:var(--ruim)">Não compareceu</b>' : "") + "</div></div>" +
              '<div class="row">' + messageAction(x, sl, "sent", "Abrir WhatsApp da empresa", "Registrar envio à empresa", "Envio à empresa registrado") +
              messageAction(x, rl, "remind", "Abrir lembrete ao cliente", "Registrar lembrete enviado", "Lembrete registrado") +
              bookingActions(x, false, false) + "</div></div>";
          }).join("") + "</div>";
      }).join("") || '<div class="empty">Nenhuma reserva para ' + ddmm(day) + ".</div>");
    p.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { cache.opDay = b.dataset.day; render(); }); });
    document.getElementById("opDay").addEventListener("change", function (e) { cache.opDay = e.target.value; render(); });
    bindMessageActions(p, queue);
    bindBookingActions(p, queue);
    p.querySelectorAll("[data-record-list]").forEach(function (b) {
      b.addEventListener("click", async function () {
        b.disabled = true;
        var u = await sb.from("bookings").update({ sent_to_supplier_at: new Date().toISOString() }, { count: "exact" }).in("id", batch[b.dataset.recordList]).eq("status", "confirmado").is("sent_to_supplier_at", null);
        if (fail(u)) { b.disabled = false; return; }
        U.toast(u.count === 0 ? "Não há envios pendentes nessa lista." : "Envios da lista registrados."); render();
      });
    });
  };

  VIEWS.empresas = async function (p) {
    var res = await Promise.all([sb.from("suppliers").select("*").order("name"), sb.from("tour_rates").select("*"), sb.from("tours").select("*").order("sort"), bizData(), sb.from("settings").select("data").eq("id", 1).maybeSingle()]);
    if (fail(res[0]) || fail(res[1]) || fail(res[2])) return;
    var sups = res[0].data, rates = res[1].data, tours = res[2].data, B = res[3], settings = res[4].data && res[4].data.data || {};
    var AD = Number(B.ad_cost_per_pax || 0), MM = Number(B.min_margin_per_pax || 0), FEE = Number(B.card_fee_pct || 0), SPLIT = Number(B.partner_split_pct == null ? 50 : B.partner_split_pct);
    if (cache.netTour) { cache.empView = "passeios"; cache.empOpenT = cache.netTour; cache.netTour = ""; }
    var mode = cache.empView || "passeios", openT = cache.empOpenT, openSup = cache.supOpen;
    cache.empOpenT = null; cache.supOpen = null;
    if (!sups.some(function (s) { return String(s.id) === String(cache.empSup); })) cache.empSup = sups.length ? String(sups[0].id) : "";
    var brl = function (n) { return D.brl(n).replace(",00", ""); };
    var supName = function (id) { var s = sups.filter(function (z) { return z.id === id; })[0]; return s ? s.name : "?"; };
    var tourOf = function (slug) { return tours.filter(function (t) { return t.slug === slug; })[0]; };
    function prefOf(slug) { var tr = rates.filter(function (r) { return r.tour_slug === slug && r.active; }); return tr.filter(function (r) { return r.preferred; })[0] || tr.sort(function (a, b) { return a.net_adult - b.net_adult; })[0]; }
    function calc(t, net) { if (net === "" || net == null || isNaN(Number(net))) return null; net = Number(net); var base = net + AD + MM; return { floor: Math.ceil(base), floorCard: Math.ceil(base / (1 - FEE / 100)), sobra: Number(t.price_pix) - net - AD, ok: Number(t.price_pix) >= Math.ceil(base) }; }
    function sumHtml(t) {
      var r = prefOf(t.slug), c = r && calc(t, r.net_adult);
      var mode = t.sales_mode === "booking" ? (salesIssues(t).length ? "reserva precisa de revisão" : "reserva online") : "sob consulta";
      if (!c) return '<span class="bad">sem net</span> · ' + mode + ' · site ' + brl(t.price_pix);
      return mode + " · net " + brl(r.net_adult) + " (" + esc(supName(r.supplier_id)) + ") · site " + brl(t.price_pix) + ' · <b class="' + (c.ok ? "ok" : "bad") + '">' + (c.ok ? "sobra " + brl(c.sobra) : "abaixo do mínimo " + brl(c.floor)) + "</b>" + rateDate(r);
    }
    function footHtml(t) {
      var r = prefOf(t.slug), c = r && calc(t, r.net_adult);
      if (!c) return "Lance um net para calcular o preço mínimo.";
      var share = c.sobra * SPLIT / 100;
      return "Mínimo no site: <b>" + brl(c.floor) + " Pix · " + brl(c.floorCard) + " cartão</b> · divisão estimada " + esc(B.partner_name || "Sócio") + " " + brl(share) + " / " + esc(B.owner_name || "Maré Tur") + " " + brl(c.sobra - share);
    }
    function rowAttrs(t, net, margin) { return ' data-row data-name="' + esc(t.name) + '" data-net="' + (net ? "com" : "sem") + '" data-status="' + (t.active ? "on" : "off") + '" data-sort="' + t.sort + '" data-margin="' + (margin == null ? -1 : margin) + '"'; }
    function salesIssues(t) {
      var selected = rates.find(function (r) { return r.tour_slug === t.slug && r.preferred && r.active; });
      var supplier = selected && sups.find(function (s) { return String(s.id) === String(selected.supplier_id) && s.active; });
      var net = selected && (t.per_vehicle ? selected.net_vehicle : selected.net_adult);
      var floor = net == null ? null : calc(t, net);
      var issues = [];
      if (!supplier || net == null || !Number.isFinite(Number(net)) || Number(net) < 0) issues.push(t.per_vehicle ? "defina a operadora ativa com net por veículo" : "defina a operadora ativa com net preferido");
      if (!Number.isInteger(t.capacity_per_day) || t.capacity_per_day < 1) issues.push("informe vagas garantidas por dia");
      if (!Array.isArray(t.departure_weekdays) || !t.departure_weekdays.length) issues.push("selecione os dias de saída");
      if (settings.pix_payment_verified !== true || !String(settings.pix_key || "").trim() || !String(settings.pix_name || "").trim()) issues.push("verifique o destinatário e a chave Pix em Configurações");
      if (floor && (!floor.ok || Number(t.price_card) < floor.floorCard)) issues.push("revise o preço mínimo");
      return issues;
    }
    function salesSetup(t) {
      var id = "sales-" + esc(t.slug), capacity = t.capacity_per_day == null ? "" : t.capacity_per_day;
      if (!Object.prototype.hasOwnProperty.call(t, "sales_mode") || !Object.prototype.hasOwnProperty.call(t, "departure_weekdays")) {
        return '<label>Vagas/dia <input type="number" min="0" value="' + capacity + '" data-cap="' + esc(t.slug) + '"></label><p class="small muted">Reserva online disponível após a migração do banco.</p>';
      }
      var issues = salesIssues(t), current = t.sales_mode === "booking", days = t.departure_weekdays || [];
      return '<form class="formgrid" data-sales="' + esc(t.slug) + '">' +
        '<div class="field"><label class="label" for="' + id + '">Modo de venda</label><select id="' + id + '" name="sales_mode"><option value="consultation">Sob consulta</option><option value="booking"' + (current ? " selected" : "") + '>Reserva online</option></select></div>' +
        '<div class="field"><label class="label" for="' + id + '-capacity">Vagas garantidas por dia</label><input id="' + id + '-capacity" type="number" min="0" step="1" value="' + capacity + '" name="capacity_per_day" inputmode="numeric"></div>' +
        '<fieldset class="full"><legend>Dias de saída</legend><div class="row">' + ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(function (label, i) {
          return '<label class="check"><input type="checkbox" name="day" value="' + (i + 1) + '"' + (days.includes(i + 1) ? " checked" : "") + "> " + label + "</label>";
        }).join("") + '</div></fieldset><p class="small full ' + (issues.length ? "muted" : "ok") + '" data-sales-summary>' + (issues.length ? "Para habilitar a reserva online, " + issues.join(", ") + "." : "Dados de venda preenchidos. Confirme tarifa, calendário e vagas com a operadora antes de ativar.") + '</p>' +
        '<div class="row full"><button class="btn btn-mar" type="submit">Salvar modo e vagas</button></div></form>';
    }

    var seg = '<div class="seg">' + [["passeios", "Por passeio"], ["tabela", "Lançar tabela"], ["empresas", "Empresas (" + sups.length + ")"]].map(function (o) { return '<button type="button" data-mode="' + o[0] + '"' + (mode === o[0] ? ' class="on"' : "") + ">" + o[1] + "</button>"; }).join("") + "</div>";
    var body = "";

    if (mode === "passeios") {
      body = '<p class="small muted hint">Toque no passeio para ver e mudar o net. ★ marca a empresa que recebe as reservas. Muda e já salva.</p>' + tours.map(function (t) {
        var tr = rates.filter(function (r) { return r.tour_slug === t.slug; }), pr = prefOf(t.slug), c = pr && calc(t, pr.net_adult);
        var free = sups.filter(function (s) { return !tr.some(function (r) { return r.supplier_id === s.id; }); });
        return '<details class="nrow" data-tour="' + esc(t.slug) + '"' + rowAttrs(t, pr, c && c.sobra) + (openT === t.slug ? " open" : "") + '><summary><span class="nr-name">' + esc(t.name) + (t.active ? "" : ' <span class="muted">(oculto)</span>') + '</span><span class="nr-info">' + sumHtml(t) + "</span></summary>" +
          '<div class="nr-body">' +
          tr.map(function (r) {
            return '<div class="nr-rate" data-rate="' + r.id + '"><span class="nr-sup">' + esc(supName(r.supplier_id)) + (r.active ? "" : " (pausado)") + '<span data-rate-date>' + rateDate(r) + '</span></span><label class="nr-f">Net adulto<input type="number" inputmode="decimal" step="0.01" min="0" value="' + r.net_adult + '" data-k="net_adult"></label><label class="nr-f">Net criança<input type="number" inputmode="decimal" step="0.01" min="0" value="' + (r.net_child == null ? "" : r.net_child) + '" placeholder="= adulto" data-k="net_child"></label>' +
              (t.per_vehicle || t.price_private != null ? '<label class="nr-f">Net veículo<input type="number" inputmode="decimal" step="0.01" min="0" value="' + (r.net_vehicle == null ? "" : r.net_vehicle) + '" data-k="net_vehicle"></label>' : "") +
              '<button type="button" class="star' + (r.preferred ? " on" : "") + '" data-pref="' + r.id + '" title="Recebe as reservas">★</button><button type="button" class="xbtn" data-rdel="' + r.id + '" title="Excluir">✕</button></div>';
          }).join("") +
          (free.length ? '<div class="nr-add"><select data-newsup="' + esc(t.slug) + '" aria-label="Empresa">' + free.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + "</option>"; }).join("") + '</select><input type="number" inputmode="decimal" step="0.01" min="0" placeholder="Net" data-newnet="' + esc(t.slug) + '" aria-label="Net adulto"><button type="button" class="btn btn-mar" data-radd="' + esc(t.slug) + '">+</button></div>' : (sups.length ? "" : '<p class="small muted">Cadastre a empresa na aba Empresas.</p>')) +
          '<div class="nr-foot"><span data-foot>' + footHtml(t) + "</span></div>" + salesSetup(t) + "</div></details>";
      }).join("");
    } else if (mode === "tabela") {
      body = sups.length ? '<p class="small muted hint">Chegou a tabela de uma empresa? Escolha a empresa e digite o net de cada passeio. Só os campos alterados são salvos.</p>' +
        '<select id="tSup" class="tsup">' + sups.map(function (s) { return '<option value="' + s.id + '"' + (String(s.id) === String(cache.empSup) ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + "</select>" +
        '<div class="tlist">' + tours.map(function (t) {
          var r = rates.filter(function (x) { return x.tour_slug === t.slug && String(x.supplier_id) === String(cache.empSup); })[0], c = r && calc(t, r.net_adult);
          return '<div class="trow"' + rowAttrs(t, r, c && c.sobra) + '><div><b>' + esc(t.name) + (t.active ? "" : ' <span class="muted">(oculto)</span>') + "</b><small>site " + brl(t.price_pix) + ' · <span data-live="' + esc(t.slug) + '">' + (c ? (c.ok ? "sobra " + brl(c.sobra) : '<span class="bad">abaixo do mínimo ' + brl(c.floor) + "</span>") : "sem net") + '</span></small>' + (r ? rateDate(r) : '') + '</div><input type="number" inputmode="decimal" step="0.01" min="0" placeholder="net" value="' + (r ? r.net_adult : "") + '" data-orig="' + (r ? r.net_adult : "") + '" data-tnet="' + esc(t.slug) + '" data-rid="' + (r ? r.id : "") + '" aria-label="Net de ' + esc(t.name) + '"></div>';
        }).join("") + '</div><div class="savebar"><button type="button" class="btn btn-mar" id="tSave" disabled>Nada alterado</button></div>'
        : '<p class="small muted">Cadastre a empresa primeiro, na aba Empresas.</p>';
    } else {
      body = '<form id="sNew" class="nr-add sadd"><input id="sNewName" placeholder="Nome da nova empresa" aria-label="Nome"><input id="sNewWa" placeholder="WhatsApp 5585…" inputmode="tel" aria-label="WhatsApp"><button class="btn btn-mar" type="submit">+</button></form>' +
        (sups.length ? "" : '<p class="small muted">Nenhuma empresa ainda.</p>') +
        sups.map(function (s) {
          var nNet = rates.filter(function (r) { return r.supplier_id === s.id && r.active; }).length;
          var wa = s.whatsapp ? '<a href="https://wa.me/' + esc(s.whatsapp) + '" target="_blank" rel="noopener" data-stop>WhatsApp</a>' : '<span class="bad">falta WhatsApp</span>';
          return '<details class="nrow" data-sup="' + s.id + '"' + (openSup === s.id ? " open" : "") + '><summary><span class="nr-name">' + esc(s.name) + (s.active ? "" : ' <span class="muted">(inativa)</span>') + '</span><span class="nr-info">' + wa + " · " + nNet + (nNet === 1 ? " passeio com net" : " passeios com net") + "</span></summary>" +
            '<div class="nr-body"><div class="formgrid">' + f("su" + s.id + "_name", "Nome", s.name) + f("su" + s.id + "_whatsapp", "WhatsApp (55 + DDD)", s.whatsapp, "", 'inputmode="tel"') + f("su" + s.id + "_contact_name", "Contato", s.contact_name) + f("su" + s.id + "_pickup_notes", "Observações (horários, ponto de encontro)", s.pickup_notes) +
            ta("su" + s.id + "_msg_template", "Mensagem para a empresa (vazio = padrão). Use {codigo} {passeio} {data} {cliente} {telefone} {hotel} {pessoas} {cobrar} {total} {obs}", s.msg_template) + '<label class="check"><input type="checkbox" id="su' + s.id + '_active"' + (s.active ? " checked" : "") + "> Ativa</label></div>" +
            '<div class="row"><button class="btn btn-mar" type="button" data-ssave="' + s.id + '">Salvar</button><button class="btn btn-ghost" type="button" data-snet="' + s.id + '">Lançar tabela</button><button class="btn btn-danger" type="button" data-sdel="' + s.id + '">Excluir</button></div></div></details>';
        }).join("");
    }
    p.innerHTML = '<div class="item emp">' + seg + body + "</div>";

    async function again(keep) { var y = window.scrollY; Object.keys(keep || {}).forEach(function (k) { cache[k] = keep[k]; }); await render(); window.scrollTo(0, y); }
    function repaint(slug) { var t = tourOf(slug), d = p.querySelector('details[data-tour="' + slug + '"]'); if (!d || !t) return; d.querySelector(".nr-info").innerHTML = sumHtml(t); d.querySelector("[data-foot]").innerHTML = footHtml(t); var pr = prefOf(slug), c = pr && calc(t, pr.net_adult); d.dataset.net = pr ? "com" : "sem"; d.dataset.margin = c ? c.sobra : -1; }
    p.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { cache.empView = b.dataset.mode; render(); }); });
    p.querySelectorAll("[data-stop]").forEach(function (a) { a.addEventListener("click", function (e) { e.stopPropagation(); }); });

    // Por passeio: muda e salva na hora
    p.querySelectorAll("[data-rate] input").forEach(function (inp) { inp.addEventListener("change", async function () {
      var row = inp.closest("[data-rate]"), id = Number(row.dataset.rate), r = rates.filter(function (x) { return x.id === id; })[0], k = inp.dataset.k;
      var v = inp.value === "" ? null : Number(inp.value);
      if (k === "net_adult" && (v == null || v < 0)) { inp.value = r.net_adult; return U.toast("Digite o net."); }
      var upd = { updated_at: new Date().toISOString() }; upd[k] = v;
      var u = await sb.from("tour_rates").update(upd).eq("id", id); if (fail(u)) return;
      Object.assign(r, upd);
      row.querySelector("[data-rate-date]").innerHTML = rateDate(r);
      repaint(r.tour_slug); U.toast("Salvo.");
    }); });
    p.querySelectorAll("[data-pref]").forEach(function (b) { b.addEventListener("click", async function () {
      var id = Number(b.dataset.pref), r = rates.filter(function (x) { return x.id === id; })[0];
      if (r.preferred) return U.toast("Esta já recebe as reservas.");
      var c = await sb.from("tour_rates").update({ preferred: false }).eq("tour_slug", r.tour_slug).neq("id", id); if (fail(c)) return;
      var u = await sb.from("tour_rates").update({ preferred: true }).eq("id", id); if (fail(u)) return;
      rates.forEach(function (x) { if (x.tour_slug === r.tour_slug) x.preferred = x.id === id; });
      b.closest(".nr-body").querySelectorAll(".star").forEach(function (s) { s.classList.toggle("on", s === b); });
      repaint(r.tour_slug); U.toast(supName(r.supplier_id) + " recebe as reservas.");
    }); });
    p.querySelectorAll("[data-rdel]").forEach(function (b) { b.addEventListener("click", async function () {
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "?"; b.title = "Toque de novo para excluir"; U.toast("Toque de novo no ✕ para excluir."); return; }
      var id = Number(b.dataset.rdel), r = rates.filter(function (x) { return x.id === id; })[0];
      var u = await sb.from("tour_rates").delete().eq("id", id); if (fail(u)) return;
      again({ empOpenT: r.tour_slug });
    }); });
    p.querySelectorAll("[data-radd]").forEach(function (b) { b.addEventListener("click", async function () {
      var slug = b.dataset.radd, sel = p.querySelector('[data-newsup="' + slug + '"]'), net = p.querySelector('[data-newnet="' + slug + '"]');
      if (!sel.value || net.value === "") return U.toast("Digite o net.");
      var first = !rates.some(function (r) { return r.tour_slug === slug && r.preferred && r.active; });
      var i = await sb.from("tour_rates").insert({ tour_slug: slug, supplier_id: Number(sel.value), net_adult: Number(net.value), preferred: first }); if (fail(i)) return;
      U.toast("Net salvo."); again({ empOpenT: slug });
    }); });
    p.querySelectorAll("[data-cap]").forEach(function (inp) { inp.addEventListener("change", async function () { var v = inp.value === "" ? null : Math.max(0, parseInt(inp.value, 10) || 0); var u = await sb.from("tours").update({ capacity_per_day: v }).eq("slug", inp.dataset.cap); if (!fail(u)) U.toast(v == null ? "Sem limite de vagas." : v + " vagas por dia."); }); });
    p.querySelectorAll("[data-sales]").forEach(function (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var t = tourOf(form.dataset.sales), input = new FormData(form);
        var fields = {
          sales_mode: input.get("sales_mode"),
          capacity_per_day: input.get("capacity_per_day") === "" ? null : Number(input.get("capacity_per_day")),
          departure_weekdays: input.getAll("day").map(Number)
        };
        if (!fields.departure_weekdays.length) fields.departure_weekdays = null;
        var issues = salesIssues(Object.assign({}, t, fields));
        if (fields.sales_mode === "booking" && issues.length) {
          form.querySelector("[data-sales-summary]").textContent = "Para habilitar a reserva online, " + issues.join(", ") + ".";
          return U.toast("Confira os dados pendentes da venda.");
        }
        var btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        var u = await sb.from("tours").update(fields).eq("slug", t.slug);
        if (fail(u)) { btn.disabled = false; return; }
        U.toast("Modo de venda e vagas salvos."); again({ empOpenT: t.slug });
      });
    });

    // Lançar tabela
    var tSup = document.getElementById("tSup");
    if (tSup) {
      tSup.addEventListener("change", function () { cache.empSup = tSup.value; render(); });
      var save = document.getElementById("tSave");
      var changed = function () { return [].filter.call(p.querySelectorAll("[data-tnet]"), function (i) { return i.value !== i.dataset.orig && i.value !== ""; }); };
      p.querySelectorAll("[data-tnet]").forEach(function (inp) { inp.addEventListener("input", function () {
        var t = tourOf(inp.dataset.tnet), c = calc(t, inp.value), live = p.querySelector('[data-live="' + inp.dataset.tnet + '"]');
        live.innerHTML = c ? (c.ok ? "sobra " + brl(c.sobra) + " · mínimo " + brl(c.floor) : '<span class="bad">abaixo do mínimo ' + brl(c.floor) + "</span>") : "sem net";
        inp.closest(".trow").classList.toggle("chg", inp.value !== inp.dataset.orig);
        var n = changed().length; save.disabled = !n; save.textContent = n ? "Salvar " + n + (n === 1 ? " net" : " nets") : "Nada alterado";
      }); });
      save.addEventListener("click", async function () {
        var list = changed(); if (!list.length) return; save.disabled = true; save.textContent = "Salvando…";
        var sid = Number(tSup.value), ok = 0;
        for (var i = 0; i < list.length; i++) {
          var inp = list[i], slug = inp.dataset.tnet, v = Number(inp.value), q;
          if (inp.dataset.rid) q = await sb.from("tour_rates").update({ net_adult: v, active: true, updated_at: new Date().toISOString() }).eq("id", Number(inp.dataset.rid));
          else q = await sb.from("tour_rates").insert({ tour_slug: slug, supplier_id: sid, net_adult: v, preferred: !rates.some(function (r) { return r.tour_slug === slug && r.preferred && r.active; }) });
          if (fail(q)) break; ok++;
        }
        U.toast(ok + (ok === 1 ? " net salvo." : " nets salvos.")); again();
      });
    }

    // Empresas
    var sNew = document.getElementById("sNew");
    if (sNew) sNew.addEventListener("submit", async function (e) { e.preventDefault(); var n = document.getElementById("sNewName").value.trim(); if (!n) return U.toast("Digite o nome da empresa."); var i = await sb.from("suppliers").insert({ name: n, whatsapp: document.getElementById("sNewWa").value.replace(/\D/g, "") }).select("id").single(); if (!fail(i)) { U.toast("Empresa adicionada."); again({ supOpen: i.data && i.data.id }); } });
    p.querySelectorAll("[data-snet]").forEach(function (b) { b.addEventListener("click", function () { cache.empSup = b.dataset.snet; cache.empView = "tabela"; render(); }); });
    p.querySelectorAll("[data-ssave]").forEach(function (b) { b.addEventListener("click", async function () {
      var id = b.dataset.ssave, g = function (k) { return document.getElementById("su" + id + "_" + k); };
      var u = await sb.from("suppliers").update({ name: g("name").value.trim(), whatsapp: g("whatsapp").value.replace(/\D/g, ""), contact_name: g("contact_name").value.trim(), pickup_notes: g("pickup_notes").value.trim(), msg_template: g("msg_template").value.trim(), active: g("active").checked }).eq("id", id);
      if (!fail(u)) { U.toast("Empresa salva."); again(); } }); });
    p.querySelectorAll("[data-sdel]").forEach(function (b) { b.addEventListener("click", async function () { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toque de novo: apaga a empresa e os nets dela"; return; } var u = await sb.from("suppliers").delete().eq("id", b.dataset.sdel); if (!fail(u)) again(); }); });
  };

  VIEWS.financeiro = async function (p) {
    var month = cache.finMonth || new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7);
    var y = +month.slice(0, 4), m = +month.slice(5, 7), end = (m === 12 ? (y + 1) + "-01" : y + "-" + String(m + 1).padStart(2, "0")) + "-01";
    var res = await Promise.all([sb.from("bookings").select("*").gte("tour_date", month + "-01").lt("tour_date", end).neq("status", "cancelado"), sb.from("suppliers").select("id,name"), bizData(),
      sb.from("bookings").select("*").is("settlement_done_at", null).not("boarded_at", "is", null).neq("supplier_settlement", 0).in("status", ["confirmado", "realizado"])]);
    if (fail(res[0]) || fail(res[1]) || fail(res[3])) return;
    var B = res[2], partner = B.partner_name || "Sócio", owner = B.owner_name || "Pablo";
    var sname = {}; res[1].data.forEach(function (s) { sname[s.id] = s.name; });
    var sold = res[0].data.filter(function (x) { return ["pago", "confirmado", "realizado"].indexOf(x.status) > -1 && !x.no_show; });
    var sum = function (k, l) { return (l || sold).reduce(function (a, x) { return a + Number(x[k] || 0); }, 0); };
    var noNet = sold.filter(function (x) { return x.net_total == null; });
    var profit = sum("profit"), share = sum("partner_share");
    var open = res[3].data, byS = {};
    open.forEach(function (x) { var k = x.supplier_id || 0; (byS[k] = byS[k] || []).push(x); });
    p.innerHTML = '<div class="row"><label class="label" for="finM">Mês dos passeios</label><input type="month" id="finM" value="' + month + '" style="width:auto"><span class="muted small">' + sold.length + " vendas pagas · " + res[0].data.filter(function (x) { return x.status === "pendente" && !holdExpired(x); }).length + " esperando pagamento</span></div>" +
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
    var stored = r.data && r.data.data || {};
    var s = Object.assign({}, D.SEED.settings, stored, {
      deposit_pct: stored.deposit_pct == null ? 20 : stored.deposit_pct,
      reservation_hold_minutes: stored.reservation_hold_minutes == null ? 30 : stored.reservation_hold_minutes,
      pix_key: stored.pix_key || "", pix_name: stored.pix_name || ""
    });
    var F = [["brand", "Nome da marca"], ["brand_sub", "Linha abaixo do nome"], ["whatsapp", "WhatsApp de atendimento (com 55 e DDD)"], ["instagram", "Instagram (sem @)"],
      ["pix_key", "Chave Pix"], ["pix_name", "Nome que aparece no Pix"], ["hero_eyebrow", "Selo da capa"], ["hero_title", "Título da capa"],
      ["rating_value", "Nota real do Google (deixe vazio até ter)"], ["rating_count", "Quantidade real de avaliações (vazio esconde as notas)"], ["pack_discount_pct", "Desconto de pacote (%)", "n"],
      ["deposit_pct", "Sinal sobre o total (%)", "n", 'type="number" min="0" max="100" step="0.01" required'],
      ["reservation_hold_minutes", "Prazo para pagamento da reserva (min)", "n", 'type="number" min="5" max="120" step="1" required'],
      ["child_factor", "Criança paga (0,5 = meia)", "n"], ["footer_note", "Rodapé"],
      ["cutoff_hour", "Horário de corte das saídas do dia seguinte (0 a 23)", "n"], ["google_review_url", "Link de avaliação no Google"], ["followup_coupon", "Cupom para cliente da casa (pós-venda)"]];
    var BZ = await bizData();
    var BF = [["partner_name", "Nome do sócio operador"], ["owner_name", "Seu nome"], ["partner_split_pct", "Parte do sócio no lucro (%)", "n"], ["ad_cost_per_pax", "Custo de anúncio por passageiro (R$)", "n"],
      ["min_margin_per_pax", "Margem mínima por passageiro (R$)", "n"], ["card_fee_pct", "Taxa do cartão (%)", "n"], ["ops_whatsapp", "WhatsApp do sócio operador"], ["notify_topic", "Canal de aviso no celular (ntfy)"], ["admin_url", "Endereço do painel"]];
    p.innerHTML = '<div class="item"><h3>Configurações do site</h3><form id="sf" class="formgrid">' +
      F.map(function (x) { return f("s_" + x[0], x[1], s[x[0]], "", x[3] || (x[2] === "n" ? 'type="number" step="0.01"' : "")); }).join("") +
      '<label class="check full"><input type="checkbox" id="s_pix_payment_verified"' + (stored.pix_payment_verified === true ? " checked" : "") + '> Conferi a chave Pix e o nome do destinatário para receber reservas</label><p class="small muted full">Salve a chave e o nome primeiro. Depois de conferir os dados, marque a verificação e salve novamente.</p>' +
      ta("s_hero_promises", "Promessas da capa (uma por linha)", (s.hero_promises || []).join("\n")) + ta("s_cancel_policy", "Regra de cancelamento e chuva", s.cancel_policy) +
      '<div class="row full"><button class="btn btn-mar" type="submit">Salvar configurações</button></div></form></div>' +
      '<div class="item"><h3>Regras do negócio (só administradores veem)</h3><p class="small muted">Base do preço mínimo e da divisão do lucro. Aviso de nova reserva: instale o app ntfy no celular e assine o canal abaixo (grátis, sem cadastro). O aviso não leva nome nem telefone do cliente.</p><form id="bf" class="formgrid">' +
      BF.map(function (x) { return f("b_" + x[0], x[1], BZ[x[0]], "", x[2] === "n" ? 'type="number" step="0.01"' : ""); }).join("") +
      '<div class="row full"><button class="btn btn-mar" type="submit">Salvar regras</button>' + (BZ.notify_topic ? '<a class="btn btn-ghost" href="https://ntfy.sh/' + encodeURIComponent(BZ.notify_topic) + '" target="_blank" rel="noopener">Abrir canal de aviso</a>' : "") + '<button class="btn btn-ghost" type="button" id="ntest">Mandar aviso de teste</button></div></form></div>' +
      '<div class="item"><h3>Administradores</h3><p class="small muted">E-mails que podem entrar neste painel.</p><div id="admins"></div><form id="af" class="row"><input id="newAdmin" type="email" placeholder="email@exemplo.com" style="flex:1;min-width:200px"><button class="btn btn-ghost" type="submit">Adicionar</button></form></div>';
    function readSiteFields() {
      var values = {};
      F.forEach(function (x) {
        var value = document.getElementById("s_" + x[0]).value.trim();
        values[x[0]] = x[2] === "n" ? Number(value.replace(",", ".")) : value;
      });
      values.whatsapp = values.whatsapp.replace(/\D/g, "");
      values.hero_promises = document.getElementById("s_hero_promises").value.split("\n").map(function (z) { return z.trim(); }).filter(Boolean);
      values.cancel_policy = document.getElementById("s_cancel_policy").value.trim();
      return values;
    }
    var originalFields = readSiteFields(), verified = document.getElementById("s_pix_payment_verified");
    document.getElementById("sf").addEventListener("submit", async function (e) {
      e.preventDefault();
      var draft = readSiteFields(), hold = draft.reservation_hold_minutes, pct = draft.deposit_pct;
      if (!Number.isFinite(pct) || pct < 0 || pct > 100 || !document.getElementById("s_deposit_pct").value) return U.toast("Informe o sinal entre 0% e 100%.");
      if (!Number.isInteger(hold) || hold < 5 || hold > 120) return U.toast("Informe um prazo inteiro de 5 a 120 minutos.");
      var save = e.currentTarget.querySelector("button[type=submit]");
      save.disabled = true;
      var newest = await sb.from("settings").select("data").eq("id", 1).maybeSingle();
      if (fail(newest)) { save.disabled = false; return; }
      var fresh = Object.assign({}, newest.data && newest.data.data || {});
      var pixChanged = draft.pix_key !== originalFields.pix_key || draft.pix_name !== originalFields.pix_name;
      var verifyChanged = verified.checked !== (stored.pix_payment_verified === true);
      if ((pixChanged || verifyChanged) && (String(fresh.pix_key || "").trim() !== originalFields.pix_key || String(fresh.pix_name || "").trim() !== originalFields.pix_name)) {
        U.toast("Os dados Pix mudaram em outro acesso. Confira os dados atualizados."); render(); return;
      }
      if (verifyChanged && verified.checked && !pixChanged && (!draft.pix_key || !draft.pix_name)) {
        save.disabled = false; return U.toast("Preencha a chave e o nome do destinatário antes de verificar.");
      }
      Object.keys(draft).forEach(function (key) {
        if (JSON.stringify(draft[key]) !== JSON.stringify(originalFields[key])) fresh[key] = draft[key];
      });
      if (fresh.deposit_pct == null) fresh.deposit_pct = pct;
      if (fresh.reservation_hold_minutes == null) fresh.reservation_hold_minutes = hold;
      if (pixChanged) fresh.pix_payment_verified = false;
      else if (verifyChanged) fresh.pix_payment_verified = verified.checked;
      var u = await sb.from("settings").upsert({ id: 1, data: fresh, updated_at: new Date().toISOString() });
      if (fail(u)) { save.disabled = false; return; }
      U.toast(pixChanged ? "Dados Pix salvos. Confira o destinatário e verifique em seguida." : "Configurações salvas.");
      render();
    });
    document.getElementById("bf").addEventListener("submit", async function (e) {
      e.preventDefault(); var d = {};
      BF.forEach(function (x) {
        var v = document.getElementById("b_" + x[0]).value.trim();
        if (x[2] === "n") v = Number(v.replace(",", ".")) || 0;
        if (x[0] === "ops_whatsapp") v = String(v).replace(/\D/g, "");
        if (String(BZ[x[0]] == null ? "" : BZ[x[0]]) !== String(v)) d[x[0]] = v;
      });
      if (d.partner_split_pct < 0 || d.partner_split_pct > 100) return U.toast("A parte do sócio vai de 0 a 100%.");
      var u = await saveBizFields(d, BZ); if (!fail(u)) { U.toast("Regras salvas."); render(); }
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
