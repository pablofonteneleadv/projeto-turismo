"""Teste do painel com dados simulados (não toca no banco real).
Uso: python tests/teste_painel.py http://127.0.0.1:8766/
Verifica: abas abrem sem erro, operação do dia, botão "Enviar à empresa" com os dados
do cliente, financeiro (lucro e divisão) e empresas/net (mínimo).
"""
import json, sys, time, re, urllib.parse
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8766/"
REF = "zieriwhbxloeavaihxyl"
import os
CFG = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site-v2", "config.js"), encoding="utf-8").read()
ANON = re.search(r'supabaseKey:\s*"([^"]+)"', CFG).group(1)
tmr = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 3600 + 86400))
month = tmr[:7]

BOOK = dict(id=1, code="MT-1001", created_at=tmr + "T10:00:00Z", tour_slug="cumbuco", tour_name="Cumbuco", tour_date=tmr, kind="grupo",
            adults=2, children=0, seniors=0, buggy_cars=0, coupon=None, pay_method="pix", total=160, customer_name="Ana Teste", phone="5585988887777",
            hotel="Hotel Praia Mar", notes=None, status="pago", supplier_id=7, base=160, buggy_amount=0, discount=0, floor_applied=False, net_total=60,
            ad_cost=10, commission=0, card_fee=0, deposit=32, collect_at_boarding=128, supplier_settlement=68, settlement_done_at=None, profit=90,
            partner_share=45, sent_to_supplier_at=None, boarded_at=tmr + "T08:00:00Z", no_show=False, reminder_sent_at=None, review_asked_at=None,
            offer_sent_at=None, lang="es", source="instagram")
DATA = {
    "bookings": [BOOK],
    "suppliers": [dict(id=7, name="Enseada Teste", whatsapp="5585911112222", contact_name="", pickup_notes="", msg_template="", active=True)],
    "tour_rates": [dict(id=3, tour_slug="cumbuco", supplier_id=7, net_adult=30, net_child=None, net_vehicle=None, preferred=True, active=True, notes="")],
    "biz_settings": [dict(id=1, data=dict(ad_cost_per_pax=5, min_margin_per_pax=10, partner_name="Bruno", owner_name="Pablo", partner_split_pct=50, card_fee_pct=5, notify_topic="maretur-teste", admin_url=BASE + "admin.html"))],
    "admin_emails": [dict(email="admin@teste.local")],
}
UPDATES = []

def handle(route, req):
    u = urllib.parse.urlparse(req.url)
    if "/auth/v1/" in u.path:
        return route.fulfill(status=200, content_type="application/json", body="{}")
    if "/rest/v1/rpc/" in u.path:
        fn = u.path.rsplit("/", 1)[1]
        body = {"is_admin": True, "min_tour_date": tmr}.get(fn)
        if fn in ("assign_supplier", "admin_notify_test"): UPDATES.append((fn, req.post_data)); body = None
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
    table = u.path.rsplit("/", 1)[1]
    if req.method in ("PATCH", "POST", "DELETE"):
        UPDATES.append((table, req.method, req.post_data))
        return route.fulfill(status=204, body="")
    rows = DATA.get(table)
    if rows is None:
        # leitura pública (passeios, configurações) vai ao banco real com a chave pública
        h = dict(req.headers); h["authorization"] = "Bearer " + ANON
        return route.continue_(headers=h)
    single = "vnd.pgrst.object" in (req.headers.get("accept") or "")
    return route.fulfill(status=200, content_type="application/json", headers={"content-range": "0-%d/%d" % (len(rows) - 1, len(rows))},
                         body=json.dumps(rows[0] if single and rows else (None if single else rows)))

