# Decisões e pendências

## Decidido (15/11/2026)

- Projeto independente da TENKiTER Modas, em pasta e repositório próprios (`Documents\Turismo`, fora de `Documents\Codex`), para que agentes não confundam contexto, memória ou credenciais.
- Prefixos: variáveis `TURISMO_*`, recursos em nuvem `turismo-*`, linhas de trabalho `turismo-*`.
- Nome definido em 16/11/2026: **Maré Tur** (site futuro maretur.com.br). Telefone do guia Bruno: (85) 99768-7598.

## Situação em 16/11/2026 (plano de 4 semanas do relatório `reports/Venda de passeios em Fortaleza.md`)

Meta da semana 3 (30/11 a 6/12): **primeira venda paga online com cupom**.

Feito:
- [x] Nome e marca: **Maré Tur**; nicho: passeios saindo de Fortaleza com busca no hotel; receita: margem sobre a tarifa do fornecedor + cupom de agente
- [x] Stack: site estático no Render (maretur.onrender.com) + Supabase `turismo-passeios`; repositórios `projeto-turismo` (privado) e `passeios-fortaleza` (site)
- [x] Site vendendo: 21 passeios com preços da Enseada, sinal de 20% no Pix, reserva registrada no banco e enviada no WhatsApp, painel `/admin.html`, cupom BRUNO (5%) ativo
- [x] Revisão de 22 pontos aplicada (avaliações só reais, Cadastur, textos, celular, fotos leves)
- [x] Uma página por passeio (`passeio-<slug>.html`) com título, foto, preço e dados estruturados para Google e prévia do WhatsApp. Ao mudar passeio no painel: `node scripts/atualizar-catalogo.mjs site-v2` e publicar
- [x] Panfleto e 6 posts da semana 1 do Instagram

Falta (depende do Pablo ou do Bruno):
- [ ] Domínio maretur.com.br (registro.br, ~R$ 40/ano, no CPF/CNPJ do Pablo); depois trocar `BASE` no script e ligar no Render
- [ ] WhatsApp do site: hoje é o número de teste do Pablo (88 9374-2748); definir o oficial
- [ ] Link de pagamento de cartão (Asaas, InfinitePay ou Mercado Pago) em conta própria; hoje o Pix cai em chave de pessoa física
- [ ] Empresa (ME, CNAE 7911-2/00) e Cadastur da agência; número do Cadastur no rodapé
- [ ] Bruno: tarifas líquidas por escrito, regra de criança, horários de busca, fotos próprias, primeiras avaliações reais
- [ ] Apagar o serviço antigo `passeios-fortaleza.onrender.com` (marca de terceiros) no painel do Render

## Ferramentas da TENKiTER candidatas a reaproveitamento (copiar o padrão)

- Portões de CI (verificação de HTML, padrões, versão de assets, segredos)
- Estrutura Worker + D1 e telemetria
- Fluxo de PR/CI/deploy e regras de regressão
- Ponte de agentes (`tenkiter-agentes`) com linhas `turismo-*`
- Postiz para agendar posts em redes sociais
