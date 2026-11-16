# Revisão do site Maré Tur (site-v2/)

Data: 16/11/2026. Nenhum arquivo do site foi alterado.

## Resultado primeiro

- **6 pontos de prioridade alta** (itens 1 a 6): informações falsas ou erradas que podem gerar reclamação ou problema legal. Total: 22 itens.
- O site tem **dois catálogos**: `assets/data.js` (dados de reserva, usados se o Supabase falhar) e `supabase/catalogo_enseada.sql` (catálogo "Enseada 2025", com slugs diferentes). Esta revisão olha o `data.js` e o `index.html`/`passeio.html`. Antes de editar, confirme qual catálogo está no ar (não foi possível ver o banco). Itens marcados **[seed]** valem só para o `data.js`.
- Limite: as fotos foram avaliadas pelos nomes e créditos em `fotos/creditos.json`, não olhando cada imagem. Conferir as marcadas "ver foto".
- Preços do site não foram validados. Os de `data.js` aparecem como **a confirmar** com o Bruno. A pesquisa em `research_notes` traz faixas, sem data na maioria.

---

## Prioridade ALTA

### 1. Avaliação falsa no HTML (4,9 · 128 avaliações)
- Arquivo: `index.html`, linha do `<div class="rating">`
- Atual: `<b id="ratingValue">4,9</b><span id="ratingCount">· 128 avaliações</span>`
- Problema: o JS esconde o bloco quando não há avaliação real, mas o HTML estático mostra 4,9 e 128 por um instante, e some só se o JS rodar. Sem JS, ou no Google, aparece nota inventada. Risco de propaganda enganosa.
- Sugestão: trocar por `<div class="rating" hidden><span class="stars" aria-hidden="true">★★★★★</span><b id="ratingValue"></b><span id="ratingCount"></span></div>`. Mostrar só com avaliação real.
- Mesmo cuidado: `data.js` traz `rating` de 4,7 a 5,0 em todos os passeios. Hoje fica escondido porque `rating_count` está vazio. Zerar esses valores ou só preencher `rating_count` com avaliações reais.

### 2. Cadastur: "credenciado" no topo, "em andamento" no rodapé
- Arquivo: `assets/data.js` (SETTINGS) e `index.html`
- Atual: `hero_eyebrow: "Receptivo em Fortaleza · Cadastur"`, promessa "Guia credenciado Cadastur", mas `footer_note: "Fortaleza, CE · Cadastur em andamento"`.
- Problema: o site afirma credenciamento e admite que está em andamento. O guia tem Cadastur (informado na tarefa), mas a agência/empresa talvez não.
- Sugestão: escrever "Guia de turismo cadastrado no Cadastur" (só se o número estiver ativo) e colocar o nº do Cadastur no rodapé: `Fortaleza, CE · Guia Cadastur nº [a confirmar]`. Tirar "em andamento". Trocar "Receptivo" por "Passeios" (turista não usa essa palavra).

### 3. Passeio de veleiro diz "Busca: No seu hotel"
- Arquivo: `assets/tour.js` (bloco `facts`) e `assets/home.js` (tag do card)
- Atual: tudo que não é transfer mostra "No seu hotel" / "Busca no hotel". O veleiro sai "da Beira Mar" (`location`) e não tem busca confirmada.
- Sugestão: usar `t.pickup` por passeio. Para o veleiro: "Ponto de encontro: Beira Mar (local exato a confirmar)". Idem Cumbuco/privativos, se houver ponto fixo.

