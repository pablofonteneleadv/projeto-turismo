-- Maré Tur · correções da auditoria de 20/11/2026 (sem DROP, DELETE ou TRUNCATE).
-- 1) tour_floor devolve net + custos; qualquer conta logada podia chamar e descobrir o net (segredo comercial).
--    O site e o painel não usam essa função diretamente; as funções internas continuam usando.
revoke execute on function public.tour_floor(text, text) from public, anon, authenticated;
-- 2) guard_tour_price é função de gatilho: não precisa ser chamável pela API.
revoke execute on function public.guard_tour_price() from public, anon, authenticated;
-- 3) Link do painel nos avisos de reserva aponta para o domínio oficial.
update public.biz_settings
   set data = jsonb_set(data, '{admin_url}', '"https://maretur.com.br/admin.html"'::jsonb)
 where id = 1;
-- Conferência: as duas primeiras colunas devem ser false e a terceira o endereço novo.
select has_function_privilege('authenticated', 'public.tour_floor(text,text)', 'execute') as tour_floor_aberto,
       has_function_privilege('anon', 'public.guard_tour_price()', 'execute') as guard_aberto,
       (select data->>'admin_url' from public.biz_settings where id = 1) as admin_url;
