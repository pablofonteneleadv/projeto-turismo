# Pilha gratuita de atendimento, IA, divulgação e pagamento (pesquisa de 2026-11-15)

Legenda: [OFICIAL] fonte do fornecedor; [TERCEIRO] blog/agregador; [NÃO CONFIRMADO] conferir antes de decidir. Pesquisa só de leitura, nenhuma conta criada.

DECISÃO DO DONO: canal principal = Cloud API oficial da Meta. Wafly/Wame ficam só como referência (seção 1.4).

## 1. WhatsApp Cloud API oficial

### 1.1 O que é grátis em nov/2026 [OFICIAL] https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Mensagem do cliente para a empresa: nunca é cobrada.
- Janela de atendimento (customer service window): 24h, renovada a cada mensagem do cliente. Dentro dela dá para enviar mensagens livres (não template).
- Cota mensal NOVA: a partir de 1/out/2026, as mensagens de serviço (resposta livre dentro da janela de 24h) passam a ser cobradas, mas cada número tem 1.000 mensagens de serviço grátis por mês (conta mensagens enviadas pela empresa, não conversas). A cota expira todo mês e não acumula. A cobrança começa na 1.001ª. Sem forma de pagamento cadastrada no Billing Hub, as mensagens acima de 1.000 NÃO são entregues. Ou seja: cadastrar cartão e monitorar o consumo.
- Anúncio clique-para-WhatsApp (ponto de entrada gratuito, FEP): se o cliente chega por anúncio CTWA (só Android/iOS, não desktop/web) e a empresa responde dentro da janela de 24h, abre-se uma janela de até 7 dias em que marketing, utilidade, autenticação e serviço NÃO são cobrados (exceto Meta Business Agent). A janela vale para todas as contas de mensagem do mesmo número. Observação: a Meta cobra o anúncio em si, só a mensagem é grátis.
- Isenção até 31/dez/2027 só para governo/ONG elegíveis (não se aplica).
- Desde 1/jul/2025 a cobrança é por mensagem entregue (não mais por conversa).

### 1.2 O que é pago e quanto (Brasil)
- Cobrados por mensagem entregue: template de marketing, template de utilidade (fora da janela de 24h), template de autenticação, e serviço acima de 1.000/mês. Utilidade enviada DENTRO da janela passa a ser cobrada desde 1/out/2026 conforme a página. Volume tiers só valem para utilidade e autenticação; marketing não tem desconto.
- Moeda: desde jul/2026 dá para abrir conta em BRL (faturada pela Facebook Brasil); contas em USD no Brasil precisam migrar até 30/6/2027, senão param de receber mensagens em 1/7/2027. A tabela oficial em R$ está no rate card (CSV/PDF) da Meta, que não vem no texto da página.
- Valores em R$, só de terceiros e divergentes [TERCEIRO, NÃO CONFIRMADO]: marketing entre R$ 0,32 e R$ 0,39 por mensagem; utilidade entre R$ 0,035 e R$ 0,08; autenticação entre R$ 0,035 e R$ 0,09. Fontes: https://chatmaxima.com/whatsapp-api-pricing/brazil/ e https://hyperleap.ai/whatsapp-pricing-calculator-brazil . Referência em USD (blog de mai/2026): marketing US$ 0,0625 e utilidade US$ 0,0068 no Brasil (https://blueticks.co/blog/whatsapp-business-api-pricing-2026). A própria página da Meta estima ~US$ 0,0068 para utilidade/autenticação no Brasil. USAR a tabela oficial do rate card (baixar na conta Meta) antes de orçar.
- Meta Business Agent (IA da Meta): ~US$ 2 por milhão de tokens, cerca de 4 a 5 centavos de dólar por mensagem. Não usar; o agente próprio roda em outro lugar.
- Regra prática para o negócio: responder cliente que escreveu primeiro = grátis (até 1.000/mês); campanha de promoção/reengajamento por template = pago (~R$ 0,3 a 0,4 cada); clique-para-WhatsApp = 7 dias sem cobrança de mensagem.

