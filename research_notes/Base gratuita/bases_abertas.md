# Bases abertas para agência de passeios (Fortaleza) - pesquisa de 15/11/2026

Método: API do GitHub (estrelas, licença, último push), LICENSE/README crus, docs oficiais de hospedagem. Nada foi criado nem enviado. Itens "NÃO CONFIRMADO" vêm de busca secundária ou memória.

## 1. Comparativo das bases

| Base | Stack | Estrelas | Último push | Licença | Cabe em Cloudflare Workers/D1? |
|---|---|---|---|---|---|
| Hi.Events (github.com/HiEventsDev/hi.events) | Laravel 13/PHP 8.3 + React 19 + Postgres + Redis | 4.180 | 15/11/2026 (v2.2.0, 07/11/2026) | AGPL-3.0 + termos extras: obrigatório manter "Powered by Hi.Events" no rodapé de páginas e e-mails (remover = licença comercial). Pastas ee/ (assento marcado, bilheteria) são Enterprise pagas | NÃO. Precisa VM/container (Postgres+Redis) |
| pretix (github.com/pretix/pretix) | Python/Django + Postgres | 2.568 | 13/11/2026 | AGPL-3.0 com exceções: proíbe oferecer como SaaS a terceiros e "vender produtos de terceiros"; exige atribuição "built using pretix". Vender os PRÓPRIOS passeios é ok | NÃO. VM/container |
| alf.io (github.com/alfio-event/alf.io) | Java 25 + Postgres 11+ | 1.632 | 14/11/2026 | GPL-3.0 (limpa) | NÃO. JVM pesada |
| Medusa v2 (github.com/medusajs/medusa) | Node/TS + Postgres | 37.266 | 14/11/2026 | MIT (exceto pasta Enterprise Edition, que não seria usada) | NÃO no Workers; precisa Node + Postgres |
| Vendure (github.com/vendurehq/vendure) | Node/TS + Postgres | 8.591 | 14/11/2026 | GPLv3 por padrão (dual, com licença comercial VCL) | NÃO |
| Saleor (github.com/saleor/saleor) | Python/Django + GraphQL | 23.576 | 16/11/2026 | BSD-3 | NÃO, pesado |
| Bagisto (github.com/bagisto/bagisto) | Laravel | 28.377 | 13/11/2026 | MIT | NÃO. E-commerce de produto, sem datas/vagas |
| EverShop | Node | 10.558 | 09/11/2026 | GPL-3.0 | NÃO. Produto físico |
| QloApps | PHP | 14.488 | 06/11/2026 | OSL-3.0 | Hotel (quartos), não passeio |
| openfront-tour-guide (github.com/openshiporg/openfront-tour-guide) | Next.js + Keystone + Postgres | 0 | 14/11/2026 | MIT | Não; sem prova de uso. "Alternativa open source ao FareHarbor"; útil só como referência de modelo de dados |
| Eventify (eventify-docs-staging.pages.dev) | Next.js 15 + Workers + D1 + Prisma + Stripe | n/d | n/d | NÃO CONFIRMADO | Sim em tese; repo não verificado |
| cloudflare/templates (github.com/cloudflare/templates) | Workers/D1 | 2.174 | 13/11/2026 | MIT | Sim, mas starters genéricos, sem lógica de passeio |
| Plugins WordPress (Yatra 6 estrelas; booking-core 0) | WordPress | irrelevante | | | Não |

Conclusão da busca de templates: NÃO existe starter aberto, maduro e ativo de agência de passeios com saídas por data + vagas + checkout rodando em Cloudflare Pages/Workers + D1. Os "templates de turismo" achados são pagos (ThemeForest) ou só vitrine. Cal.com (MIT no fork cal.diy) é agenda 1 a 1 e o README do self-host não recomenda produção.

## 2. Recursos já prontos

**Hi.Events** (README oficial): eventos únicos e recorrentes com preço/capacidade/horário POR DATA; ingressos pagos/grátis/escalonados; capacidade compartilhada e lista de espera; códigos promocionais; links de rastreio para promotores e afiliados; embeds (widget/botão) para o site próprio; check-in por câmera do celular; PDF de ingresso com marca; reembolsos; API REST e webhooks; 21 idiomas incluindo Português (Brasil) (pt-br.po no repo). Pagamento: Stripe + offline/fatura (Pix NÃO CONFIRMADO; depende do Stripe Brasil). Prova de uso: README cita "milhares de organizadores"; não verifiquei clientes nominais. Deploy 1 clique em Render/Railway/DigitalOcean/Zeabur.

