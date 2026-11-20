# Decisões e pendências

## Decidido (15/11/2026)

- Projeto independente da TENKiTER Modas, em pasta e repositório próprios (`Documents\Turismo`, fora de `Documents\Codex`), para que agentes não confundam contexto, memória ou credenciais.
- Prefixos: variáveis `TURISMO_*`, recursos em nuvem `turismo-*`, linhas de trabalho `turismo-*`.
- Nome definido em 16/11/2026: **Maré Tur** (site oficial maretur.com.br). Telefone do guia Bruno: (85) 99768-7598.

## Situação em 16/11/2026 (plano de 4 semanas do relatório `reports/Venda de passeios em Fortaleza.md`)

Meta da semana 3 (30/11 a 6/12): **primeira venda paga online com cupom**.

Feito:
- [x] Nome e marca: **Maré Tur**; nicho: passeios saindo de Fortaleza com busca no hotel; receita: margem sobre a tarifa do fornecedor + cupom de agente
- [x] Stack: site estático no Render (maretur.com.br) + Supabase `turismo-passeios`; repositórios `projeto-turismo` (privado) e `passeios-fortaleza` (site)
- [x] Site vendendo: 21 passeios com preços da Enseada, sinal de 20% no Pix, reserva registrada no banco e enviada no WhatsApp, painel `/admin.html`, cupom BRUNO (5%) ativo
- [x] Revisão de 22 pontos aplicada (avaliações só reais, Cadastur, textos, celular, fotos leves)
- [x] Uma página por passeio (`passeio-<slug>.html`) com título, foto, preço e dados estruturados para Google e prévia do WhatsApp. Ao mudar passeio no painel: `node scripts/atualizar-catalogo.mjs site-v2` e publicar
- [x] Panfleto e 6 posts da semana 1 do Instagram

Falta (depende do Pablo ou do Bruno):
- [ ] WhatsApp do site: hoje é o número de teste do Pablo (88 9374-2748); definir o oficial
- [ ] Link de pagamento de cartão (Asaas, InfinitePay ou Mercado Pago) em conta própria; hoje o Pix cai em chave de pessoa física
- [ ] Empresa (ME, CNAE 7911-2/00) e Cadastur da agência; número do Cadastur no rodapé
- [ ] Bruno: tarifas líquidas por escrito, regra de criança, horários de busca, fotos próprias, primeiras avaliações reais

## Domínio oficial

- Usar [maretur.com.br](https://maretur.com.br/) em respostas, materiais, campanhas, compartilhamentos e links de afiliados. Publicar no serviço que atende o domínio oficial e validar a versão por esse domínio.
- **Auditoria de 20/11/2026:** o domínio maretur.com.br está ligado ao serviço Render `passeios-fortaleza` (`srv-dbt7giu1egvs73fl2lqg`), não ao serviço `maretur`. **Não apagar `passeios-fortaleza`**: o site sairia do ar. Os dois serviços publicam o mesmo repositório; depois de cada publicação, disparar o deploy nos dois e conferir em https://maretur.com.br/.
- Desde 20/11/2026, quem abre `maretur.onrender.com` ou `passeios-fortaleza.onrender.com` é levado ao mesmo endereço em maretur.com.br (redirecionamento no `assets/ui.js` e em `creditos.html`).
- Para mover o domínio para o serviço `maretur` e depois desligar o antigo: painel do Render > maretur > Settings > Custom Domains (sem ferramenta de API disponível aqui).

## Reserva sob consulta e liberação por passeio

- O site mostra consulta de disponibilidade enquanto a oferta não estiver pronta para receber uma reserva. O contato leva data, viajantes e referência de origem ao WhatsApp.
- Aplicar `site-v2/supabase/migracao-vendas.sql` no projeto Supabase da Maré Tur após validar a migração em homologação. O script é incremental sobre `migracao-net.sql` e mantém as ofertas existentes em consulta.
  - 20/11/2026: ensaio completo (migração + `teste-vendas.sql`) rodado no banco real dentro de transação desfeita no fim: **todos os testes passaram, nada gravado**. **Aplicada em 20/11/2026** (sem DROP), junto com `correcao-auditoria-2026-11-20.sql` (net protegido, link do painel no domínio). Conferido: os 21 passeios seguem sob consulta.
- Para liberar uma oferta, conferir o net vigente com a operadora, selecionar a tarifa preferida, registrar os dias de saída e a capacidade no painel. Conferir o recebedor e o sinal percentual nas configurações. Usar os valores de Contatos Bruno com a operadora, a unidade e a vigência confirmadas.
- O recebimento e a vaga têm conferências separadas no painel. O provedor de pagamento e o WhatsApp oficial são dependências para automatizar conciliação e entrega de mensagens. O cartão passa pelo atendimento até haver um link autorizado.
- Testar a consulta e o checkout com dados sintéticos antes de habilitar a primeira oferta. Os materiais de consulta para Cumbuco ficam em `marketing/cumbuco-primeira-reserva/`.

## Ferramentas da TENKiTER candidatas a reaproveitamento (copiar o padrão)

- Portões de CI (verificação de HTML, padrões, versão de assets, segredos)
- Estrutura Worker + D1 e telemetria
- Fluxo de PR/CI/deploy e regras de regressão
- Ponte de agentes (`tenkiter-agentes`) com linhas `turismo-*`
- Postiz para agendar posts em redes sociais
