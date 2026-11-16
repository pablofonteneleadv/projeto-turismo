# Decisões e pendências

## Decidido (15/11/2026)

- Projeto independente da TENKiTER Modas, em pasta e repositório próprios (`Documents\Turismo`, fora de `Documents\Codex`), para que agentes não confundam contexto, memória ou credenciais.
- Prefixos: variáveis `TURISMO_*`, recursos em nuvem `turismo-*`, linhas de trabalho `turismo-*`.
- Nome do projeto: provisório ("Projeto Turismo"). Ao definir, renomear pasta, repositório e prefixos de uma vez.

## A definir

- [ ] Nome e marca
- [ ] Nicho (agência, roteiros, passeios locais, hospedagem, marketplace de guias…)
- [ ] Público e região
- [ ] Modelo de receita (comissão, pacote próprio, assinatura, anúncio)
- [ ] Stack (aproveitar o que já dominamos: site estático + Cloudflare Workers + D1/Supabase, Render)
- [ ] Repositório privado no GitHub (`projeto-turismo`): o conector do GitHub deu 403 ao criar; o token da TENKiTER é restrito ao catálogo
- [ ] Contas próprias: domínio, e-mail, Instagram/Meta, WhatsApp, GitHub

## Ferramentas da TENKiTER candidatas a reaproveitamento (copiar o padrão)

- Portões de CI (verificação de HTML, padrões, versão de assets, segredos)
- Estrutura Worker + D1 e telemetria
- Fluxo de PR/CI/deploy e regras de regressão
- Ponte de agentes (`tenkiter-agentes`) com linhas `turismo-*`
- Postiz para agendar posts em redes sociais