**pretix**: séries de eventos com datas (subevents), cotas (vagas), vouchers/cupons, app oficial de check-in com QR; pt_BR existe em src/pretix/locale. Pix: plugins pretix-pix-openpix (v0.2.0) e pretix-pix-manual no PyPI; Mercado Pago: nenhum plugin achado. Licença com restrições; operação mais pesada (Postgres, Redis, workers).

**alf.io**: ingressos, QR/check-in, cupons; traduções públicas incluem public_pt (português europeu) e es/en; pagamentos europeus, sem Pix. Java + Postgres, mais lento de customizar.

**Medusa v2**: loja headless modular, MIT. Não tem "saída com vagas" nativo: modelaria cada data como variante com estoque (ou módulo custom). Cupons nativos. Plugins Mercado Pago de comunidade: NicolasGorga/medusa-payment-mercadopago (push 14/09/2026, 30 estrelas, sem licença declarada) e minskylab (MIT, parado desde 04/2024). Afiliado e QR: precisa construir.

**Vendure/Saleor/Bagisto/EverShop**: e-commerce de produto, nada de data+vaga; descartados.

Quem usa comercialmente: Hi.Events (SaaS próprio app.hi.events), pretix (SaaS pretix.eu, uso amplo em conferências na Europa, sem lista nominal verificada), Medusa (adoção ampla). Para turismo/passeio especificamente nenhuma tem case verificado por mim.

## 3. Licenças na prática
- AGPL-3.0: pode usar, modificar e vender sem pagar. Se modificar e usuários acessarem pela rede, deve oferecer o código MODIFICADO a eles (não obriga abrir dados, chaves ou o resto do negócio). Hi.Events: além disso, rodapé "Powered by Hi.Events" obrigatório (remover só com licença paga). pretix: atribuição + vedação de SaaS/venda de produtos de terceiros (passeio próprio ok; passeio de parceiro no mesmo sistema é zona cinza).
- MIT/BSD (Medusa, Saleor, Bagisto, templates Cloudflare): livre.
- GPL-3 (alf.io, Vendure): copyleft só se distribuir; uso em servidor próprio ok.

## 4. Onde hospedar de graça (páginas oficiais, 15/11/2026)
- **Cloudflare Workers Free** (developers.cloudflare.com/workers/platform/limits/): 100.000 req/dia, 10 ms CPU/requisição, 50 subrequests. **D1 Free** (developers.cloudflare.com/d1/platform/pricing/): 5 milhões de leituras/dia, 100 mil escritas/dia, 5 GB total, 10 bancos. Pages estático grátis. Sobra para uma agência; nenhuma das bases acima roda aqui.
- **Oracle Cloud Always Free** (docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm): a doc oficial hoje diz Ampere A1 = 1.500 OCPU-h e 9.000 GB-h/mês = **2 OCPU e 12 GB** (NÃO mais 4 OCPU/24 GB; blogs falam em corte com vigência 18/08/2026, braindetox.kr/en/posts/oracle_always_free_tier_reduced_2026.html). Mais 2 micro AMD (1 GB), 200 GB de disco. Máquina ociosa (p95 de CPU, rede e memória A1 abaixo de 20% por 7 dias) pode ser reclamada. Erro "out of host capacity" é comum. Cartão: aceita crédito e débito que funciona como crédito; NÃO aceita débito com PIN, virtual ou pré-pago (oracle.com/cloud/free/faq); não achei relato de cartão brasileiro recusado em 2026; uma conta por pessoa. Roda Hi.Events/pretix/Medusa com folga, mas é UMA máquina sem redundância.
- **Supabase Free** (supabase.com/pricing): 500 MB, 1 GB arquivos, 5 GB egress, 2 projetos, pausa após 1 semana sem atividade. Pro US$25/mês.
- **Neon Free** (neon.com/pricing): 1 GB/projeto, 100 CU-h/mês, autosuspend 5 min (cold start). Launch pay-as-you-go (~US$15/mês típico).
- **Render Free** (render.com/docs/free): web dorme após 15 min (acorda ~1 min), 750 h/mês, sem disco; Postgres free expira em 30 dias (+14) e 1 GB; Key Value só em memória. Inadequado para produção.
- **Fly.io** (docs.fly.io/about/pricing): sem free tier para contas novas; US$1 de crédito por 7 dias; menor máquina ~US$2,19/mês; exige cartão depois.
- **Koyeb** (koyeb.com/pricing): sem instância grátis; Pro US$29/mês + computação; Postgres "Free 5h" limitado. Não serve.

