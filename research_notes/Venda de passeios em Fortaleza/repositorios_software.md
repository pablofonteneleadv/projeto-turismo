# Repositórios e software para a base de venda de passeios em Fortaleza

Dados de GitHub (estrelas, licença, último push) coletados pela API pública do GitHub em 15/11/2026 (`api.github.com/repos/<repo>`), salvo indicação. URLs dos repositórios citadas em cada linha.

## 1. Sistemas open source de reserva de passeios/atividades: quais existem e qual bifurcar (fork)

### Takeaway
Não existe no GitHub um "Bókun open source" maduro e ativo para passeios: os projetos específicos de turismo são pequenos (menos de 200 estrelas), de demonstração ou plugins WordPress. As bases profissionais, ativas e realmente modificáveis são genéricas: **pretix** (ingressos/datas com vouchers, revendedores e afiliados, AGPL), **Medusa v2** (e-commerce headless MIT, com tutorial oficial de booking) e, em segundo plano, Saleor/Bagisto. A melhor relação "base profissional rápida + controle total" é pretix (se aceitar AGPL e Python/Postgres) ou Medusa (se quiser MIT/TypeScript e construir o módulo de saídas).

### Cited Findings

**Bases genéricas maduras (ativas em nov/2026)**
- **pretix** — 2.568 estrelas, Python, último push 13/11/2026 — [GitHub pretix/pretix](https://github.com/pretix/pretix). Licença: AGPLv3 com termos adicionais; permite usar versão modificada sem cumprir a seção 13 (publicar código para usuários de rede) desde que NÃO ofereça o pretix como SaaS a terceiros, entre outras exceções — [LICENSE pretix](https://www.github.com/pretix/pretix/blob/master/LICENSE). Também há licença proprietária "pretix Enterprise" sob consulta — [pretix licensing FAQ](https://docs.pretix.eu/trust/licensing/faq/); [blog pretix 2021](https://pretix.eu/about/de/blog/20210412-license).
  - Recursos de marketing: vouchers de desconto (percentual/valor fixo, validade, uso único ou múltiplo), vouchers que reservam cota, produtos só acessíveis com voucher, tags nos vouchers; rede de revendedores (lojas locais que vendem e são faturadas depois); links por canal e "programa de afiliados que remunera parceiros" com base nas métricas; integração GA e Facebook Pixel — [pretix features/marketing](https://pretix.eu/about/en/features/marketing).
  - Ressalva: a página marca com um símbolo os recursos exclusivos das edições Hosted/Enterprise, e o plugin de revendedores foi lançado em 2018 só para Hosted/Enterprise — [pretix release 1.13](https://pretix.eu/about/en/blog/20180303-release-1130). Não foi possível confirmar se revendedores/afiliados estão hoje na Community Edition.
- **Medusa** — 37.265 estrelas, TypeScript, push 14/11/2026 — [GitHub medusajs/medusa](https://github.com/medusajs/medusa). Licença: MIT, exceto materiais "Enterprise Edition" listados em ENTERPRISE-LICENSE.md — [LICENSE Medusa](https://github.com/medusajs/medusa/blob/develop/LICENSE).
  - Medusa publicou em 17/09/2025 o tutorial "Implement Booking System in Medusa" (v2): módulo customizado de Ticket Booking, extensões de admin para locais e datas, validação de disponibilidade antes de adicionar ao carrinho, subscriber de pedido concluído; reaproveita preço e estoque das variantes — [Medusa blog booking-system](https://medusajs.com/blog/booking-system/); página de solução [Events and Bookings Platform](https://medusajs.com/events-and-bookings-platform/).
- **Saleor** — 23.576 estrelas, BSD-3-Clause, Python, push 16/11/2026 — [GitHub saleor/saleor](https://github.com/saleor/saleor).
- **Bagisto** — 28.377 estrelas, MIT, PHP/Laravel, push 13/11/2026 — [GitHub bagisto/bagisto](https://github.com/bagisto/bagisto).
- **Odoo** — 55.818 estrelas, Python, push 16/11/2026; LGPLv3 no repositório principal — [GitHub odoo/odoo](https://github.com/odoo/odoo); [LICENSE Odoo](https://github.com/odoo/odoo/blob/master/LICENSE).
- **alf.io** (ingressos/eventos) — 1.632 estrelas, GPL-3.0, Java, push 14/11/2026 — [GitHub alfio-event/alf.io](https://github.com/alfio-event/alf.io).
- **Easy!Appointments** (agendamento por horário) — 4.491 estrelas, GPL-3.0, PHP, push 13/11/2026 — [GitHub alextselegidis/easyappointments](https://github.com/alextselegidis/easyappointments).
- **Cal.com** — a URL `calcom/cal.com` redireciona agora para `calcom/cal.diy` (50.069 estrelas, MIT segundo a API, push 13/11/2026) — [GitHub calcom/cal.diy](https://github.com/calcom/cal.diy). Agendamento 1:1, não saídas em grupo.
- **QloApps** — 14.488 estrelas, OSL-3.0, PHP, push 06/11/2026; sistema de hotel (reservas de quartos) — [GitHub Qloapps/QloApps](https://github.com/Qloapps/QloApps).
- **Open Event Server (FOSSASIA)** — GPL-3.0, repositório ARQUIVADO (último push 02/04/2026) — [GitHub fossasia/open-event-server](https://github.com/fossasia/open-event-server). Descartar.

**Projetos específicos de turismo (pequenos)**
- **Yatra** (plugin WordPress) — GPL v2+, 6 estrelas, push 08/11/2026; descreve "gerenciar viagens e saídas, aceitar pagamentos, automatizar e-mails e vender no Viator e GetYourGuide"; requer WordPress 6.0+, PHP 8.0+ — [GitHub mantrabrain/yatra](https://github.com/mantrabrain/yatra). README não detalha capacidade por saída, cupons, gateways ou afiliados.
- **Booking Activities** (plugin WordPress) — 29 estrelas, GPL-3.0, push 13/11/2026 — [GitHub bookingactivities/booking-activities](https://github.com/bookingactivities/booking-activities).
- **LSX Tour Operator** (plugin WP de catálogo: acomodações, destinos, tours) — 16 estrelas, GPL-3.0, push 12/11/2026 — [GitHub lightspeedwp/tour-operator](https://github.com/lightspeedwp/tour-operator).
- **tourapp/tourapp** ("open source tour operation system", Java) — 1 estrela, último push 14/06/2013: abandonado — [GitHub tourapp/tourapp](https://github.com/tourapp/tourapp).
- **ExcursioX** (MERN, CRM de viagem) — 22 estrelas, último push 11/03/2024, README diz "em desenvolvimento" — [GitHub moizkamran/ExcursioX](https://github.com/moizkamran/ExcursioX).
- Outros resultados (TripGo, Tours-Travel Laravel 37 estrelas GPL-3.0, rr-tours-app, travel-agency) são projetos acadêmicos/demonstração — [GitHub search via topics tour-booking](https://github.com/topics/tour-booking); [muchaisam/Tours-Travel](https://github.com/muchaisam/Tours-Travel).
- Brasileiros: busca por "reservas passeios" achou apenas projetos com 0-3 estrelas (ex.: ReservaMar, GPL-3.0, gestão de passeios náuticos; SistemaDePasseios, Python; reservas-standby) — [Dev-JeanSantos/ReservaMar](https://github.com/Dev-JeanSantos/ReservaMar); [LucasFontesB/SistemaDePasseios](https://github.com/LucasFontesB/SistemaDePasseios).

**Booking Core (verificado: NÃO é open source)**
- Produto comercial Laravel vendido no CodeCanyon por US$ 69, ~2,8 mil vendas, atualizado em 26/10/2025; suporte depende de código de compra que expira (relatos de 6 meses) — [CodeCanyon MyTravel/Booking Core e comentários](https://codecanyon.net/search/tour%20booking); cópia de terceiros no GitHub de legitimidade não confirmada — [github.com/jamersweb/acute](https://github.com/jamersweb/acute). Licença Envato, não modificável/redistribuível livremente.

### Inferences
- **Ranking sugerido para fork** (critério: profissional rápido, controle total, deploy barato):
  1. **pretix** — já tem datas/"subeventos" com cota, checkout, vouchers, QR/check-in, revendedores e afiliados (estes dois a confirmar na Community); stack Python/Django + PostgreSQL + Redis → precisa de VPS ou Render (não roda em Cloudflare Workers/D1). AGPL com exceção: pode modificar e usar internamente sem abrir código, desde que não venda o pretix como SaaS. Faltaria: pickup em hotel (campo/pergunta por produto é simples), Pix/Mercado Pago (plugin de pagamento a escrever ou achar), comissão multinível líder→subagente (custom).
  2. **Medusa v2** — MIT, TypeScript, admin moderno, API; booking exige construir o módulo de "saídas" (há tutorial oficial). Precisa de Node + PostgreSQL (Render/VPS); storefront Next.js pode ir para Cloudflare Pages. Faltaria: módulo de saídas/capacidade, voucher PDF/QR, afiliados multinível, Pix.
  3. **Bagisto (MIT, Laravel)** ou **Saleor (BSD)** — e-commerce robusto, mas reserva de passeio é toda custom.
  4. **WordPress + Yatra/Booking Activities (GPL)** — mais barato de hospedar (PHP), mas plugins pequenos, risco de manutenção.
- Nenhum candidato maduro roda nativamente em Cloudflare Workers + D1; para essa stack seria desenvolvimento próprio (ex.: inspirado no modelo de dados do pretix).
- Hotel-only (QloApps) e agendamento 1:1 (Cal, Easy!Appointments) não modelam bem "saída com N vagas + ponto de embarque".

### Gaps
- Não confirmei, no código, se os plugins de revendedores e afiliados do pretix estão na Community Edition hoje (a página marca com símbolo não extraível).
- Não verifiquei existência de plugins pretix para Mercado Pago/Pix (há plugins de terceiros na comunidade? não confirmado).
- Não verifiquei Vik Booking, HotelDruid (repositório GitHub não encontrado no caminho testado), TravelEngine (WP Travel Engine) nem WooCommerce Bookings (pago) com fontes primárias.
- Odoo: módulos "Event" estão no LGPL, mas não confirmei quais módulos de agendamento/booking são Enterprise.
- Não avaliei a UX do admin de cada projeto por teste prático.

## 2. Afiliados/indicação open source para usar junto

### Takeaway
Há várias opções jovens (2025-2026) de afiliados open source, mas nenhuma madura com multinível nativo; o Dub tem programa de parceiros sob licença "ee" separada. O pretix já tem afiliados/revendedores (edição a confirmar). Comissão líder→subagente provavelmente terá de ser construída.

### Cited Findings
- **Dub** — repositório `dubinc/dub` agora aparece como `dubinc/dub.link`, 25.174 estrelas, push 27/10/2026 — [GitHub dubinc/dub](https://github.com/dubinc/dub). Partes em diretórios `(ee)` estão sob licença Enterprise separada; o resto sob outra licença (cabeçalho do LICENSE.md) — [LICENSE Dub](https://github.com/dubinc/dub/blob/main/LICENSE.md).
- **RefRef** — 246 estrelas, AGPL-3.0, TypeScript, push 20/03/2026, "plataforma open source de indicação e afiliados" — [GitHub amicalhq/refref](https://github.com/amicalhq/refref).
- **Refferq** — 142 estrelas, MIT, push 19/10/2026 — [GitHub Refferq/Refferq](https://github.com/Refferq/Refferq).
- **RefearnApp** — 49 estrelas, AGPL-3.0, push 29/10/2026 — [GitHub ZAK123DSFDF/refearnapp](https://github.com/ZAK123DSFDF/refearnapp).
- **OpenPromoter** — 11 estrelas, AGPL-3.0, push 15/11/2026, alternativa auto-hospedada a Rewardful/FirstPromoter — [GitHub openpromoter/openpromoter](https://github.com/openpromoter/openpromoter).
- pretix: links por canal + programa de afiliados + revendedores — [pretix features/marketing](https://pretix.eu/about/en/features/marketing).

### Inferences
- Para comissão multinível (líder ganha sobre subagentes), o mais simples é uma tabela própria de agentes com `parent_id` e regras de percentual por nível, alimentada pelo webhook de pedido pago da base escolhida. As ferramentas acima são voltadas a SaaS/Stripe.
- Refferq (MIT) é a mais permissiva para modificar; RefRef/OpenPromoter (AGPL) exigem publicar alterações se servidas pela rede.

### Gaps
- Não verifiquei se alguma delas suporta multinível nem Mercado Pago/Pix.
- Licença exata da parte não-ee do Dub não foi lida até o fim (cabeçalho cortado).

## 3. Atendimento/vendas por WhatsApp com IA e passagem para humano

### Takeaway
A pilha comum é **Chatwoot** (caixa de atendimento, MIT fora de `enterprise/`) + **Evolution API** ou **Baileys** (conexão WhatsApp não oficial) + **n8n/Typebot** (fluxos e IA). Atenção: Typebot é FSL (não é OSI), n8n é Sustainable Use License (uso interno ok, revenda não) e Evolution API exige ativação em servidor de licença a partir da v2.4.0.

### Cited Findings
- **Chatwoot** — 39.940 estrelas, Ruby, push 16/11/2026 — [GitHub chatwoot/chatwoot](https://github.com/chatwoot/chatwoot). Licença MIT (Expat) para tudo fora do diretório `enterprise/`, que tem licença própria — [LICENSE Chatwoot](https://github.com/chatwoot/chatwoot/blob/develop/LICENSE).
- **Typebot** — 10.629 estrelas, TypeScript, push 07/11/2026 — [GitHub baptisteArno/typebot.io](https://github.com/baptisteArno/typebot.io). Licença Functional Source License 1.1 com conversão futura para Apache 2.0 (FSL-1.1-Apache-2.0) — [LICENSE Typebot](https://github.com/baptisteArno/typebot.io/blob/main/LICENSE).
- **Evolution API** — repositório migrou para `evolution-foundation/evolution-api`, 10.127 estrelas, push 12/11/2026 — [GitHub evolution-foundation/evolution-api](https://github.com/evolution-foundation/evolution-api). Apache 2.0 com condições adicionais (não remover logo/copyright do console; notificação de uso; caso contrário licença comercial) — [LICENSE Evolution API](https://github.com/evolution-foundation/evolution-api/blob/main/LICENSE). A partir da v2.4.0 toda instância precisa ser ativada no servidor de licenças da Evolution Foundation — [releases Evolution API](https://github.com/evolution-foundation/evolution-api/releases) (via resumo de busca; confirmar no changelog).
- **Baileys** (biblioteca WhatsApp Web) — 11.642 estrelas, MIT, push 15/11/2026 — [GitHub WhatsApp/Baileys](https://github.com/WhiskeySockets/Baileys).
- **open-wa/wa-automate** — 3.678 estrelas, push 29/10/2026, licença não-padrão (NOASSERTION) — [GitHub open-wa/wa-automate-nodejs](https://github.com/open-wa/wa-automate-nodejs).
- **n8n** — 210.603 estrelas, push 16/11/2026; "Sustainable Use License", com arquivos `.ee.` sob licença Enterprise — [LICENSE n8n](https://github.com/n8n-io/n8n/blob/master/LICENSE.md).
- Existem templates prontos de deploy Evolution API 2.3 + Typebot 3.19 + Chatwoot 4.19 no Railway — [Railway template](https://railway.com/deploy/evolution-api-23-typebot-319-chatwoot-419--evolution-api-23-typebot-319-chatwoot-41).

### Inferences
- Para controle total e licença limpa: Chatwoot (MIT) + agente de IA próprio chamando a API de pedidos da base de reservas + API oficial do WhatsApp Cloud (ou Baileys, com risco de banimento por ser não oficial).
- Custo: software gratuito; custos são hospedagem (Chatwoot pede Postgres+Redis, ~VPS pequena) e mensagens da API oficial do WhatsApp (não pesquisado aqui).

### Gaps
- Custos por conversa da API oficial WhatsApp Business no Brasil não foram levantados.
- Não confirmei a data/termos exatos do licenciamento obrigatório da Evolution API v2.4.0 na fonte primária.

## 4. SaaS de referência para operadores de passeios (benchmark)

### Takeaway
Os SaaS globais cobram assinatura de US$ 0-499/mês + 1-1,5% (Bókun, TrekkSoft, Rezdy) ou não cobram mensalidade e repassam 6-8% ao cliente (FareHarbor, Peek). O diferencial do Bókun é a conexão nativa com Viator (sem taxa Bókun nos planos pagos, segundo a empresa) e GetYourGuide. No Brasil, o Paytour (RN) é o concorrente direto, com afiliados/revendedores e checkout, preço inicial reportado de R$ 249/mês (não confirmado).

### Cited Findings
- **Bókun (Tripadvisor)**: plano grátis; Start US$ 49/mês + 1,5%; Plus US$ 149/mês + 1,25%; Premium US$ 499/mês + 1% (agregadores, meados de 2026) — [Capterra Bókun pricing](https://www.capterra.com/p/178518/Bokun/pricing/); [Bókun pricing](https://bokun.io/pricing). Bókun afirma não cobrar taxa sobre reservas vindas do Viator nos planos Start/Plus/Premium, mas sua página também cita 0,5-1,5% sobre Viator para usuários do Channel Manager (conflito) — [Bókun pricing](https://bokun.io/pricing); [Bókun marketplace](https://bokun.io/grow/marketplace). GetYourGuide como parceiro de conectividade avançada; comissão negociada com a GYG — [TrekkSoft guia de preços Bókun](https://www.trekksoft.com/en/blog/bokun-pricing-guide-what-to-know-before-you-buy).
- **FareHarbor**: sem mensalidade; taxa de reserva de 6-8% cobrada do cliente no checkout, + processamento de cartão — [Captain Book: FareHarbor pricing 2026](https://www.captainbook.io/blog/fareharbor-pricing-fees-explained); [TrekkSoft alternativas FareHarbor](https://www.trekksoft.com/en/blog/8-best-fareharbor-alternatives-2026-comparison-guide).
- **Peek Pro**: sem mensalidade, comissão até 6% (pode ser repassada ao cliente) + ~2,3% + US$ 0,30 de processamento; Findstack cita US$ 249/mês enterprise (conflito) — [G2 FareHarbor vs Rezdy vs Peek](https://www.g2.com/compare/fareharbor-vs-rezdy-vs-peek-pro); [TrekkSoft Peek pricing](https://www.trekksoft.com/en/blog/peekpro-pricing-guide-what-to-know-before-you-buy); [Findstack](https://findstack.com/compare/fareharbor-vs-peek-pro).
- **Rezdy**: plano Foundation US$ 49/mês (G2); Checkfront fundiu-se com a Rezdy no fim de 2023 e os preços estariam sendo alinhados — [G2 FareHarbor vs Rezdy](https://www.g2.com/compare/fareharbor-vs-rezdy); [Captain Book 2026](https://www.captainbook.io/blog/best-tour-booking-software-in-2026-9-platforms-compared); [TrekkSoft guia Checkfront](https://www.trekksoft.com/en/blog/checkfront-pricing-guide-what-to-know-before-you-buy).
- **TrekkSoft**: fontes conflitantes (US$ 49-499 + 1,5%; ou €149 + 2,5% + 2,5%; ou a partir de €299) — [TrekkSoft alternativas FareHarbor](https://www.trekksoft.com/en/blog/8-best-fareharbor-alternatives-2026-comparison-guide); [Findstack Peek vs TrekkSoft](https://findstack.com/compare/peek-pro-vs-trekksoft).
- **Paytour (Brasil, RN)**: sistema de reservas para passeios, excursões, atrativos e receptivos; recursos de afiliados e revendedores com comissões, loja online e checkout; preço inicial reportado R$ 249/mês (agregador, não confirmado); avaliações mistas (ex.: 2,8/5 em um agregador; reclamações da maquininha) — [B2B Stack Paytour](https://www.b2bstack.com.br/product/paytour); [Capterra Paytour](https://www.capterra.com/p/206213/Paytour/pricing/); [Mercado & Eventos – CEO Paytour](https://www.mercadoeeventos.com.br/?p=347833). Site oficial bloqueou acesso automático (HTTP 403).
- Outros listados para o Brasil: HITS, Rezgo, WebReserv, Zaui — [B2B Stack categoria turismo](https://www.b2bstack.com.br/categoria/software-agencia-turismo); [Capterra BR WebReserv](https://www.capterra.com.br/software/152688/webreserv).

### Inferences
- Benchmark de custo: em R$ 100 mil/mês de vendas, 1,5% (Bókun Start) ≈ R$ 1.500 + mensalidade; FareHarbor/Peek transferem 6-8% ao turista (encarece o preço final). Um fork próprio troca isso por custo de hospedagem + desenvolvimento.
- Estratégia híbrida plausível: base própria (pretix/Medusa) para venda direta e agentes, e conta Bókun (plano grátis/Start) apenas como channel manager para Viator/GetYourGuide, se a distribuição em OTAs for relevante.

### Gaps
- Não achei fontes confiáveis para "Ticket Turismo", "Tour Online", "Sistema Agência Online" ou "Passaporte" como produtos para receptivo.
- Preços oficiais do Paytour, Checkfront e TrekkSoft não confirmados nas páginas dos fornecedores; maioria das comparações vem de concorrentes (viés).
- Taxas de comissão de Viator/GetYourGuide para o operador não levantadas.

## 5. Recomendação: o que bifurcar e o que ainda construir

### Takeaway
Recomendação principal: **fork do pretix** (mais funcional de fábrica: datas com cota, vouchers, QR/check-in, revendedores/afiliados, multi-idioma), hospedado em VPS/Render barato. Alternativa se a equipe preferir TypeScript/MIT e frontend no Cloudflare: **Medusa v2** + módulo de saídas próprio. Em ambos, ainda é preciso construir Pix/Mercado Pago, pickup em hotel, comissão multinível e integração WhatsApp/IA.

### Cited Findings
- pretix: vouchers, cotas, revendedores, afiliados — [pretix features/marketing](https://pretix.eu/about/en/features/marketing); licença AGPL com exceção de seção 13 exceto SaaS — [LICENSE pretix](https://www.github.com/pretix/pretix/blob/master/LICENSE); ativo (push 13/11/2026) — [GitHub pretix](https://github.com/pretix/pretix).
- Medusa: MIT e tutorial oficial de booking com módulo, admin e validação de disponibilidade — [LICENSE Medusa](https://github.com/medusajs/medusa/blob/develop/LICENSE); [Medusa blog booking-system](https://medusajs.com/blog/booking-system/).

### Inferences
- **Ainda a construir (qualquer base):** (1) gateway Pix/Mercado Pago (plugin de pagamento); (2) ponto de embarque/pickup por hotel e roteiro de buscas por saída; (3) comissão multinível líder→subagente com extrato e pagamento; (4) painel do agente (link/código, vendas, comissões); (5) voucher PDF/QR em PT/EN/ES (pretix já tem ingresso com QR); (6) integração WhatsApp (Chatwoot + IA) com consulta de disponibilidade e link de checkout; (7) emissão fiscal (NFS-e) — não pesquisado; (8) opcional: channel manager para OTAs (via Bókun).
- **Hospedagem:** pretix e Medusa exigem PostgreSQL + Redis e processo persistente → VPS (~US$ 5-12/mês) ou Render; Cloudflare Workers + D1 não comporta essas bases sem reescrita (só o storefront estático/Next pode ir para Pages).
- Evitar: Booking Core (licença comercial Envato), Open Event (arquivado), tourapp (abandonado), Typebot como peça central (FSL) se quiser revender a solução.

### Gaps
- Não houve teste prático de instalação/UX de pretix ou Medusa.
- Suporte a BRL/pt-BR no pretix e Medusa não foi confirmado em fonte primária nesta pesquisa (ambos são multi-moeda/multi-idioma por reputação, não verificado aqui).
