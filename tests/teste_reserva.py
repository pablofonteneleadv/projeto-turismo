"""Teste da reserva no site com o banco real.
Antes: empresa de teste com net de R$ 30 no Cumbuco e cupom TESTE50 (50%).
Uso: python tests/teste_reserva.py http://127.0.0.1:8766/
Imprime o código da reserva criada (apagar depois do teste).
"""
import sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8766/"
day = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 3 * 3600 + 6 * 86400))
fails = []
def check(c, m):
    print(("OK   " if c else "FAIL ") + m)
    if not c: fails.append(m)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page(viewport={"width": 1280, "height": 1000})
    errs = []; p.on("pageerror", lambda e: errs.append(str(e)))
    p.set_default_timeout(60000)
    p.goto(BASE + "passeio-cumbuco.html?data=" + day + "&utm_source=teste-e2e")
    box = "#book"
    p.wait_for_function("document.querySelector('#book [data-total]') && document.querySelector('#book [data-total]').innerText.includes('Sinal agora')")
    p.wait_for_timeout(2500)
    t = p.inner_text(box + " [data-total]").replace("\xa0", " ")
    check("R$ 160,00" in t and "R$ 32,00" in t, "2 adultos no Pix: total R$ 160, sinal R$ 32 (servidor)")
    check("reservas até as" in p.inner_text(box), "aviso de horário de corte")
    p.fill(box + ' [data-k="coupon"]', "TESTE50"); p.click(box + " [data-apply]")
    p.wait_for_function("document.querySelector('#book [data-total]').innerText.includes('desconto máximo')")
    t = p.inner_text(box + " [data-total]").replace("\xa0", " ")
    check("R$ 90,00" in t, "cupom de 50% para no mínimo: total R$ 90 (net 60 + anúncio 10 + margem 20)")
    check("R$ 18,00" in t and "R$ 72,00" in t, "sinal R$ 18 e R$ 72 no embarque")
    p.click(box + " [data-reserve]")
    p.fill("#cName", "Teste Automatico E2E"); p.fill("#cPhone", "85 99999-0000"); p.fill("#cHotel", "Hotel Teste")
    p.click("#confirmBtn")
    p.wait_for_selector("#step2:not([hidden])")
    pix = p.inner_text("#pixBox").replace("\xa0", " ")
    import re
    m = re.search(r"MT-\d+", pix); code = m.group(0) if m else ""
    check(code.startswith("MT-"), "reserva gravada com código " + code)
    check("R$ 18,00" in pix, "Pix pede o sinal certo")
    wa = p.get_attribute("#sendWa", "href") or ""
    check(code and code in __import__("urllib.parse").parse.unquote(wa), "mensagem de WhatsApp leva o código")
    check(not errs, "sem erro de JavaScript " + "; ".join(errs[:2]))
    print("CODIGO", code)
    b.close()
print("%d falha(s)" % len(fails)); sys.exit(1 if fails else 0)