### 4. Fotos que não são do destino
- `5praias-1.jpg`: "Fortaleza do Futuro" (cidade), usada no pacote "5 praias em 3 dias". `5praias-2/3` são de Jericoacoara, mas o pacote não tem Jeri. Sugestão: usar `cumbuco-1`, `lagoinha-1` e `3praias-1` na galeria do pacote.
- `privcumbuco-1.jpg`: buggy em **Canoa Quebrada**, em "Cumbuco privativo". `privcumbuco-3.jpg`: **Genipabu, RN** (outro estado). Sugestão: usar `cumbuco-1/2/3`.
- `privjeri-1.jpg`: título "Desafio em Jeri" (ver foto: pode ser evento). Sugestão: `jeribv-1` ou `privjeri-2`.
- `hero-1.jpg`: Caponga, Cascavel. Só sirva de capa se a legenda disser o lugar.
- `veleiro-1/2/3`: Enseada do Mucuripe e jangadas, nenhuma é veleiro. Para vender o passeio, a foto precisa mostrar veleiro ao pôr do sol. Foto própria do Bruno, quando houver.

### 5. Criança: o código cobra preço cheio, o texto promete meia
- Arquivo: `assets/data.js` (`child_factor: 1`) × FAQ ("De 5 a 10 anos paga meia na maioria dos passeios")
- Problema: a calculadora cobra 100% da criança (fator 1). Cliente vê meia na FAQ e preço cheio no total.
- Sugestão: confirmar com o Bruno a regra. Se for meia: `child_factor: 0.5`. FAQ: "Até 4 anos: grátis, no colo. De 5 a 10 anos: meia (50%). A partir de 11: preço de adulto." Em `passeio.html`, o rótulo "Idosos 60 anos ou mais" sugere desconto: dizer qual (a confirmar) ou remover o campo.

### 6. Jericoacoara bate-volta: resumo promete o que a descrição nega **[seed]**
- Arquivo: `assets/data.js`, passeio `jeribv`
- Atual: `summary: "Jeri em um dia: Pedra Furada, lagoas e o pôr do sol na duna."` × `description: "...a Lagoa do Paraíso e a Pedra Furada são opcionais."`
- Sugestão: `summary: "Jeri em um dia, ida e volta de Fortaleza: vila, pôr do sol na duna e, se quiser, lagoas e Pedra Furada."`
- Falta roteiro (`itinerary` vazio): para 21 h de passeio, listar paradas, almoço e horário de volta. Exemplo: "02:30 busca · 07:30 café (a confirmar) · 09:30 chegada · 17:30 pôr do sol na duna · 19:30 saída · 23:30 hotel (todos a confirmar)".
- A taxa de Jeri (R$ 41,50) está como extra. Está na pesquisa, mas só por resumo de busca: **a confirmar** o valor de 2026.

---

## Prioridade MÉDIA

### 7. Campos "location" e "times" com texto errado **[seed]**
- `privcumbuco`: `location: "Van só para você"`, `times: "Horário que você escolher · até 6 pessoas"`. `privjeri`: `location: "4x4 só para você"`, `times: "Até 4 pessoas"`.
- Problema: aparece "📍 Van só para você" no card e "Horários: Até 4 pessoas" na ficha.
- Sugestão: `location: "Caucaia"` / `"Jericoacoara"`; `times: "Horário combinado com você"`; e um campo `capacity: "Até 6 pessoas"`. Texto: "Van só para o seu grupo, até 6 pessoas."

### 8. Passeios sem roteiro nem "o que levar"
- Sem `itinerary`: `morro`, `aguas`, `flexau`, `jeribv`, `jeri3`, `5praias`, `privcumbuco`, `privjeri`, `aeroporto`, `transjeri`, `veleiro`. Lagoinha e Canoa têm só 4 linhas.
- Sugestão: padrão mínimo para todos: saída, chegada, tempo livre, almoço, volta. Exemplo Morro Branco: "07:00 busca · 09:30 labirinto das falésias · 12:00 almoço (por conta) · 16:00 saída · 17:00 hotel" (horários a confirmar).
- Acrescentar em `passeio.html` um bloco "Leve" (protetor solar, roupa de banho, dinheiro para extras) e "Almoço: não incluso".

### 9. "Incluso" genérico igual para quase todos **[seed]**
- Padrão: "Transporte com ar-condicionado, Guia credenciado, Seguro, Busca e volta ao hotel".
- Problema: não diz entrada, taxa, almoço, bebida, fotos. Quem decide quer saber o que paga a mais.
- Sugestão: incluir a linha "Não incluso: almoço, bebidas e passeios opcionais" nos passeios com almoço (3praias, cumbuco, lagoinha, canoa, morro, aguas, flexau). Para cada passeio, dizer se há entrada/taxa (a confirmar). No privativo, confirmar se "ar-condicionado" vale para o 4x4.

