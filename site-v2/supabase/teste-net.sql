-- Testes do net e do preço mínimo. Roda tudo e desfaz no fim (exceção final = rollback).
-- Resultado esperado: erro "TESTES_OK n" (n = número de verificações).
do $$
declare sid bigint; q jsonb; d date := min_tour_date() + 5; n int := 0; ok boolean; msg text; bk bookings;
begin
  insert into suppliers (name, whatsapp) values ('Empresa Teste', '5585999999999') returning id into sid;
  insert into tour_rates (tour_slug, supplier_id, net_adult, preferred) values ('cumbuco', sid, 30, true);
  insert into tour_rates (tour_slug, supplier_id, net_adult, preferred) values ('jeri-economy', sid, 220, true);
  insert into coupons (code, agent_name, discount_pct, commission_pct) values ('TESTE50', 'Teste', 50, 0);

  -- 1. Venda normal no Pix
  q := create_booking(jsonb_build_object('tour_slug','cumbuco','tour_date',d,'adults',2,'pay_method','pix','customer_name','Teste Automatico','phone','85999990000'));
  select * into bk from bookings where id = (q->>'id')::bigint;
  if (q->>'total')::numeric <> 160 or (q->>'deposit')::numeric <> 32 or bk.net_total <> 60 or bk.ad_cost <> 10 or bk.profit <> 90 or bk.partner_share <> 45 or bk.supplier_settlement <> 68 or bk.supplier_id <> sid or bk.code !~ '^MT-\d+$'
    then raise exception 'FALHA 1: %', row_to_json(bk); end if; n := n + 1;
  if q ? 'net_total' or q ? 'profit' or q ? 'supplier_id' then raise exception 'FALHA 1b: net vazou para o público %', q; end if; n := n + 1;

  -- 2. Cupom grande no Pix: trava no mínimo
  q := quote_booking(jsonb_build_object('tour_slug','cumbuco','tour_date',d,'adults',2,'pay_method','pix','coupon','teste50'));
  if (q->>'total')::numeric <> 90 or not (q->>'floor_applied')::boolean or (q->>'discount')::numeric <> 70 then raise exception 'FALHA 2: %', q; end if; n := n + 1;

  -- 3. Cupom grande no cartão: mínimo inclui a taxa do cartão; pago todo antes, Maré Tur paga o net à empresa
  q := _price_booking(jsonb_build_object('tour_slug','cumbuco','tour_date',d,'adults',2,'pay_method','card','coupon','TESTE50'));
  if (q->>'total')::numeric <> 95 or (q->>'deposit')::numeric <> 95 or (q->>'collect_at_boarding')::numeric <> 0 or (q->>'supplier_settlement')::numeric <> -60 then raise exception 'FALHA 3: %', q; end if; n := n + 1;

  -- 4. Sinal nunca passa da margem (Jeri 250, net 220: sinal 30, não 50)
  q := _price_booking(jsonb_build_object('tour_slug','jeri-economy','tour_date',d,'adults',1,'pay_method','pix'));
  if (q->>'deposit')::numeric <> 30 or (q->>'supplier_settlement')::numeric <> 0 then raise exception 'FALHA 4: %', q; end if; n := n + 1;

  -- 5. Trava de preço do passeio abaixo do mínimo
  ok := false; begin update tours set price_pix = 40 where slug = 'cumbuco'; exception when others then ok := true; end;
  if not ok then raise exception 'FALHA 5: aceitou preço abaixo do mínimo'; end if; n := n + 1;

  -- 6. Trava de net que deixaria o preço abaixo do mínimo
  ok := false; begin update tour_rates set net_adult = 79 where tour_slug = 'cumbuco' and supplier_id = sid; exception when others then ok := true; end;
  if not ok then raise exception 'FALHA 6: aceitou net acima do preço'; end if; n := n + 1;

  -- 7. Vagas por dia
  update tours set capacity_per_day = 3 where slug = 'cumbuco';
  if seats_left('cumbuco', d) <> 1 then raise exception 'FALHA 7a: vagas %', seats_left('cumbuco', d); end if;
  ok := false; begin perform quote_booking(jsonb_build_object('tour_slug','cumbuco','tour_date',d,'adults',2)); exception when others then ok := true; msg := sqlerrm; end;
  if not ok or msg not like 'Restam 1 vagas%' then raise exception 'FALHA 7b: %', msg; end if; n := n + 1;

  -- 8. Data já fechada
  ok := false; begin perform quote_booking(jsonb_build_object('tour_slug','cumbuco','tour_date',current_date,'adults',1)); exception when others then ok := true; end;
  if not ok then raise exception 'FALHA 8: aceitou data fechada'; end if; n := n + 1;

  -- 9. Troca de empresa recalcula o acerto
  insert into suppliers (name) values ('Empresa Teste 2') returning id into sid;
  insert into tour_rates (tour_slug, supplier_id, net_adult) values ('cumbuco', sid, 25);
  update tours set capacity_per_day = null where slug = 'cumbuco';
  perform set_config('request.jwt.claims', json_build_object('email', (select email from admin_emails limit 1))::text, true);
  perform assign_supplier(bk.id, sid);
  select * into bk from bookings where id = bk.id;
  if bk.net_total <> 50 or bk.supplier_settlement <> 78 or bk.profit <> 100 or bk.partner_share <> 50 then raise exception 'FALHA 9: %', row_to_json(bk); end if;
  perform set_config('request.jwt.claims', '', true);
  n := n + 1;

  -- 10. Público não grava reserva direto nem lê o net
  set local role anon;
  ok := false; begin insert into bookings (customer_name, phone, total) values ('X Hacker', '85999990000', 1); exception when others then ok := true; end;
  if not ok then raise exception 'FALHA 10a: público gravou reserva direto'; end if;
  if (select count(*) from tour_rates) <> 0 or (select count(*) from suppliers) <> 0 or (select count(*) from biz_settings) <> 0 then raise exception 'FALHA 10b: público leu net'; end if;
  ok := false; begin perform _price_booking('{}'::jsonb); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA 10c: público chamou cálculo interno'; end if;
  q := quote_booking(jsonb_build_object('tour_slug','cumbuco','tour_date',d,'adults',1));
  if q ? 'net_total' then raise exception 'FALHA 10d'; end if;
  reset role; n := n + 3;

  raise exception 'TESTES_OK %', n;
end $$;
