"""Teste do painel com dados simulados (não toca no banco real).
Uso: python tests/teste_painel.py http://127.0.0.1:8766/
Verifica abas, operação, envios, financeiro, net, Pix e prontidão das ofertas.
TURISMO_TEST_SUPABASE_JS permite servir uma cópia local do SDK da página.
"""
import json
import os
import re
import sys
import time
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8766/"
CFG = (Path(__file__).resolve().parents[1] / "site-v2/config.js").read_text(encoding="utf-8")
HOST = urllib.parse.urlparse(re.search(r'supabaseUrl:\s*"([^"]+)"', CFG).group(1)).hostname
REF = HOST.split(".")[0]
today = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 3600))
tmr = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 3600 + 86400))
month = today[:7]

BOOK = dict(id=1, code="MT-1001", created_at=today + "T10:00:00Z", tour_slug="cumbuco", tour_name="Cumbuco", tour_date=today, kind="grupo",
            adults=2, children=0, seniors=0, buggy_cars=0, coupon=None, pay_method="pix", total=160, customer_name="Ana Teste", phone="5585988887777",
            hotel="Hotel Praia Mar", notes=None, status="confirmado", supplier_id=7, base=160, buggy_amount=0, discount=0, floor_applied=False, net_total=60,
            ad_cost=10, commission=0, card_fee=0, deposit=32, collect_at_boarding=128, supplier_settlement=68, settlement_done_at=None, profit=90,
            partner_share=45, sent_to_supplier_at=None, boarded_at=None, no_show=False, reminder_sent_at=None, review_asked_at=None,
            offer_sent_at=None, lang="es", source="instagram", attribution={"source": "instagram", "campaign": "cumbuco-teste"})

def tour(slug, name, price, sort):
    return dict(slug=slug, name=name, price_pix=price, price_card=round(price * 1.05), sort=sort, active=True,
                category="passeios", photos=[], per_vehicle=False, capacity_per_day=None, sales_mode="consultation", departure_weekdays=None)

SETTINGS = dict(brand="Maré Tur Teste", pix_key="pix@teste.local", pix_name="Operação de Teste", pix_payment_verified=True,
                deposit_per_person=35, cancel_policy="", propriedade_legada="preservar")
DATA = {
    "bookings": [BOOK],
    "suppliers": [dict(id=7, name="Enseada Teste", whatsapp="5585911112222", contact_name="", pickup_notes="", msg_template="", active=True)],
    "tour_rates": [dict(id=3, tour_slug="cumbuco", supplier_id=7, net_adult=30, net_child=None, net_vehicle=None, preferred=True, active=True,
                       updated_at="2025-01-01T01:30:00Z", notes="")],
    "tours": [tour("cumbuco", "Cumbuco", 80, 1), tour("lagoinha", "Lagoinha", 100, 2), tour("aguas", "Águas Belas", 80, 3),
              tour("jeri", "Jeri Economy", 220, 4), tour("jeri-vip", "Jeri VIP", 310, 5), tour("jeri-blue", "Jeri Blue", 350, 6)],
    "settings": [dict(id=1, data=SETTINGS)],
    "biz_settings": [dict(id=1, data=dict(ad_cost_per_pax=5, min_margin_per_pax=10, partner_name="Bruno", owner_name="Pablo", partner_split_pct=50, card_fee_pct=5, notify_topic="maretur-teste", admin_url=BASE + "admin.html"))],
    "admin_emails": [dict(email="admin@teste.local")],
}
UPDATES = []

def matching_rows(table, query):
    rows = DATA.get(table, [])
    criteria = urllib.parse.parse_qs(query)
    for field, values in criteria.items():
        kind, _, value = values[0].partition(".")
        if kind == "eq":
            rows = [row for row in rows if str(row.get(field)).lower() == value.lower()]
        elif kind == "neq":
            rows = [row for row in rows if str(row.get(field)).lower() != value.lower()]
        elif kind == "in":
            rows = [row for row in rows if str(row.get(field)) in value.strip("()").split(",")]
        elif kind == "is" and value == "null":
            rows = [row for row in rows if row.get(field) is None]
        elif kind == "not" and value == "is.null":
            rows = [row for row in rows if row.get(field) is not None]
    return rows

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
    rows = matching_rows(table, u.query)
    if req.method in ("PATCH", "POST", "DELETE"):
        UPDATES.append((table, req.method, req.post_data))
        patch = json.loads(req.post_data or "{}")
        if req.method == "PATCH":
            for row in rows:
                row.update(patch)
        if req.method == "POST" and table == "settings":
            DATA["settings"][0].update(patch)
        if req.method == "PATCH" and table == "biz_settings" and "return=representation" in req.headers.get("prefer", ""):
            return route.fulfill(status=200, content_type="application/json", body=json.dumps([{"id": r["id"]} for r in rows]))
        return route.fulfill(status=204, headers={"content-range": "*/%d" % len(rows)}, body="")
    single = "vnd.pgrst.object" in (req.headers.get("accept") or "")
    return route.fulfill(status=200, content_type="application/json", headers={"content-range": "*/%d" % len(rows)},
                         body=json.dumps(rows[0] if single and rows else (None if single else rows)))