### 10. Desconto do Pix varia sem explicação
- Diferenças entre `price_card` e `price_pix`: 10 (3praias), 5 (cumbuco, lagoinha, canoa, morro, flexau), 10 (aguas, jeribv), 40 (jeri3), 20 (flexau), 29 (privcumbuco), 70 (privjeri).
- Textos dizem "Pix com desconto" sem número. Sugestão: no card, "R$ 89,90 no Pix · R$ 99,90 no cartão", e na `meta description` "Pix com até X% de desconto" (calcular após confirmar preços).
- Conferir `price_pix` de `flexau` (189,90 / 174,90): pesquisa mostra R$ 186 para Flecheiras + Mundaú (Civitatis, fev/2025), ok. `jeri3` 790: pesquisa mostra 600–850; ok, mas **a confirmar**.

### 11. Cancelamento: três textos diferentes
- `cancel_policy`: "devolução em até 2 dias úteis". FAQ: "cancelamento com devolução integral". Contrato (commit f930958) tem regras de sinal e cancelamento que não foram lidas aqui.
- Pergunta ao Bruno: o sinal de 20% também é devolvido? Sugestão de texto único: "Cancele até 24 h antes e receba o valor pago de volta em até 2 dias úteis. Se chover e o passeio não sair, você escolhe outra data ou recebe tudo de volta." Repetir em FAQ, `passeio.html` e `index.html`. **A confirmar** com o contrato.

### 12. Preço de extras inconsistente entre passeios **[seed]**
- Buggy: R$ 300 (lagoinha, morro), 350 (3praias, flexau), 400 (canoa), 450 (cumbuco, privcumbuco). "Almoço na barraca": "R$ 60–90" (faixa, não preço).
- Sugestão: confirmar cada valor com o Bruno. Trocar "R$ 60–90" por "a partir de R$ 60 (cardápio da barraca)".
- A pesquisa cita buggy ~R$ 100 por pessoa em Cumbuco e R$ 500 por carro em Jeri, sem data. Os valores do site não são validados: **a confirmar**.

### 13. Duração × horários
- `flexau`: saída 07:00 e volta 18:30 = 11 h 30, mas `duration: "Dia inteiro, 11 h"`. Trocar por "Dia inteiro, 11 h 30".
- `veleiro`: `times: "Saída 16:00 · 1 h 30"` repete a duração. Sugestão: `times: "Saída 16:00 (confirmar horário do pôr do sol na data)"`.
- `3praias`: "Praia das Fontes, banho e almoço" às 12:00 e Uruaú às 15:00. A pesquisa cita Canoa em alguns roteiros de 3 praias; confirmar se o seu roteiro é igual.

### 14. Textos que não vendem
- Título principal: "Passeios saindo do seu hotel em Fortaleza". Sugestão: "Jericoacoara, Cumbuco e Canoa Quebrada com busca no seu hotel em Fortaleza".
- Cartão "Resposta em minutos": prometer só com horário. Sugestão: "Atendimento no WhatsApp, todos os dias das [a confirmar] às [a confirmar]".
- Passos: "Dúvidas, chama no WhatsApp." → "Dúvidas? Chame no WhatsApp."
- `5praias`: "Cumbuco, Lagoinha e 3 Praias com um só pagamento." A conta (1+1+3 = 5 praias) não é óbvia. Sugestão: "Cumbuco, Lagoinha e 3 Praias em três dias, com um só pagamento e busca no hotel todo dia."
- `lagoinha`: "uma das praias mais bonitas do Ceará" é opinião sem prova; usar "mar calmo, coqueiros e mirante".
- `canoa`: "as falésias mais famosas do Ceará" idem. Usar "falésias vermelhas, Broadway e pôr do sol".
- `aeroporto`: não diz se o preço é por pessoa ou por carro. Sugestão: "R$ 54,90 por pessoa" ou "por carro, até X pessoas" (a confirmar).