fails = []
def check(cond, msg):
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={"width": 420, "height": 900})
    sess = {"access_token": "x", "refresh_token": "y", "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600,
            "user": {"id": "00000000-0000-0000-0000-000000000000", "email": "admin@teste.local", "aud": "authenticated", "role": "authenticated"}}
    ctx.add_init_script("localStorage.setItem('sb-%s-auth-token', %s)" % (REF, json.dumps(json.dumps(sess))))
    p = ctx.new_page()
    errs = []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.route("**/zieriwhbxloeavaihxyl.supabase.co/**", handle)
    p.set_default_timeout(60000)
    p.goto(BASE + "admin.html#MT-1001")
    p.wait_for_selector("text=Ana Teste")
    check("MT-1001" in p.inner_text("#panel"), "link do aviso abre a reserva pelo código")
    check("lucro R$" in p.inner_text("#panel").replace("\xa0", " "), "reserva mostra net e lucro")
    href = p.get_attribute('[data-sent="1"]', "href") or ""
    msg = urllib.parse.unquote(href.split("text=", 1)[-1])
    check(href.startswith("https://wa.me/5585911112222"), "Enviar à empresa vai para o WhatsApp da empresa")
    for part in ["MT-1001", "Ana Teste", "5585988887777", "Hotel Praia Mar", "2 adulto(s)", "128,00"]:
        check(part in msg, "mensagem à empresa contém " + part)

    # navegação 2.0 no celular: barra de baixo + "Mais"
    check(p.is_visible(".bnav"), "barra de navegação embaixo no celular")
    p.click("#moreBtn"); check(p.is_visible("#msheet"), "Mais abre todas as seções"); p.click("#mclose")
    # reservas: busca e filtros
    check(p.is_visible("#tq"), "reservas têm busca")
    p.fill("#tq", "zzzz"); p.wait_for_timeout(300)
    check("Nada encontrado" in p.inner_text("#panel"), "busca sem resultado avisa")
    p.fill("#tq", "praia mar"); p.wait_for_timeout(300)
    check(p.is_visible("[data-row]") and ("1 item" in p.inner_text("#pcount") or "1 de" in p.inner_text("#pcount")), "busca por hotel acha a reserva")
    p.click("#tclear")
    def go(key):
        p.evaluate("k => document.querySelector('.side [data-tab=\"'+k+'\"]').click()", key)
        p.wait_for_function("!document.querySelector('#panel').innerText.includes('Carregando')")
        return p.inner_text("#panel").replace(" ", " ")
    for key in ["operacao", "empresas", "financeiro", "config", "inicio", "passeios", "cupons", "avaliacoes", "perguntas", "contatos", "parceiros"]:
        txt = go(key)
        check("Erro ao carregar" not in txt and "Não foi possível carregar" not in txt, "seção " + key + " abre sem erro")
        if key == "operacao":
            p.click('button[data-day="%s"]' % tmr); p.wait_for_timeout(1500)
            txt = p.inner_text("#panel").replace(" ", " ")
            check("Enseada Teste" in txt and "Receber no embarque: R$ 128,00" in txt, "operação agrupa por empresa com valor a receber")
            check(p.query_selector("[data-sendall]") is not None, "botão de lista do dia para a empresa")
            check("Lembrete ao cliente" in txt, "botão de lembrete ao cliente")
        if key == "empresas":
            p.click("#tclear")
            check("mínimo R$ 45,00 Pix" in p.inner_text("#panel").replace(" ", " "), "mínimo do Cumbuco = 30 + 5 + 10 = R$ 45")
            p.select_option('[data-fk="net"]', "sem"); p.wait_for_timeout(200)
            vis = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => e.dataset.net)")
            check(vis and all(v == "sem" for v in vis), "filtro 'sem net' mostra só passeios sem net")
            p.click("#tclear")
        if key == "financeiro":
            p.fill("#finM", month); p.dispatch_event("#finM", "change")
            p.wait_for_function("!document.querySelector('#panel').innerText.includes('Carregando')")
            txt = p.inner_text("#panel").replace(" ", " ")
            check("R$ 90,00" in txt and "R$ 45,00" in txt, "lucro R$ 90 e parte do sócio R$ 45")
            check("a receber R$ 68,00" in txt, "acerto: empresa devolve R$ 68")
        if key == "config":
            check("parte do sócio no lucro" in txt.lower() and "mandar aviso de teste" in txt.lower(), "regras do negócio configuráveis")
        if key == "passeios":
            p.click("#tclear"); p.fill("#tq", "jeri"); p.wait_for_timeout(300)
            names = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => e.dataset.name)")
            check(len(names) >= 3 and all("jeri" in n.lower() for n in names), "busca 'jeri' filtra passeios (%d)" % len(names))
            p.fill("#tq", ""); p.wait_for_timeout(300)
            p.select_option("#tsort", "name_d"); p.wait_for_timeout(200)
            names = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => e.dataset.name)")
            check(names == sorted(names, key=lambda x: x.lower(), reverse=True) or names[0].lower() >= names[-1].lower(), "ordenar por nome Z–A")
            p.select_option("#tsort", "price"); p.wait_for_timeout(200)
            pr = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => +e.dataset.price)")
            check(pr == sorted(pr), "ordenar por menor preço")
            p.select_option("#tsort", "sort")
            p.click("#tclear"); p.fill("#tq", "cumbuco"); p.wait_for_timeout(300)
            p.click('[data-prices="cumbuco"]')
            check(p.is_visible(".pedit"), "botão Preços abre os preços dentro do card")
            check("R$ 45,00" in p.inner_text(".pedit").replace(" ", " "), "card mostra o mínimo pelo net")
            p.fill(".pedit input[id$='_pix']", "40"); p.click("[data-psave]"); p.wait_for_timeout(500)
            check(p.is_visible(".pedit"), "preço abaixo do mínimo é recusado no painel")
            p.click("[data-pcancel]")
            p.click("#allPrices"); p.wait_for_function("!document.querySelector('#panel').innerText.includes('Carregando')")
            check(p.is_visible("#saveAll") and p.is_visible("#backTours"), "tabela com todos os preços continua disponível")
            p.click("#backTours"); p.wait_for_function("!document.querySelector('#panel').innerText.includes('Carregando')")
    check(not errs, "sem erro de JavaScript: " + "; ".join(errs[:3]))
    b.close()

print("\n%d falha(s)" % len(fails))
sys.exit(1 if fails else 0)