fails = []
def check(cond, msg):
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

with sync_playwright() as pw:
    chromium = os.getenv("TURISMO_TEST_CHROMIUM")
    b = pw.chromium.launch(executable_path=chromium or None,
                           args=["--no-sandbox", "--no-zygote", "--single-process"] if chromium else None)
    ctx = b.new_context(viewport={"width": 420, "height": 900})
    sess = {"access_token": "x", "refresh_token": "y", "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600,
            "user": {"id": "00000000-0000-0000-0000-000000000000", "email": "admin@teste.local", "aud": "authenticated", "role": "authenticated"}}
    ctx.add_init_script("localStorage.setItem('sb-%s-auth-token', %s)" % (REF, json.dumps(json.dumps(sess))))
    p = ctx.new_page()
    errs = []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.route("**/" + HOST + "/**", handle)
    sdk = os.getenv("TURISMO_TEST_SUPABASE_JS")
    if sdk:
        p.route("**/cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js", lambda route: route.fulfill(
            path=sdk, content_type="application/javascript"))
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
    check("cumbuco-teste" in p.inner_text("#panel"), "campanha aparece no painel privado")
    n0 = len(UPDATES)
    p.locator('[data-sent="1"]').evaluate("a => a.addEventListener('click', e => e.preventDefault())")
    p.click('[data-sent="1"]')
    check(len(UPDATES) == n0, "abrir WhatsApp da empresa não marca envio")

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
            p.click('button[data-day="%s"]' % today)
            p.wait_for_selector('[data-sendall="7"]')
            txt = p.inner_text("#panel").replace(" ", " ")
            check("Enseada Teste" in txt and "Receber no embarque: R$ 128,00" in txt, "operação agrupa por empresa com valor a receber")
            check(p.query_selector("[data-sendall]") is not None, "botão de lista do dia para a empresa")
            check("Abrir lembrete ao cliente" in txt, "botão de lembrete ao cliente")
            n0 = len(UPDATES)
            for selector in ('[data-sendall="7"]', '[data-remind="1"]'):
                p.locator(selector).evaluate("a => a.addEventListener('click', e => e.preventDefault())")
                p.click(selector)
            check(len(UPDATES) == n0, "abrir lista e abrir lembrete não registram envio")
            p.click('[data-record-list="7"]')
            p.wait_for_selector("text=Envio à empresa registrado")
            check(bool(BOOK["sent_to_supplier_at"]) and not BOOK["reminder_sent_at"], "envio da lista é registrado explicitamente")
            p.click('[data-record-message="remind"]')
            p.wait_for_selector("text=Lembrete registrado")
            check(bool(BOOK["reminder_sent_at"]), "lembrete é registrado explicitamente")
            p.click('[data-booking-action="boarded"]')
            p.wait_for_selector("text=Embarcou")
            check(BOOK["boarded_at"] and BOOK["status"] == "confirmado", "embarque fica separado de passeio realizado")
            p.click('[data-booking-action="completed"]')
            check(BOOK["status"] == "confirmado", "realização exige confirmação da operadora")
            p.click('[data-booking-action="completed"]')
            p.wait_for_selector("text=Realizado")
            check(BOOK["status"] == "realizado", "realização confirmada é registrada")
        if key == "empresas":
            p.click("#tclear")
            row = 'details[data-tour="cumbuco"]'
            nb = lambda s: p.inner_text(s).replace(" ", " ")
            check("sobra R$ 45" in nb(row + " summary"), "linha fechada do Cumbuco já mostra net e sobra")
            check("31/12/2024" in nb(row + " summary") and p.is_visible(row + " summary .net-date.bad"),
                  "resumo usa a data de Fortaleza e sinaliza net antigo")
            check(not p.is_visible(row + " [data-rate]"), "passeios começam fechados (lista curta)")
            p.click(row + " summary")
            check(p.is_visible(row + " [data-rate-date] time"), "a data fica junto da tarifa da empresa")
            check("R$ 45 Pix" in nb(row + " [data-foot]"), "mínimo do Cumbuco = 30 + 5 + 10 = R$ 45")
            form = '[data-sales="cumbuco"]'
            p.select_option(form + ' [name="sales_mode"]', "booking")
            n0 = len(UPDATES)
            p.click(form + ' button[type="submit"]')
            check(len(UPDATES) == n0 and "vagas garantidas" in nb(form + " [data-sales-summary]"), "reserva online exige calendário e vagas")
            p.fill(form + ' [name="capacity_per_day"]', "6")
            p.check(form + ' [name="day"][value="1"]')
            p.check(form + ' [name="day"][value="5"]')
            p.click(form + ' button[type="submit"]')
            p.wait_for_selector(row + ' summary:has-text("reserva online")')
            tour_row = DATA["tours"][0]
            check(tour_row["sales_mode"] == "booking" and tour_row["departure_weekdays"] == [1, 5] and tour_row["capacity_per_day"] == 6,
                  "modo de venda, dias ISO e vagas são salvos juntos")
            if os.environ.get("SHOTS"): p.screenshot(path="reports/painel-net-passeio.png", full_page=False)
            n0 = len(UPDATES); p.fill(row + ' [data-k="net_adult"]', "40"); p.dispatch_event(row + ' [data-k="net_adult"]', "change"); p.wait_for_timeout(500)
            check(any(u[0] == "tour_rates" and u[1] == "PATCH" for u in UPDATES[n0:]), "mudar o net salva sozinho, sem botão")
            check("sobra R$ 35" in nb(row + " summary"), "resumo atualiza na hora (sobra 80 - 40 - 5 = 35)")
            check(p.get_attribute(row + " [data-rate-date] time", "datetime") == DATA["tour_rates"][0]["updated_at"]
                  and not p.is_visible(row + " summary .net-date.bad"), "alterar o net atualiza a data e limpa o alerta")
            p.select_option('[data-fk="net"]', "sem"); p.wait_for_timeout(200)
            vis = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => e.dataset.net)")
            check(vis and all(v == "sem" for v in vis), "filtro 'sem net' mostra só passeios sem net")
            p.click("#tclear")
            p.click('[data-mode="tabela"]'); p.wait_for_selector("#tSup")
            check(p.is_disabled("#tSave"), "tabela começa sem nada alterado")
            check(p.is_visible('.trow:has([data-tnet="cumbuco"]) .net-date time'), "Lançar tabela mostra a data do net salvo")
            p.fill('[data-tnet="lagoinha"]', "60"); p.wait_for_timeout(100)
            check("sobra R$ 35" in nb('[data-live="lagoinha"]'), "tabela calcula a sobra ao digitar (100 - 60 - 5)")
            p.fill('[data-tnet="aguas"]', "90"); p.wait_for_timeout(100)
            check("abaixo do mínimo" in nb('[data-live="aguas"]'), "tabela avisa net que deixa o preço abaixo do mínimo")
            check("Salvar 2 nets" in nb("#tSave"), "botão conta os nets alterados")
            if os.environ.get("SHOTS"): p.screenshot(path="reports/painel-net-tabela.png", full_page=False)
            n0 = len(UPDATES); p.click("#tSave"); p.wait_for_timeout(1500)
            check(len([u for u in UPDATES[n0:] if u[0] == "tour_rates" and u[1] == "POST"]) == 2, "salvar tabela grava os 2 nets novos")
            p.click('[data-mode="empresas"]'); p.wait_for_selector("#sNew")
            check(not p.is_visible("#su7_name"), "empresas aparecem fechadas")
            p.click('details[data-sup="7"] summary')
            check(p.is_visible("#su7_name"), "tocar abre a empresa para editar")
            p.click('[data-mode="passeios"]'); p.wait_for_selector("details[data-tour]")
        if key == "financeiro":
            p.fill("#finM", month); p.dispatch_event("#finM", "change")
            p.wait_for_function("!document.querySelector('#panel').innerText.includes('Carregando')")
            txt = p.inner_text("#panel").replace(" ", " ")
            check("R$ 90,00" in txt and "R$ 45,00" in txt, "lucro R$ 90 e parte do sócio R$ 45")
            check("a receber R$ 68,00" in txt, "acerto: empresa devolve R$ 68")
        if key == "config":
            check("parte do sócio no lucro" in txt.lower() and "mandar aviso de teste" in txt.lower(), "regras do negócio configuráveis")
            check(p.input_value("#s_deposit_pct") == "20", "sinal antigo em reais não vira percentual")
            p.fill("#s_deposit_pct", "25")
            p.fill("#s_reservation_hold_minutes", "45")
            p.fill("#s_pix_key", "novo-pix@teste.local")
            p.click('#sf button[type="submit"]')
            p.wait_for_selector("#s_pix_payment_verified:not(:checked)")
            updated = DATA["settings"][0]["data"]
            check(updated["deposit_pct"] == 25 and updated["reservation_hold_minutes"] == 45, "sinal percentual e prazo são salvos")
            check(updated["deposit_per_person"] == 35 and updated["propriedade_legada"] == "preservar", "configuração preserva chaves antigas e desconhecidas")
            check(updated["pix_payment_verified"] is False, "alterar dados Pix invalida a verificação")
            p.check("#s_pix_payment_verified")
            with p.expect_response(lambda response: response.request.method == "POST" and "/rest/v1/settings" in response.url):
                p.click('#sf button[type="submit"]')
            p.wait_for_selector('#sf button[type="submit"]:enabled')
            check(DATA["settings"][0]["data"]["pix_payment_verified"] is True, "dados Pix salvos podem ser verificados depois")
        if key == "passeios":
            p.click("#tclear"); p.fill("#tq", "jeri"); p.wait_for_timeout(300)
            names = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => e.dataset.name)")
            check(len(names) >= 3 and all("jeri" in n.lower() for n in names), "busca 'jeri' filtra passeios (%d)" % len(names))
            p.fill("#tq", ""); p.wait_for_timeout(300)
            p.select_option("#tsort", "name_d"); p.wait_for_timeout(200)
            names = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => e.dataset.name)")
            check(names == p.evaluate("(names) => [...names].sort((a, b) => b.localeCompare(a, 'pt-BR'))", names), "ordenar por nome Z–A")
            p.select_option("#tsort", "price"); p.wait_for_timeout(200)
            pr = p.eval_on_selector_all("[data-row]:not([hidden])", "els => els.map(e => +e.dataset.price)")
            check(pr == sorted(pr), "ordenar por menor preço")
            p.select_option("#tsort", "sort")
            p.click("#tclear"); p.fill("#tq", "cumbuco"); p.wait_for_timeout(300)
            p.click('[data-prices="cumbuco"]')
            check(p.is_visible(".pedit"), "botão Preços abre os preços dentro do card")
            check("R$ 55,00" in p.inner_text(".pedit").replace(" ", " "), "card mostra o mínimo após alteração do net para R$ 40")
            p.fill(".pedit input[id$='_pix']", "40"); p.click("[data-psave]"); p.wait_for_timeout(500)
            check(p.is_visible(".pedit"), "preço abaixo do mínimo é recusado no painel")
            p.click("[data-pcancel]")
            p.click("#allPrices"); p.wait_for_function("!document.querySelector('#panel').innerText.includes('Carregando')")
            check(p.is_visible("#saveAll") and p.is_visible("#backTours"), "tabela com todos os preços continua disponível")
            p.click("#backTours"); p.wait_for_function("!document.querySelector('#panel').innerText.includes('Carregando')")
    for item in DATA["tours"]:
        item.pop("sales_mode")
        item.pop("departure_weekdays")
    DATA["biz_settings"][0]["data"]["bruno_contact_net"] = [{"tour": "Referência antiga", "amount": 30}]
    DATA["tour_rates"][0]["updated_at"] = None
    text = go("empresas")
    check("Referência antiga" not in text and "tarifa de referência" not in text, "cartão duplicado não aparece com dados legados")
    check("Net sem data · revisar" in text, "tarifa antiga sem data pede revisão")
    row = 'details[data-tour="cumbuco"]'
    if p.locator(row).get_attribute("open") is None:
        p.click(row + " summary")
    check(p.locator("[data-sales]").count() == 0 and p.is_visible(row + " [data-cap]"), "banco pré-migração mantém edição antiga e desabilita modo novo")
    BOOK.update(status="pendente", boarded_at=None, reservation_expires_at="2000-01-01T00:00:00Z")
    txt = go("reservas")
    check("Prazo expirado" in txt and p.locator('[data-booking-action="paid"]').count() == 0, "prazo expirado impede registro de pagamento por engano")
    check("Abrir confirmação no WhatsApp" not in txt, "reserva pendente não envia confirmação ao cliente")
    check(not errs, "sem erro de JavaScript: " + "; ".join(errs[:3]))
    b.close()

print("\n%d falha(s)" % len(fails))
sys.exit(1 if fails else 0)
