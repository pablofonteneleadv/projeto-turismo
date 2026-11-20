# Auditoria do site Maré Tur — 20/11/2026

## Resumo

O site **maretur.com.br está no ar e funcionando**: 25 páginas abrem, nenhum link ou foto quebrado, e todo endereço público (canonical, sitemap, prévia do WhatsApp, Google) aponta para maretur.com.br. O teste do painel e o de consulta passaram por inteiro.

Achei **um risco grave**, que já está registrado: o domínio maretur.com.br está ligado ao serviço antigo **passeios-fortaleza** do Render, justamente o que estava anotado para ser apagado. Se fosse apagado, o site sairia do ar.

Ficaram **3 coisas paradas**, porque o modo automático de segurança do Claude Code barrou ações no Render e no banco (veja "O que falta").

## O que mudou ou foi corrigido

| O quê | Antes | Agora |
|---|---|---|
| Cópia do projeto no computador | 10 mudanças do Codex (19/11) faltando | Igual ao GitHub |
| Endereços antigos do Render | maretur.onrender.com e passeios-fortaleza.onrender.com mostravam o site inteiro (o serviço "maretur" estava 3 versões atrás) | Levam ao mesmo endereço em maretur.com.br (vale depois da próxima publicação no Render) |
| Página de créditos das fotos | Topo com a marca antiga "Passeios Fortaleza" | Marca Maré Tur |
| Teste de consulta | Falhava às vezes: conferia a página do passeio antes de ela abrir | Espera a página trocar; passa sempre |
| Migração de vendas (reserva online com vaga e prazo) | Escrita pelo Codex e nunca testada no banco | Ensaiada no banco real com tudo desfeito no fim: **todos os testes passaram, nada gravado**. Versão sem comandos DROP salva no repositório |
| Skill do projeto no Codex | `operar-mare-tur` só no GitHub | Instalada no Codex para qualquer pasta (cópia idêntica) |
| Registro de decisões | Mandava apagar o serviço que segura o domínio | Diz para **não apagar** e explica como mover o domínio |

Publicado no GitHub: `passeios-fortaleza` (4a192c3) e `projeto-turismo` (58f6550 e o commit deste relatório).

## O que foi testado e como

- **Varredura do site no ar**: um script abriu as 22 páginas do sitemap, mais o painel, os créditos e a página genérica. Conferiu se cada página, imagem e arquivo responde e se o canonical, o og:url e os dados para o Google batem com maretur.com.br. Resultado: nenhum problema.
- **Redirecionamentos**: http → https, www → sem www e página inexistente → 404 funcionam.
- **Celular (Chrome, 390×844)**: a vitrine mostra 21 passeios, o botão "+ Pacote" funciona e o clique no Cumbuco leva a campanha (UTM) até a página do passeio. Sem erro de JavaScript, no site no ar e na cópia local.
- **Teste de consulta** (dados simulados, nada no banco real): 8 cenários OK, entre eles o pacote no Android em PT/ES, a consulta com origem até o WhatsApp, o espanhol, o catálogo vazio, a reserva simulada com protocolo e as 21 páginas no celular.
- **Teste do painel** (dados simulados): 87 checagens, 0 falhas.
- **Banco (Supabase)**: 12 tabelas, todas com proteção por linha ligada. 21 passeios no ar e 1 cupom (BRUNO, 5% de desconto, 8% de comissão).

## O que falta e por quê

1. **Publicar no Render.** O código novo está no GitHub, mas o Render não publica sozinho, e o deploy pela ferramenta foi barrado pelo modo automático. Basta disparar o deploy nos serviços **passeios-fortaleza** (é ele que atende maretur.com.br) e **maretur**. O site atual segue normal enquanto isso.
2. **Aplicar a migração de vendas.** Já foi ensaiada e passou. A aplicação definitiva foi barrada pelo modo automático. Sem ela, nada quebra: todo passeio continua "sob consulta" pelo WhatsApp. Ela é necessária para ligar a reserva online com vaga e prazo de pagamento.
3. **Fechar um vazamento do net.** A função do banco `tour_floor` devolve "net + R$ 15" para **qualquer pessoa que crie conta** no site, já que o cadastro está aberto. O site não usa essa função. A correção está pronta em `site-v2/supabase/correcao-auditoria-2026-11-20.sql`. Ela também troca o link do painel nos avisos de reserva, que ainda aponta para maretur.onrender.com. Foi barrada pelo mesmo motivo.

**Como liberar os 3 itens:** autorize no Claude Code as ferramentas *Render trigger_deploy*, *Supabase apply_migration* e *Supabase execute_sql* para o turismo, ou peça ao Codex para rodar os dois arquivos SQL e disparar os deploys.

## Pendências do negócio (não são do site)

- **12 dos 21 passeios no ar ainda não têm net cadastrado.** Sem o net, o sistema não consegue garantir que o sinal não passe da margem.
- O Pix ainda cai na chave de pessoa física. O WhatsApp do site ainda é o número de teste do Pablo.
- O título da página inicial cita **Canoa Quebrada**, mas esse passeio está oculto. Vale trocar no painel (Configurações) por um destino que está à venda.
- Proteção contra senhas vazadas desligada no Supabase (Auth > Senhas). É um ajuste de um clique.
- Para desligar o serviço antigo do Render no futuro: primeiro mover o domínio para o serviço "maretur" (Render > maretur > Settings > Custom Domains). Só depois apagar o antigo.

## Links para conferir

- Site: https://maretur.com.br/
- Um passeio: https://maretur.com.br/passeio-cumbuco.html
- Painel: https://maretur.com.br/admin.html
- Créditos das fotos: https://maretur.com.br/creditos.html (a marca nova aparece depois da publicação no Render)
- Sitemap: https://maretur.com.br/sitemap.xml
- Endereço antigo (deve levar a maretur.com.br depois da publicação): https://maretur.onrender.com/