Encaixe: nada além do Cloudflare roda PHP/Java/Python de forma gratuita e estável, exceto Oracle (2 OCPU/12 GB). Hi.Events/pretix/Medusa = Oracle ou Render/Railway pago (~US$7-20/mês). Solução própria em Workers+D1 = 100% Cloudflare grátis.

## 5. Pagamento no Brasil
- Stripe aceita Pix via EBANX desde 11/08/2025 (paymentsjournal.com/stripe-adds-pix-payments-through-ebanx-integration); taxa Pix oficial NÃO CONFIRMADA; reportagem indica Stripe Brasil ainda restrito/beta para empresas brasileiras (startups.com.br). Verificar ao abrir conta.
- Mercado Pago: Pix e cartão por API (Checkout Pro/Bricks, Pix com QR e webhook); bom para Worker chamar direto. Alternativas: Asaas, OpenPix.

## 6. Recomendação

Não há base pronta que una (a) grátis, (b) Cloudflare, (c) Pix/BRL e (d) passeio por data com vagas.

**Rota A (recomendada): app próprio fino em Cloudflare, copiando o modelo do pretix/Hi.Events.** Pages (vitrine mobile-first PT-BR, Astro/SvelteKit) + Workers (API) + D1 (passeios, saídas por data com vagas, reservas, cupons, agentes) + R2 (fotos/vouchers) + GitHub Actions. Checkout com Mercado Pago (Pix + cartão) via webhook; voucher PDF/QR com token assinado (HMAC) e PWA de check-in; cupom = código ligado ao agente com comissão; painel admin atrás de Cloudflare Access. Vagas com UPDATE atômico no D1 (... WHERE vagas >= n). Custo fixo R$0; só a taxa do gateway por venda. Prazo realista com IA: 3 a 5 semanas até vender (MVP em ~2). Os limites do plano grátis sobram para milhares de reservas.
Escala paga: Workers Paid (~US$5/mês), D1/R2 por uso, e-mail transacional (Resend), API de WhatsApp.

**Rota B (mais rápida, menos controle): Hi.Events self-host na Oracle A1 (2 OCPU/12 GB) ou Render/Railway pago.** No ar em dias, com datas recorrentes, cupons, rastreio de afiliados, check-in QR, PT-BR. Contras: Pix incerto (Stripe), rodapé "Powered by Hi.Events" obrigatório, servidor fora da stack dele, risco Oracle (reclamação, cartão). Escala: Hi.Events Cloud ou licença comercial (hi.events/licensing).

**Descartar:** pretix (licença restritiva + pesado), alf.io (Java, sem Pix), Vendure/Saleor/Bagisto/EverShop (produto), Medusa (sem vagas por data; só se quiser carrinho multi-produto).

Próximo passo: validar Mercado Pago (credenciais de teste) e decidir A vs B; se A, desenhar o schema D1 (tours, departures, bookings, coupons, agents, vouchers).

## Fontes
- https://github.com/HiEventsDev/hi.events (README, LICENCE, locales, releases)
- https://github.com/pretix/pretix , https://github.com/alfio-event/alf.io , https://github.com/medusajs/medusa , https://github.com/vendurehq/vendure
- https://github.com/openshiporg/openfront-tour-guide , https://github.com/NicolasGorga/medusa-payment-mercadopago
- https://pypi.org/project/pretix-pix-openpix/ , https://pypi.org/project/pretix-pix-manual/
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm , https://www.oracle.com/cloud/free/faq/
- https://developers.cloudflare.com/workers/platform/limits/ , https://developers.cloudflare.com/d1/platform/pricing/
- https://supabase.com/pricing , https://neon.com/pricing , https://render.com/docs/free , https://docs.fly.io/about/pricing , https://www.koyeb.com/pricing
- https://www.paymentsjournal.com/stripe-adds-pix-payments-through-ebanx-integration/