### 15. Sitemap não bate com o catálogo
- `sitemap.xml` lista `jeri-economy`, `3praias-buggy`, `paracuru`, `beach-park` etc. (do SQL). Não lista `canoa`, `morro`, `privcumbuco`, `veleiro`, `aeroporto` (do seed). Se o SQL estiver no ar, `canoa`, `morro` e outros do seed deixam de existir e viram "Passeio não encontrado".
- Sugestão: gerar o sitemap a partir do catálogo que está no ar, e conferir se os links antigos não quebram.

### 16. Página do passeio: título, SEO e compartilhamento
- `passeio.html` tem título estático "Passeio saindo de Fortaleza" e sem `og:title`/`og:image`/`canonical`. O JS troca o título, mas WhatsApp e Google leem o HTML original: ao compartilhar, todo passeio aparece igual e sem foto.
- Sugestão: gerar uma página por passeio (ou usar Cloudflare/Render com pré-renderização) com `og:title`, `og:image` e `canonical`. Enquanto isso, ao menos `og:image` fixa e título "Passeios em Fortaleza | Maré Tur".
- Título de `index.html` tem ~95 caracteres (Google corta em ~60). Sugestão: `Maré Tur · Passeios em Fortaleza com busca no hotel`.
- Título dinâmico: "X saindo de Fortaleza | Maré Tur Passeios". Trocar por "X saindo de Fortaleza | Maré Tur".

### 17. Texto alternativo das fotos
- Em `ui.js`, o `alt` das galerias vem só do nome do passeio, igual nas 3 fotos ("Cumbuco", "Cumbuco", "Cumbuco"). Em `tour.js`, a galeria usa `t.name` para todas.
- Sugestão: usar `alt` por foto em `photos`, ex. `{url:"fotos/cumbuco-1.jpg", alt:"Dunas e mar em Cumbuco, Caucaia"}`; fallback `t.name + " – foto " + (i+1)`. Exemplos prontos:
  - `3praias-1`: "Falésias e piscinas da Praia das Fontes, Beberibe"
  - `jeribv-1`: "Pedra Furada, Jericoacoara"
  - `lagoinha-1`: "Coqueiros e mar calmo na Praia da Lagoinha, Paraipaba"
  - `canoa-1`: "Falésias de Canoa Quebrada, Aracati"
  - `veleiro-1`: "Enseada do Mucuripe ao entardecer, Fortaleza" (só se for isso)
- Hero: alt atual "Praia de Iracema e Beira Mar de Fortaleza" está bom.
- O crédito da foto (CC BY / CC BY-SA) é exigido; o `onerror` que troca por SVG some com o alt, ficar atento.

### 18. Parceiros: promessa sem valor
- "Você ganha comissão de cada passeio realizado" sem percentual. Sugestão: "Comissão de X% (a confirmar) por passeio realizado, paga em até X dias (a confirmar)". Cupom de exemplo `BRUNO` (5%) fica ativo no modo demonstração: tirar do código de produção.

---

## Prioridade BAIXA

### 19. Português e padronização
- `index.html`: "O que dizem de nós" → "O que os clientes dizem". "Seja parceiro" → "Seja nosso parceiro". "Tudo claro na sua reserva" → "Perguntas frequentes" (rótulo `eyebrow` "Informações" e título dizem o mesmo; o título está vago).
- "Promoções da semana" no formulário de newsletter promete frequência semanal. Sugestão: "Promoções por WhatsApp" e checar a regra de consentimento (LGPD): acrescentar "Ao enviar, você aceita receber mensagens. Responda SAIR para parar."
- "Pague como preferir" (passo 2) × texto que fala só de sinal de 20%: "Pague 20% no Pix para garantir a vaga; o resto no embarque (dinheiro, Pix ou cartão)." Título: "Garanta a vaga com 20%".
- `passeio.html`: "Quase lá" no modal e "Reserva recebida" (mas a vaga só fica garantida após pagamento, como o texto diz). Sugestão: "Pedido de reserva recebido".
- Padronizar "Pix", "R$ 41,50", "9 h"/"9h", "WhatsApp".

