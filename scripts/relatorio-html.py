"""Transforma um relatório .md em página HTML fácil de ler no celular.
Uso: python scripts/relatorio-html.py "reports/Arquivo.md" [...]
Gera "reports/Arquivo.html" ao lado. Requer: pip install markdown
"""
import sys, re, html, pathlib, datetime
import markdown

CSS = """
:root{--bg:#F4F8F8;--card:#fff;--ink:#12303A;--muted:#5B7480;--mar:#0E7C86;--mar-soft:#DDF1F2;--sol:#F2B33D;--sol-soft:#FFF4DC;--line:#DCE7EA}
@media (prefers-color-scheme:dark){:root{--bg:#0E1A1F;--card:#15252C;--ink:#E7F1F3;--muted:#9DB4BC;--mar:#4CC3CC;--mar-soft:#16393E;--sol-soft:#3A3018;--line:#24383F}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:linear-gradient(135deg,#0E7C86,#12303A);color:#fff;padding:28px 16px 22px}
header .in,main{max-width:860px;margin:0 auto}
header small{opacity:.8;letter-spacing:.08em;text-transform:uppercase;font-size:.75rem;font-weight:700}
header h1{margin:6px 0 4px;font-size:1.65rem;line-height:1.2}
header p{margin:0;opacity:.85;font-size:.92rem}
main{padding:16px 16px 60px}
nav.toc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 16px;margin:0 0 16px}
nav.toc b{font-size:.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
nav.toc a{display:block;padding:6px 0;color:var(--mar);text-decoration:none;font-weight:600;border-bottom:1px solid var(--line)}
nav.toc a:last-child{border:0}
section.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:6px 18px 14px;margin:0 0 14px}
h2{font-size:1.3rem;margin:16px 0 8px;color:var(--mar)}
h3{font-size:1.08rem;margin:16px 0 6px}
p,li{margin:6px 0}ul,ol{padding-left:22px}
strong{color:var(--ink)}
a{color:var(--mar);word-break:break-word}
blockquote{margin:10px 0;padding:10px 14px;background:var(--sol-soft);border-left:4px solid var(--sol);border-radius:10px}
.tbl{overflow-x:auto;max-width:100%;margin:10px 0;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;min-width:100%;font-size:.9rem}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{background:var(--mar-soft)}
tr:nth-child(even) td{background:rgba(14,124,134,.04)}
pre{white-space:pre-wrap;word-break:break-word;background:var(--mar-soft);padding:12px;border-radius:10px;overflow-x:auto}
pre code{background:none;padding:0}
html,body{overflow-x:hidden;max-width:100%}
code{background:var(--mar-soft);padding:1px 6px;border-radius:6px;font-size:.88em}
.first{background:var(--mar-soft);border:0}
footer{color:var(--muted);font-size:.8rem;text-align:center;padding:20px}
"""

def convert(src):
    src = pathlib.Path(src)
    text = src.read_text(encoding="utf-8")
    m = re.match(r"\s*#\s+(.+)\n", text)
    title = m.group(1).strip() if m else src.stem
    if m: text = text[m.end():]
    body = markdown.markdown(text, extensions=["tables", "sane_lists"])
    body = body.replace("<table>", '<div class="tbl"><table>').replace("</table>", "</table></div>")
    # links abrem em nova aba
    body = body.replace('<a href="http', '<a target="_blank" rel="noopener" href="http')
    # cada h2 vira um cartão; o que vem antes do primeiro h2 é o resumo em destaque
    parts = re.split(r"(?=<h2>)", body)
    toc, cards = [], []
    for i, part in enumerate(parts):
        if not part.strip(): continue
        h = re.match(r"<h2>(.*?)</h2>", part)
        if h:
            anchor = "s%d" % i
            part = part.replace("<h2>", '<h2 id="%s">' % anchor, 1)
            toc.append('<a href="#%s">%s</a>' % (anchor, re.sub("<.*?>", "", h.group(1))))
            cards.append('<section class="card">%s</section>' % part)
        else:
            cards.append('<section class="card first">%s</section>' % part)
    nav = '<nav class="toc"><b>Neste relatório</b>%s</nav>' % "".join(toc) if len(toc) > 2 else ""
    out = src.with_suffix(".html")
    out.write_text("""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title><style>%s</style></head><body>
<header><div class="in"><small>Maré Tur · relatório</small><h1>%s</h1><p>Atualizado em %s</p></div></header>
<main>%s%s</main><footer>Maré Tur · Passeios em Fortaleza</footer></body></html>""" % (
        html.escape(title), CSS, html.escape(title), datetime.date.today().strftime("%d/%m/%Y"), nav, "".join(cards)), encoding="utf-8")
    return out

if __name__ == "__main__":
    for a in sys.argv[1:]:
        print(convert(a))
