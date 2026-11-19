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
        elif endpoint == "settings":
            payload = [dict(data=dict(
                brand="Maré Tur", whatsapp="5585999990000", pix_key="recebimento-anterior",
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

    page.goto(BASE + "?utm_source=instagram&utm_medium=organic&utm_campaign=consulta-cumbuco"
                     "&utm_content=feed&utm_term=example%40example.org")
    expect_portal(page)
    assert page.evaluate("UI.attribution()") == {
        "source": "instagram", "medium": "organic", "campaign": "consulta-cumbuco", "content": "feed"
    }
    page.locator("#cards a[href*='passeio-cumbuco.html']").first.click()
    expect(page.get_by_role("heading", name="Cumbuco", exact=True)).to_be_visible()
    assert page.evaluate("UI.attribution().campaign") == "consulta-cumbuco"
    page.locator("#bar [data-open-book]").click()
    consult = page.locator("#sheet [data-consult]")
    expect(consult).to_be_visible()
    link = consult.get_attribute("href")
    message = parse_qs(urlparse(link).query)["text"][0]
    assert urlparse(link).hostname == "wa.me" and "Cumbuco" in message and "MT-INSTAGRAM" in message
    assert "example.org" not in message
    expect(visible(page, "[data-reserve]")).to_have_count(0)
    assert not [path for path, _ in calls if path in {"quote_booking", "create_booking"}]
    print("OK consulta Android, sem cobrança, com origem da home até o WhatsApp")

    page.goto(BASE + "passeio-cumbuco.html?lang=es")
    expect(page.locator("html")).to_have_attribute("lang", re.compile("es"))
    page.locator("#bar [data-open-book]").click()
    expect(page.locator("#sheet [data-consult]")).to_contain_text(re.compile("consult", re.I))
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
    assert booking[0]["attribution"]["campaign"] == "consulta-cumbuco"
    print("OK reserva sintética com cotação validada, protocolo, idempotência e campanha")
    assert not errors, errors
    context.close()
    browser.close()