### 20. Hierarquia dos blocos na home
- A seção "Como funciona" vem antes da lista de passeios. No celular, o turista rola duas telas antes de ver preço. Sugestão: levar "Escolha seu dia de praia" para logo após o hero e deixar "Como funciona" depois.
- O botão fixo do WhatsApp (56 px) e a barra "Reservar" ficam sobrepostos ao conteúdo no fim da página. Em `app.css` já existe `body.has-bar .chat` (sobe 92 px); conferir no celular pequeno (≤360 px) se o botão cobre o texto da FAQ/rodapé. Sugestão: `padding-bottom:120px` no `body`.

### 21. Celular
- Hero `h1` com `font-size: 2.6rem` fixo: no celular de 360 px quebra em 5 linhas. Sugestão: `font-size: clamp(1.9rem, 7vw, 2.6rem)`.
- Rótulos de campos com `font-size: .72rem` (≈11,5 px) e `.logo small .62rem` (≈10 px): abaixo do legível. Subir para `.78rem` / `.7rem`.
- Botões do topo e filtros têm `padding: 8–9px`: alvo de toque ~38 px. Sugestão: altura mínima de 44 px.
- Fotos: cada JPG tem 140–380 KB (total ≈ 14 MB). Usar `width/height` no `<img>` (evita pulo de layout), reduzir para ≤ 1200 px e ≤ 150 KB. Só `loading="lazy"` não resolve o peso da capa; a foto de capa deveria carregar sem `lazy` e com `fetchpriority="high"`.
- Datas: o campo `type="date"` na busca não informa "data da viagem" para quem não preencheu. Sugestão de rótulo: "Data do passeio (opcional)".

### 22. Informações que ainda faltam para o turista decidir (a confirmar com o Bruno)
- Ponto de saída/busca: lista de hotéis atendidos e janela de busca (ex.: "Beira Mar, Meireles, Iracema"; só o Cumbuco fala disso). Praia do Futuro, Aldeota, Centro e hospedagens fora da orla: atendidas? Taxa?
- Idioma do guia (português/inglês/espanhol).
- Número mínimo de pessoas para o passeio sair e tamanho do grupo.
- Acessibilidade e restrições (gestantes, mobilidade).
- Política de bagagem/mala no dia do voo (só o Cumbuco avisa "evite marcar no dia do voo"; vale para Jeri 3 dias e 5 praias também).
- Maré e chuva: Flecheiras ("piscinas naturais na maré baixa") depende da tábua de marés. Dizer "a confirmar por data".
- Número do Cadastur, razão social e CNPJ no rodapé (confiança).
- Idioma da página: se o público é gringo (Fortaleza recebe muito turista de fora), considerar versão em inglês/espanhol depois.

---

## Resumo por arquivo

| Arquivo | Itens |
|---|---|
| `index.html` | 1, 2, 14, 16, 19, 20, 21 |
| `passeio.html` | 5, 16, 17, 19 |
| `assets/data.js` | 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 |
| `assets/tour.js` | 3, 17, 8 |
| `assets/home.js` | 3, 20 |
| `assets/app.css` | 20, 21 |
| `fotos/` e `creditos.json` | 4, 17, 21 |
| `sitemap.xml` | 15 |

## Perguntas para o Bruno (resolvem vários itens)
1. Número do Cadastur é do guia, da agência ou dos dois? Qual?
2. Criança paga meia? Idoso tem desconto?
3. Valores atuais dos extras (buggy, jangada, almoço) e da taxa de Jeri.
4. Pontos de busca atendidos e janelas de horário.
5. Quais fotos reais (próprias) podem substituir as de veleiro, privativos e 5 praias.
6. Qual catálogo está no ar: seed (`data.js`) ou "Enseada 2025" (`catalogo_enseada.sql`)?
