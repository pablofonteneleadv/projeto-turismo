# Projeto Turismo (nome provisório)

Projeto **novo e independente**, na área de turismo, em estágio de montagem.
**Não é a TENKiTER Modas.** Nada daqui pertence ao catálogo, ao Cofre, à Esteira, ao RH ou aos anúncios da TENKiTER.

## Regras de separação (valem para Claude, Codex e qualquer agente)

1. **Pasta e repositório próprios.** Trabalhe só em `C:\Users\User\Documents\Turismo` (fora de `Documents\Codex`). Nunca edite, faça commit ou push em `tenkiter-catalogo`, `Tenkiter-cofre` ou nos worktrees `wt-*`.
2. **Skills `tenkiter-*` não se aplicam aqui** (estética, memória-contexto, apis-e-acessos, whatsapp, .gs versionado, anúncios). Podem servir de *referência* de como algo foi feito, mas a decisão, a marca e as credenciais deste projeto são outras.
3. **Credenciais separadas.** Variáveis de ambiente deste projeto começam com `TURISMO_` (ver `.env.example`). Nunca use `TENKITER_GITHUB_TOKEN` nem chaves, IDs, contas, Workers, bancos ou números de WhatsApp da TENKiTER. Segredo nunca em arquivo, repositório ou memória.
4. **Recursos em nuvem com prefixo `turismo-`** (Render, Cloudflare, Supabase, Google, Meta etc.), criados em projetos/contas separados quando o serviço permitir. Nada de reaproveitar banco, bucket, Worker ou planilha da TENKiTER.
5. **Ponte `tenkiter-agentes`:** linhas de trabalho (`thread_save`) sempre com nome iniciando em `turismo-`. Use `delegate_nvidia` só no modo `ask` (o modo `work` grava no ambiente da TENKiTER). Para volume, prefira subagentes econômicos (haiku/sonnet) trabalhando nesta pasta.
6. **Reaproveitar ferramentas = copiar o padrão, não o vínculo.** Ao trazer algo da TENKiTER (scripts, testes, CI, telas), copie para cá, troque nomes/marca/IDs e registre a origem em `docs/decisoes.md`.
7. Em dúvida se algo é TENKiTER ou Turismo: **pare e confirme** antes de agir.

## Como o dono trabalha

Pablo trabalha pelo celular, sem teclado/mouse no computador: resolva acessos sozinho, não peça passos manuais, respostas curtas com o resultado primeiro.

## Custo zero primeiro

Começar de graça ou quase: planos grátis (Cloudflare, etc.), código aberto maduro e comprovado, canais orgânicos e comissão só sobre venda. Gasto pago só na fase de escala, quando houver receita, e com o gatilho que o justifica.

## Estado atual

Montagem. Nome, público, modelo de negócio e stack ainda não definidos — ver `docs/decisoes.md`.
