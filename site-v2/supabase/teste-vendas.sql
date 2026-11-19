-- Rode em um banco de testes com schema.sql, migracao-net.sql e migracao-vendas.sql.
-- As tabelas de produção não são necessárias. Todas as alterações locais são revertidas.
begin;

create function pg_temp.assert_true(p_condition boolean, p_name text) returns void
language plpgsql as $$
begin
  if p_condition is distinct from true then
    raise exception 'Falhou: %', p_name;
  end if;
end $$;

create function pg_temp.assert_failure(p_sql text, p_expected text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like p_expected then return; end if;
    raise exception 'Esperado %, recebido %', p_expected, sqlerrm;
  end;
  raise exception 'Falhou: deveria rejeitar com %', p_expected;
end $$;

do $$
declare
  supplier bigint;
  test_date date := min_tour_date() + 5;
  request jsonb;
  quote jsonb;
  first_booking jsonb;
  second_booking jsonb;
  replay jsonb;
  booking_id bigint;
  second_id bigint;
  row bookings;
begin
  update biz_settings set data = data || '{"notify_topic":"","ad_cost_per_pax":5,"min_margin_per_pax":10,"card_fee_pct":5}'::jsonb
    where id = 1;
  insert into settings (id, data) values (1, '{"deposit_pct":20,"pix_key":"chave-teste","pix_name":"Recebedor Teste"}')
    on conflict (id) do update set data = settings.data || excluded.data;
  update settings set data = data - 'pix_payment_verified' where id = 1;
  insert into tours (slug, name, price_pix, price_card) values ('teste-vendas', 'Passeio de teste', 80, 84);
  insert into suppliers (name) values ('Operadora de teste de vendas') returning id into supplier;
  request := jsonb_build_object(
    'tour_slug', 'teste-vendas', 'tour_date', test_date, 'adults', 1, 'pay_method', 'pix',
    'customer_name', 'Cliente Teste Isolado', 'phone', '85999990000', 'request_id', gen_random_uuid(),
    'expected_total', 80, 'expected_deposit', 16,
    'attribution', jsonb_build_object('source', 'instagram', 'utm_medium', 'organico', 'campaign', 'teste', 'term', 'email@exemplo.invalid')
  );

  perform pg_temp.assert_true((select sales_mode = 'consultation' from tours where slug = 'teste-vendas'), 'nova oferta sob consulta');
  perform pg_temp.assert_failure(format('select quote_booking(%L)', request), 'Confirme a disponibilidade%');
  perform pg_temp.assert_failure(format('select create_booking(%L)', request), 'Confirme a disponibilidade%');

  update tours set sales_mode = 'booking', capacity_per_day = 2,
    departure_weekdays = array[extract(isodow from test_date)::smallint]
    where slug = 'teste-vendas';
  perform pg_temp.assert_failure(format('select quote_booking(%L)', request), 'Confirme a disponibilidade%');
  insert into tour_rates (tour_slug, supplier_id, net_adult, preferred) values ('teste-vendas', supplier, 30, true);
  perform pg_temp.assert_failure(format('select quote_booking(%L)', request), 'Confirme as opções de pagamento%');
  perform pg_temp.assert_failure(format('select create_booking(%L)', request), 'Confirme as opções de pagamento%');

  update settings set data = data || '{"pix_payment_verified":true}'::jsonb where id = 1;
  update suppliers set active = false where id = supplier;
  perform pg_temp.assert_failure(format('select quote_booking(%L)', request), 'Confirme a disponibilidade%');
  update suppliers set active = true where id = supplier;

  perform pg_temp.assert_true(seats_left('teste-vendas', test_date) = 2
    and seats_left('teste-vendas', test_date + 1) is null, 'vagas apenas em dias de saída');
  perform pg_temp.assert_failure(format('select quote_booking(%L)',
    request || jsonb_build_object('tour_date', test_date + 1)), 'Este passeio não tem saída%');
  perform pg_temp.assert_failure(format('select quote_booking(%L)',
    request || jsonb_build_object('tour_date', min_tour_date() - 1)), 'As saídas dessa data já fecharam%');

  quote := quote_booking(request);
  perform pg_temp.assert_true((quote->>'total')::numeric = 80 and (quote->>'deposit')::numeric = 16
    and (quote->>'collect_at_boarding')::numeric = 64, 'cálculo do sinal percentual e saldo');
  perform pg_temp.assert_true(not (quote ?| array['supplier_id','net_total','profit','card_fee','attribution']), 'cotação não expõe dados operacionais');
  perform pg_temp.assert_failure(format('select create_booking(%L)',
    request || '{"expected_total":79}'::jsonb), 'A cotação mudou%');
  perform pg_temp.assert_true(seats_left('teste-vendas', test_date) = 2, 'valor divergente não ocupa vaga');

  update settings set data = jsonb_set(data, '{deposit_pct}', '90'::jsonb) where id = 1;
  perform pg_temp.assert_failure(format('select quote_booking(%L)', request), 'Confirme as opções de pagamento%');
  update settings set data = jsonb_set(data, '{deposit_pct}', '20'::jsonb) where id = 1;

  insert into coupons (code, agent_name, discount_pct, commission_pct) values ('TESTE-VENDAS75', 'Teste', 75, 0);
  quote := quote_booking(request || '{"coupon":"TESTE-VENDAS75"}'::jsonb);
  perform pg_temp.assert_true((quote->>'total')::numeric = 45 and (quote->>'discount')::numeric = 35
    and (quote->>'floor_applied')::boolean, 'cupom limitado ao piso');

  first_booking := create_booking(request);
  booking_id := (first_booking->>'id')::bigint;
  select * into row from bookings where id = booking_id;
  perform pg_temp.assert_true((first_booking->>'payment_ready')::boolean and first_booking->>'status' = 'pendente'
    and first_booking->'pix_details' = '{"key":"chave-teste","name":"Recebedor Teste"}'::jsonb
    and (first_booking->>'reservation_expires_at')::timestamptz > clock_timestamp(), 'Pix verificado com retenção pendente');
  perform pg_temp.assert_true(row.net_total = 30 and row.supplier_settlement = 34 and row.profit = 45
    and row.attribution = '{"source":"instagram","medium":"organico","campaign":"teste"}'::jsonb,
    'cálculo operacional e atribuição filtrada');
  perform pg_temp.assert_true(not (first_booking ?| array['supplier_id','net_total','profit','attribution','customer_name','phone','booking_request_hash']),
    'resposta pública não expõe custos, dados pessoais ou atribuição');

  replay := create_booking(request);
  perform pg_temp.assert_true(replay->>'code' = first_booking->>'code' and replay->>'total' = first_booking->>'total'
    and seats_left('teste-vendas', test_date) = 1, 'reenvio devolve o mesmo pedido e não ocupa outra vaga');
  update settings set data = data || '{"pix_key":"chave-2","pix_payment_verified":false}'::jsonb where id = 1;
  replay := create_booking(request);
  perform pg_temp.assert_true(not (replay->>'payment_ready')::boolean and not (replay ? 'pix_details'), 'Pix não verificado não aparece no reenvio');
  update settings set data = data || '{"pix_payment_verified":true}'::jsonb where id = 1;
  replay := create_booking(request);
  perform pg_temp.assert_true(replay->'pix_details'->>'key' = 'chave-2', 'reenvio só oferece recebedor verificado atual');
  perform pg_temp.assert_failure(format('select create_booking(%L)',
    request || '{"adults":2}'::jsonb), 'Este pedido já foi utilizado%');

  request := request || jsonb_build_object('request_id', gen_random_uuid(), 'pay_method', 'card', 'expected_total', 84, 'expected_deposit', 84);
  second_booking := create_booking(request);
  second_id := (second_booking->>'id')::bigint;
  perform pg_temp.assert_true(not (second_booking->>'payment_ready')::boolean and not (second_booking ? 'pix_details')
    and (second_booking->>'deposit')::numeric = 84 and (second_booking->>'collect_at_boarding')::numeric = 0,
    'cartão passa pelo atendimento e não oferece Pix');
  perform pg_temp.assert_failure(format('select create_booking(%L)',
    request || jsonb_build_object('request_id', gen_random_uuid())), 'Restam 0 vagas%');

  update bookings set reservation_expires_at = now() - interval '1 minute' where id = second_id;
  perform pg_temp.assert_true(seats_left('teste-vendas', test_date) = 1, 'retenção expirada deixa de ocupar vaga');
  perform pg_temp.assert_failure(format('update bookings set status = %L where id = %s', 'pago', second_id),
    'A retenção expirou%');
  perform pg_temp.assert_true(not (create_booking(request)->>'payment_ready')::boolean, 'reenvio vencido não autoriza pagamento');

  perform pg_temp.assert_failure(format('update bookings set status = %L where id = %s', 'confirmado', booking_id),
    'Registre pagamento%');
  update bookings set status = 'pago' where id = booking_id;
  update bookings set status = 'confirmado' where id = booking_id;
  perform pg_temp.assert_failure(format('update bookings set status = %L where id = %s', 'realizado', booking_id),
    'Registre pagamento%');
  update bookings set boarded_at = now() where id = booking_id;
  perform pg_temp.assert_true((select status = 'confirmado' from bookings where id = booking_id), 'embarque não conclui passeio');
  update bookings set status = 'realizado' where id = booking_id;
  perform pg_temp.assert_true((select payment_verified_at is not null and confirmed_at is not null and completed_at is not null
    from bookings where id = booking_id), 'pagamento, confirmação e realização têm registros distintos');
  perform pg_temp.assert_true(not (create_booking(jsonb_set(
    request || '{"pay_method":"pix","expected_total":80,"expected_deposit":16}'::jsonb,
    '{request_id}', to_jsonb(row.booking_request_id)
  ))->>'payment_ready')::boolean, 'pedido concluído não volta a oferecer pagamento');

  perform pg_temp.assert_true(not has_function_privilege('anon', 'public._price_booking(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public._booking_free_seats(text,date,integer)', 'execute')
    and has_function_privilege('anon', 'public.create_booking(jsonb)', 'execute'),
    'só as RPCs públicas podem ser chamadas diretamente');
end $$;

rollback;
select 'TESTES_VENDAS_OK' as resultado;