### 1.3 Cadastro direto pela Meta, sem BSP pago, e Coexistência
- Cloud API direta: a página de preços reconhece "empresas integradas diretamente" (sem Solution Provider). Fluxo: conta Meta Business verificada + app de desenvolvedor + WABA + número + token; custo só os das mensagens, sem mensalidade de BSP. [OFICIAL, indireto]
- Coexistência (mesmo número no app WhatsApp Business e na API) [OFICIAL] https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users :
  - exige app WhatsApp Business versão 2.24.17 ou superior;
  - a doc exige onboarding por Embedded Signup com `featureType = whatsapp_business_app_onboarding` e fala em ser Solution Partner ou Tech Provider. Portanto a coexistência NÃO é um botão self-serve no painel para qualquer um: ou se usa um provedor (BSP/Tech Provider) que faça o Embedded Signup, ou o dono vira Tech Provider do próprio app (exige App Review e verificação). Este é o ponto de atrito mais importante e [NÃO CONFIRMADO] se existe caminho direto para empresa comum; investigar no painel Meta (WhatsApp Manager).
  - limitações com coexistência: throughput fixo de 20 mensagens por segundo; grupos NÃO sincronizam e não são suportados na API; listas de transmissão desativadas (somem as novas, as antigas ficam só leitura); Status não é suportado pela API; Channels e chamadas de voz/vídeo não suportados; mensagens temporárias, visualização única e localização em tempo real ficam desligadas no 1:1; editar e apagar mensagens funcionam.
  - histórico: tem 24h após o onboarding para sincronizar contatos e conversas dos últimos 180 dias (sem grupos); mídia só dos últimos 14 dias; webhooks `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes`.
  - Embedded Signup v2 e v3 serão descontinuados em 15/out/2026 (já passou): usar v4.
  - Brasil: aparece como mercado suportado em fontes de terceiros (https://www.kommo.com/blog/whatsapp-coexistence/ , https://chakrahq.com/article/whatsapp-coexistence-live-eu-uk-europe-whatsapp-business-for-api-live/); a doc oficial lida não lista países. Mensagens enviadas pelo app seguem grátis.
- Consequência para o plano: a API oficial NÃO posta Status e NÃO gerencia grupos. Para isso: o humano usa o app WhatsApp Business (Status funciona no app; em coexistência o Status do app continua no app, conferir), ou mantém Wafly/Wame em um número SEPARADO só para grupos/status (risco de bloqueio isolado do número de vendas).
- Política de IA: a Meta proibiu chatbots de IA de uso geral na API (jan/2026); bot de atendimento da própria empresa é permitido. O CADE suspendeu a regra no Brasil (liminar mantida em mar/2026; status posterior não confirmado). https://techcrunch.com/2026/01/13/brazil-orders-meta-to-suspend-policy-banning-third-party-ai-chatbots-from-whatsapp ; https://macmagazine.com.br/post/2026/03/04/tribunal-do-cade-mantem-liminar-contra-termos-de-ia-do-whatsapp-no-brasil/

### 1.4 Wafly e Wame (só referência)
- WAFLY (WhatsApp 1) [OFICIAL] https://wafly.com.br : teste grátis de 3 dias com número próprio, sem cartão; R$ 59,90 por número por mês (até 10 instâncias; 11+ = R$ 39,90); anual R$ 599 por instância pagos adiantado; mensagens ilimitadas; REST + webhooks, documentação pública, nó n8n. Aviso na página: conexão "Flex" não é oficial da Meta, risco de bloqueio ou desconexão.
- WAME (WhatsApp 2) [OFICIAL] https://wame.api.br/ : sem teste grátis; Basic R$ 59,90/mês (texto, webhook, respostas, contatos, grupos, mídia, status), Pro R$ 79,90 (botões etc.), Enterprise R$ 99,90 (tudo, inclui Conexão Mobile); sem fidelidade. Avisa risco de bloqueio por ser não oficial.
- Risco: não oficial pode banir o número (que é o ativo de vendas); oficial tem risco bem menor se cumprir política (opt-in, templates).
- Combinação sugerida: oficial como número de vendas e anúncios (R$ 0 fixo); Wafly/Wame, se necessário, só em número secundário para grupos/status/avisos operacionais, nunca para disparo frio em massa.

## 2. Caixa de atendimento aberta
- Chatwoot: Community Edition MIT (grátis); pasta enterprise/ proprietária (white-label, SLA, auditoria, capacidade de agentes), planos pagos a partir de US$ 19 por agente por mês; Captain AI é pago. Canais: site, e-mail, Facebook, Instagram, WhatsApp, Telegram etc. [OFICIAL] https://github.com/chatwoot/chatwoot , https://developers.chatwoot.com/self-hosted/enterprise-edition . Self-host: servidores web e workers, PostgreSQL, Redis, SMTP e armazenamento de objetos (https://developers.chatwoot.com/self-hosted/deployment/architecture); RAM/CPU não estão na doc (comunidade costuma citar 2 a 4 GB; NÃO CONFIRMADO). Não roda em Cloudflare Workers: precisa de VPS pequeno. Conexão com WhatsApp Cloud API e Instagram: o README lista ambos; passo a passo da Cloud API não pôde ser lido (404). Passagem para humano: agent bots via API (conferir se liberado na Community).
- Papercups, Tiledesk, Zammad: não pesquisados a fundo. [NÃO CONFIRMADO] (Papercups sem manutenção relevante; Zammad focado em tickets/e-mail).
- Alternativa leve: Worker Cloudflare recebendo o webhook da Cloud API + D1 + IA + marcação "humano assume"; humano responde pelo app WhatsApp Business (coexistência) ou por um painel simples.

## 3. IA grátis ou barata
- Cloudflare Workers AI [OFICIAL] https://developers.cloudflare.com/workers-ai/platform/pricing/ : 10.000 neurons por dia grátis (Workers Free e Paid), reset 00:00 UTC; excedente US$ 0,011 por 1.000 neurons; ao estourar o limite diário falha (sem fallback automático); alguns modelos grandes exigem plano pago. Melhor encaixe (já é Cloudflare).
- Gemini API: limites por modelo não são mais publicados (só no AI Studio logado, "não garantidos"). Termos do nível gratuito: Google usa entradas e saídas para melhorar produtos, revisores humanos podem ler, e proíbe enviar dados pessoais/sensíveis; pago é necessário para produção/usuários no EEE-UK-Suíça. Não adequado para dados de clientes no plano grátis. [OFICIAL] https://aistudio.google.com/docs/terms , https://aistudio.google.com/docs/rate-limits
- OpenRouter :free [OFICIAL] https://openrouter.ai/docs/api-reference/limits : 20 req/min; 50 req/dia com menos de US$ 10 de crédito comprado, 1.000/dia com 10 ou mais. Só teste.
- Groq: plano Free existe com limites por modelo; números não constam no texto lido, ver console logado. https://console.groq.com/docs/rate-limits [NÃO CONFIRMADO]
- Mistral Experiment: grátis, mas as requisições podem ser usadas para treinar e não dá para optar por sair; Scale não treina. https://help.mistral.ai/en/articles/450104-how-can-i-try-the-api-for-free-with-the-experiment-plan
- NVIDIA build.nvidia.com: trial só para teste/avaliação, sem produção (exige licença AI Enterprise); ~40 req/min é relato de fórum. https://forums.developer.nvidia.com/t/api-trial/385386
- Conclusão: Workers AI como base grátis, com modelo pago barato como degrau quando o volume crescer. Evitar tiers grátis que treinam com dados (Gemini, Mistral) para conversas de clientes.

## 4. Frameworks de agente
- Rasa Open Source: Apache 2.0, em modo de manutenção; foco no Rasa Platform/CALM (comercial). https://github.com/RasaHQ/rasa
- Botpress: repositório MIT, centrado no Botpress Cloud. https://github.com/botpress/botpress
- Flowise: Apache 2.0 (verificar pasta enterprise). https://github.com/FlowiseAI/Flowise
- Dify: licença própria (Apache 2.0 + condições): licença comercial para operar multi-tenant e manter logo/copyright do frontend; uso interno ok. https://raw.githubusercontent.com/langgenius/dify/main/LICENSE
- Para um agente de vendas com handoff, um Worker próprio com LLM + regras costuma ser mais simples e barato que subir Dify/Flowise (exigem servidor).

## 5. Postagem nas redes
- Meta Business Suite e agendador nativo do Instagram: grátis, conta profissional; feed/carrossel/Reels até 75 dias, Stories no Business Suite, ~25 posts/dia (prazos do Facebook divergem). [TERCEIRO] https://tecnoblog.net/noticias/publicacoes-do-instagram-agora-podem-ser-agendadas-diretamente-pelo-app/ , https://adaptlypost.com/pt/blog/how-to-schedule-instagram-posts-in-2025 . Opção de custo e atrito zero.
- Postiz self-hosted: AGPL-3.0; exige Postgres, Redis, Temporal, servidor e apps próprios aprovados em cada rede (Meta pode levar semanas). https://github.com/gitroomhq/postiz-app
- Mixpost Lite: MIT (PHP/Laravel), Pro pago; redes suportadas não confirmadas. https://github.com/inovector/mixpost
- WhatsApp Status: sem API oficial; fazer pelo app.

## 6. Cupom / afiliado / comissão
- Abertos achados [TERCEIRO, maturidade a verificar]: Dub (partes sob licença comercial; afiliados/payouts pagos), RefearnApp (roda em Cloudflare Workers), OpenPartner (Workers/Node). Rastreio de cupom não confirmado em nenhum.
- Alternativa de custo zero: tabela de cupons por parceiro em D1 (Cloudflare); o agente registra o código na venda; relatório de comissão em planilha.

## 7. Pagamento sem mensalidade (Brasil)
- InfinitePay [OFICIAL] https://www.infinitepay.io/pix/venda : Pix grátis para CPF, MEI e CNPJ; link de pagamento grátis de criar (Pix ou cartão até 12x, cartão com taxa); sem API aberta citada (só checkout integrado dentro do site InfinitePay). Pix via link isolado: FAQ ambígua, confirmar no app.
- Mercado Pago [OFICIAL] https://www.mercadopago.com.br/ferramentas-para-vender/link-de-pagamento : sem mensalidade; link com Pix 0,99%, cartão 4,98% (na hora) a 3,99% (30 dias), boleto R$ 3,99. Tem API/Checkout (taxas no portal de desenvolvedores, não lidas); CPF vs CNPJ não informado.
- Asaas [OFICIAL] https://www.asaas.com/precos-e-taxas : conta grátis, sem mensalidade; Pix recebido R$ 0,79 (aparece R$ 1,59 riscado) por transação; outras fontes citam R$ 0,99 por 3 meses depois R$ 1,99, e franquias de 30 ou 100 Pix grátis; conflito, conferir. API completa; aceita cadastro de pessoa física. NFS-e [NÃO CONFIRMADO].
- Efí e PagBank: tarifas não verificadas. [NÃO CONFIRMADO]
- Regra geral: a Resolução BCB 19 não permite tarifar Pix recebido de PF/EI/MEI, com exceções (mais de 30 por mês, QR dinâmico). [TERCEIRO] https://tecnoblog.net/responde/6-perguntas-e-respostas-sobre-o-pix-para-empresas-cnpj/
- Recomendação: começar com InfinitePay (Pix grátis, aceita CPF/MEI) e o humano enviando o link no fechamento; adicionar API (Asaas ou Mercado Pago) só com volume.

## 8. Nota fiscal de serviço
- Emissor Nacional NFS-e (gov.br/nfse): emissor oficial para MEI; padrão nacional obrigatório para MEI (Receita cita set/2023; outras fontes, 1/1/2026); obrigatório emitir quando o cliente é PJ, opcional para PF. Acesso por gov.br prata/ouro, sem certificado. Gratuidade não afirmada textualmente nas fontes lidas. https://www.gov.br/nfse/pt-br
- Fortaleza: Comunicado SEFIN nº 5 (23/7/2026) abriu testes do emissor nacional para Simples (ME/EPP), obrigatoriedade a partir de nov/2026 (data oficial divergente entre fontes). https://www.legisweb.com.br/legislacao/?id=498664 . Confirmar na SEFIN Fortaleza.

## Pendências para confirmar
1. Rate card BRL oficial (marketing, utilidade, autenticação) no WhatsApp Manager.
2. Caminho de coexistência sem BSP pago (Embedded Signup exige Tech Provider/Solution Partner segundo a doc); o dono ser Tech Provider do próprio app é viável? Alternativa: BSP barato só para o onboarding.
3. Se Status do app continua funcionando em coexistência e como o humano posta.
4. Limites atuais de Gemini, Groq, Mistral (só logado); RAM do Chatwoot; agent bots na Community.
5. Se a agência é MEI ou ME (NFS-e e conta Pix).
