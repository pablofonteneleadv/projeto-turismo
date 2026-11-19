"""Smoke test com respostas locais de catálogo e reserva usando Chromium.
Execute: python tests/teste_consulta.py http://127.0.0.1:8766/
Use TURISMO_CHROMIUM ou TURISMO_SUPABASE_JS para dependências locais opcionais.
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8766/").rstrip("/") + "/"
assert urlparse(BASE).hostname in {"127.0.0.1", "localhost"}, "Use o servidor local do projeto."

SITE = Path(__file__).resolve().parents[1] / "site-v2"
CONFIG = (SITE / "config.js").read_text(encoding="utf-8")
HOST = urlparse(re.search(r'supabaseUrl:\s*"([^"]+)"', CONFIG).group(1)).hostname
DATA = (SITE / "assets" / "data.js").read_text(encoding="utf-8")
SEED = json.loads(re.search(r"var TOURS = (\[[^\n]+\]);", DATA).group(1))
CUMBUCO = next(t for t in SEED if t["slug"] == "cumbuco")
DATE = (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()


def visible(page, selector):
    return page.locator(selector).filter(visible=True).first


def broken_rows(page):
    return page.evaluate("""() => {
        const rows = document.querySelectorAll(".trip-highlights li, .trip-inclusions .yes, .trip-extras li:has(small)");
        return [...rows].filter(row => {
            const label = row.querySelector("span");
            if (!label) return true;
            const range = document.createRange();
            range.selectNodeContents(label);
            const lines = [...range.getClientRects()];
            const box = row.getBoundingClientRect();
            const style = getComputedStyle(row);
            const detail = row.querySelector("small")?.getBoundingClientRect();
            const firstLine = lines[0];
            return !firstLine || firstLine.top > box.top + parseFloat(style.paddingTop) + parseFloat(style.lineHeight)
                || lines.some(line => Math.abs(line.left - firstLine.left) > 1 || line.right > box.right + 1)
                || Boolean(detail && (detail.left < label.getBoundingClientRect().right || detail.right > box.right + 1
                    || detail.top >= firstLine.bottom));
        }).map(row => row.textContent);
    }""")


def fake_catalog(context, flags, calls):
    def serve(route):
        req = route.request
        endpoint = urlparse(req.url).path.rsplit("/", 1)[-1]
        args = (req.post_data_json or {}).get("p") if req.method == "POST" else None
        calls.append((endpoint, args))
        quote = dict(
            tour_slug="cumbuco", tour_name="Cumbuco", tour_date=DATE, base=160,
            buggy=0, buggy_amount=0, buggy_cars=0, discount=0, total=160,
            people=2, adults=2, seniors=0, children=0, deposit=32,
            collect_at_boarding=128, seats_left=8, pay_method="pix",
        )
        payload = None
        status = 200
        if endpoint == "tours":
            if flags.get("fail_catalog"):
                return route.fulfill(status=503, json={"message": "unavailable"})
            payload = [] if flags.get("empty") else [
                dict(CUMBUCO, **({"sales_mode": "booking", "departure_weekdays": list(range(1, 8)),
                                 "capacity_per_day": 10} if flags.get("bookable") else {}))
            ]
            if not flags.get("bookable"):
                for t in payload:
                    t.pop("sales_mode", None)
            if flags.get("package_two") and payload:
                payload.append(dict(next(t for t in SEED if t["slug"] == "3praias")))
            if flags.get("all_tours") and not flags.get("empty"):
                payload = SEED
        elif endpoint == "settings":
            payload = [dict(data=dict(
                brand="Maré Tur", whatsapp="5588999990000", pix_key="recebimento-anterior",
                pix_name="Recebedor de teste", pix_payment_verified=True, deposit_pct=20
            ))]
        elif endpoint in {"reviews", "faqs", "check_coupon"}:
            if endpoint in {"reviews", "faqs"} and "pending_extras" in flags:
                flags["pending_extras"][endpoint] = route
                return
            payload = []
        elif endpoint == "min_tour_date":
            payload = DATE
        elif endpoint == "seats_left":
            payload = 8
        elif endpoint == "quote_booking":
            if flags.get("quote_error"):
                return route.fulfill(status=400, json={"message": "Cotação indisponível"})
            payload = quote
        elif endpoint == "create_booking":
            payload = dict(quote, id=1, code="MT-1001", status="pendente", payment_ready=True,
                           pix_details=dict(key="recebimento-validado", name="Recebedor confirmado"),
                           reservation_expires_at=(datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat())
        elif endpoint in {"leads", "partner_requests"}:
            status = 201
        else:
            raise AssertionError(f"Requisição inesperada em teste local: {endpoint} {req.method}")
        return route.fulfill(status=status, json=payload)

    context.route("https://" + HOST + "/**", serve)
    supabase_js = os.environ.get("TURISMO_SUPABASE_JS")
    if supabase_js:
        context.route("https://cdn.jsdelivr.net/npm/@supabase/**",
                      lambda route: route.fulfill(path=supabase_js, content_type="application/javascript"))
    context.route("https://wa.me/**", lambda route: route.abort())


def expect_portal(page):
    expect(page.locator("#heroTitle")).to_contain_text("Cumbuco")
    expect(page.locator("#cards")).to_have_attribute("aria-busy", "false")


with sync_playwright() as pw:
    options = {}
    binary = os.environ.get("TURISMO_CHROMIUM")
    if binary:
        options = dict(executable_path=binary, args=["--no-sandbox", "--no-zygote", "--single-process"])
    browser = pw.chromium.launch(**options)
    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                                  has_touch=True, locale="pt-BR", device_scale_factor=2)
    flags = {}
    calls = []
    fake_catalog(context, flags, calls)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    pending = flags["pending_extras"] = {}
    page.goto(BASE, wait_until="domcontentloaded")
    expect_portal(page)
    card = page.locator("#cards .card").first
    expect(card).to_contain_text("Cumbuco")
    expect(page.locator("#reviewsSection")).to_be_hidden()
    add = card.locator(".add")
    add.click()
    add.focus()
    expect(page.locator("#packbar")).to_be_visible()
    assert set(pending) == {"reviews", "faqs"}, pending.keys()
    pending["reviews"].fulfill(json=[{"name": "Teste", "tour": "Cumbuco", "text": "Avaliação simulada", "stars": 5}])
    pending["faqs"].fulfill(json=[{"question": "Pergunta simulada", "answer": "Resposta simulada"}])
    del flags["pending_extras"]
    expect(page.locator("#reviewsSection")).to_contain_text("Avaliação simulada")
    expect(page.locator("#faqs")).to_contain_text("Pergunta simulada")
    expect(card.locator(".tour-rating")).to_contain_text("5,0")
    expect(add).to_have_attribute("aria-pressed", "true")
    expect(add).to_be_focused()
    print("OK vitrine antes de avaliações e FAQ, com seleção e foco preservados")

    flags["package_two"] = True
    page.goto(BASE + "?utm_source=instagram&utm_medium=organic&utm_campaign=consulta-cumbuco&lang=pt")
    expect_portal(page)
    cards = page.locator("#cards .card")
    expect(cards).to_have_count(2)
    for card in cards.all():
        card.locator(".add").click()
    page.get_by_role("button", name="Consultar pacote", exact=True).click()
    package = page.get_by_role("dialog", name="Consultar pacote")
    expect(package).to_be_visible()
    expect(package.locator("#packItems li")).to_have_count(2)
    package.locator("#packDate").fill(DATE)
    package.get_by_label("Viajantes").fill("4")
    package.get_by_label("Bairro do embarque (opcional)").fill("Meireles")
    pack_link = urlparse(package.get_by_role("link", name="Abrir WhatsApp").get_attribute("href"))
    pack_message = parse_qs(pack_link.query)["text"][0]
    assert pack_link.path == "/5588999990000"
    assert all(x in pack_message for x in ["Cumbuco", "3 Praias", "Viajantes: 4", "Bairro do embarque: Meireles", "Origem: MT-INSTAGRAM"])
    assert re.search(r"Referência: MT-P-[A-F0-9]{10}", pack_message)
    assert "Meireles" not in page.url and "Meireles" not in json.dumps(page.evaluate("UI.attribution()"))
    package.get_by_label("Viajantes").fill("0")
    assert not package.locator("#packPeople").evaluate("el => el.validity.valid")
    package.get_by_role("button", name="Voltar aos passeios").click()
    expect(package).to_be_hidden()
    expect(page.locator("#packCount")).to_have_text("2 passeios")
    assert not [p for p, _ in calls if p in {"quote_booking", "create_booking"}]

    page.goto(BASE + "?lang=es")
    expect(cards).to_have_count(2)
    cards.first.locator(".add").click()
    page.get_by_role("button", name="Consultar paquete", exact=True).click()
    expect(page.get_by_role("dialog").get_by_label("Viajeros")).to_be_visible()
    assert "Viajeros: 2" in parse_qs(urlparse(page.locator("#packGo").get_attribute("href")).query)["text"][0]
    del flags["package_two"]
    print("OK pacote Android PT/ES com confirmação de passeios, dados da consulta e protocolo")

    page.goto(BASE + "?utm_source=instagram&utm_medium=organic&utm_campaign=consulta-cumbuco"
                     "&utm_content=feed&utm_term=example%40example.org&lang=pt")
    expect_portal(page)
    assert page.evaluate("UI.attribution()") == {
        "source": "instagram", "medium": "organic", "campaign": "consulta-cumbuco", "content": "feed"
    }
    cumbuco_card = page.locator("#cards .card").filter(has=page.get_by_role("heading", name="Cumbuco", exact=True))
    links = [cumbuco_card.locator(s).get_attribute("href") for s in (".card-photo-link", ".card-text-link", ".tour-link")]
    assert len(set(links)) == 1 and "utm_campaign=consulta-cumbuco" in links[0]
    cumbuco_card.locator(".fav").click()
    expect(cumbuco_card.locator(".fav")).to_have_attribute("aria-pressed", "true")
    assert "/passeio-cumbuco.html" not in page.url
    cumbuco_card.locator(".card-photo-link").click()
    expect(page.get_by_role("heading", name="Cumbuco", exact=True)).to_be_visible()
    assert page.evaluate("UI.attribution().campaign") == "consulta-cumbuco"
    page.locator("#bar [data-open-book]").click()
    consult = page.locator("#sheet [data-consult]")
    expect(consult).to_be_visible()
    link = consult.get_attribute("href")
    message = parse_qs(urlparse(link).query)["text"][0]
    assert urlparse(link).netloc == "wa.me" and urlparse(link).path == "/5588999990000"
    assert "Cumbuco" in message and "Origem: MT-INSTAGRAM" in message
    ref = re.search(r"Referência: (MT-C-[A-F0-9]{10})", message)[1]
    pickup = page.locator("#sheet [data-pickup-field] input")
    pickup.fill("Meireles")
    message = parse_qs(urlparse(consult.get_attribute("href")).query)["text"][0]
    assert "Bairro do embarque: Meireles" in message and ref in message
    assert "example.org" not in message
    assert "Meireles" not in page.url and "Meireles" not in json.dumps(page.evaluate("UI.attribution()"))
    expect(visible(page, "[data-reserve]")).to_have_count(0)
    assert not [path for path, _ in calls if path in {"quote_booking", "create_booking"}]
    print("OK consulta Android, sem cobrança, com origem da home até o WhatsApp")

    page.goto(BASE + "passeio-cumbuco.html?lang=es")
    expect(page.locator("html")).to_have_attribute("lang", re.compile("es"))
    page.locator("#bar [data-open-book]").click()
    expect(page.locator("#sheet [data-consult]")).to_contain_text(re.compile("consult", re.I))
    expect(pickup).to_have_value("Meireles")
    message = parse_qs(urlparse(consult.get_attribute("href")).query)["text"][0]
    assert "Barrio de embarque: Meireles" in message and "Referencia: " + ref in message
    print("OK consulta em espanhol")

    flags["empty"] = True
    page.goto(BASE + "?lang=pt")
    expect_portal(page)
    expect(page.locator("#cards a[href*='passeio-']")).to_have_count(0)
    flags["fail_catalog"] = True
    page.reload()
    expect_portal(page)
    expect(page.locator("#cards a[href*='passeio-']")).to_have_count(0)
    print("OK catálogo vazio e contingência sem reapresentar ofertas ocultadas")

    flags.update(empty=False, fail_catalog=False, bookable=True)
    page.goto(BASE + "passeio-cumbuco.html?data=" + DATE)
    expect(page.get_by_role("heading", name="Cumbuco", exact=True)).to_be_visible()
    page.locator("#bar [data-open-book]").click()
    reserve = page.locator("#sheet [data-reserve]")
    expect(reserve).to_be_enabled()
    expect(pickup).to_be_hidden()
    reserve.click()
    expect(page.locator("#modal")).to_be_visible()
    page.locator("#cName").fill("Cliente de Teste")
    page.locator("#cPhone").fill("85988887777")
    page.locator("#cHotel").fill("Hotel de Teste")
    page.locator("#confirmBtn").click()
    expect(page.locator("#step2")).to_be_visible()
    expect(page.locator("#modal")).to_contain_text("MT-1001")
    expect(page.locator("#pixBox")).to_contain_text("recebimento-validado")
    expect(page.locator("#pixBox")).not_to_contain_text("recebimento-anterior")
    booking = [p for path, p in calls if path == "create_booking"]
    assert len(booking) == 1 and re.fullmatch(r"[a-f0-9-]{36}", booking[0]["request_id"])
    assert "Meireles" not in json.dumps(booking[0]) and ref not in json.dumps(booking[0])
    assert booking[0]["attribution"]["campaign"] == "consulta-cumbuco"
    print("OK reserva sintética com cotação validada, protocolo, idempotência e campanha")

    flags.update(bookable=False, all_tours=True)
    all_pages = sorted(SITE.glob("passeio-*.html"))
    for file in all_pages:
        page.goto(BASE + file.name + "?lang=pt", wait_until="domcontentloaded")
        expect(page.get_by_role("heading", name="Sobre o passeio", exact=True)).to_be_visible()
        assert page.locator(".trip-section h2").all_inner_texts()[:2] == ["Sobre o passeio", "Inclusos e extras"], file.name
        assert not page.get_by_text("Como é o dia", exact=True).count()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), file.name
        assert not (broken := broken_rows(page)), (file.name, broken)
        expect(page.locator("#bar [data-open-book]")).to_be_enabled()
    page.goto(BASE + "passeio-jeri-vip.html?lang=pt")
    expect(page.locator(".trip-highlights")).to_contain_text("Alchymist")
    expect(page.locator(".trip-inclusions > div").first).not_to_contain_text("Pedra Furada")
    expect(page.locator(".trip-inclusions > div").nth(1)).to_contain_text("Pedra Furada")
    expect(page.locator(".trip-inclusions > div").nth(1).get_by_text("Taxa ambiental", exact=False)).to_have_count(1)
    main_photo = page.locator("#tripPhoto img")
    first_photo = main_photo.get_attribute("src")
    second_photo = page.locator('[data-trip-photo="1"]')
    second_photo.click()
    expect(second_photo).to_have_attribute("aria-pressed", "true")
    assert main_photo.get_attribute("src") != first_photo
    main_photo.evaluate("img => img.decode()")
    if os.environ.get("TURISMO_LAYOUT_SHOT"):
        page.screenshot(path=os.environ["TURISMO_LAYOUT_SHOT"], full_page=True, animations="disabled")
    page.goto(BASE + "passeio-jeri-vip.html?lang=es")
    expect(page.get_by_role("heading", name="Sobre el paseo")).to_be_visible()
    expect(page.get_by_role("heading", name="Incluidos y adicionales")).to_be_visible()
    page.evaluate("() => { navigator.share = async ({ url }) => { window.sharedTourUrl = url; }; }")
    page.locator("#share").click()
    assert page.evaluate("window.sharedTourUrl") == "https://maretur.com.br/passeio-jeri-vip.html"
    for width in (320, 360, 390, 430, 768, 1280):
        page.set_viewport_size({"width": width, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
        assert not (broken := broken_rows(page)), (width, broken)
    for width in (320, 390, 768):
        page.set_viewport_size({"width": width, "height": 844})
        page.goto(BASE + "?lang=es")
        expect(page.locator("#cards .card").first).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
        page.goto(BASE + "creditos.html")
        expect(page.locator("#list .item").first).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
    print(f"OK padrão móvel nas {len(all_pages)} páginas, galeria, opcionais e versão em espanhol")
    assert not errors, errors
    context.close()
    browser.close()
