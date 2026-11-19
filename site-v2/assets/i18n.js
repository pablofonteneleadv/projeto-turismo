/* Idioma do site: português (padrão) e espanhol rioplatense para turistas argentinos.
   - Escolha: ?lang=es|pt na URL, ou localStorage "site-lang". Sem escolha, abre em espanhol se o navegador for "es*".
   - t("chave", a, b): texto fixo dos scripts ({0}, {1} são trocados pelos argumentos).
   - tx("texto em português"): texto que vem do banco (configurações, perguntas frequentes); sem tradução, devolve o original.
   - tr(passeio, "campo"): campo do passeio em espanhol (passeio.i18n.es.campo) se existir, senão o português.
   - O HTML fixo é traduzido por texto (tabela STATIC) ao carregar; use data-i18n="chave" quando o texto tiver partes soltas.
   Carregar antes de ui.js. Páginas internas (admin) usam <html data-no-i18n> e ficam sempre em português. */
(function () {
  var doc = document.documentElement, off = doc.hasAttribute("data-no-i18n");
  var lang = "pt";
  if (!off) {
    var q = "";
    try { q = new URLSearchParams(location.search).get("lang") || ""; } catch (e) {}
    q = q.toLowerCase().slice(0, 2);
    var saved = "";
    try { saved = localStorage.getItem("site-lang") || ""; } catch (e) {}
    if (q === "es" || q === "pt") { lang = q; try { localStorage.setItem("site-lang", q); } catch (e) {} }
    else if (saved === "es" || saved === "pt") lang = saved;
    else if (String(navigator.language || "").toLowerCase().indexOf("es") === 0) lang = "es";
  }
  var ES = lang === "es";
  doc.lang = ES ? "es" : "pt-BR";

  /* ---------- Textos fixos dos scripts: chave -> [português, espanhol] ---------- */
  var K = {
    // gerais
    "brand.sub": ["Passeios em Fortaleza", "Paseos en Fortaleza"],
    "wa.hello": ["Olá! Quero saber sobre os passeios.", "¡Hola! Quiero saber sobre los paseos."],
    "wa.missing": ["O WhatsApp de atendimento ainda não foi cadastrado no painel.", "El WhatsApp de atención todavía no está cargado."],
    "photo.n": ["{0} – foto {1}", "{0} – foto {1}"],
    "rating.google": ["{0} avaliações no Google", "{0} reseñas en Google"],
    "rating.clients": ["{0} avaliações de clientes", "{0} reseñas de clientes"],
    "stars.label": ["{0} de 5 estrelas", "{0} de 5 estrellas"],
    "review.one": ["avaliação", "reseña"], "review.many": ["avaliações", "reseñas"],
    "credit.fix": ["Domínio público", "Dominio público"],
    "toast.demo": ["(modo de demonstração, sem banco ligado)", "(modo demostración, sin base de datos conectada)"],
    // categorias
    "cat.todos": ["Todos", "Todos"], "cat.passeios": ["Passeios", "Paseos"], "cat.pacotes": ["Pacotes", "Paquetes"],
    "cat.privativos": ["Privativos", "Privados"], "cat.transfers": ["Transfers", "Traslados"], "cat.nautico": ["Náutico", "Náutico"],
    // home
    "home.title": ["Maré Tur · Passeios em Fortaleza com busca no hotel", "Maré Tur · Paseos en Fortaleza con búsqueda en el hotel"],
    "home.desc": ["Passeios saindo de Fortaleza com busca no hotel: Jericoacoara, Cumbuco, Canoa Quebrada, Lagoinha, 3 Praias e transfers. Guia cadastrado no Cadastur, reserve com 20% de sinal e pague o resto no embarque.",
                  "Paseos saliendo de Fortaleza con búsqueda en tu hotel: Jericoacoara, Cumbuco, Canoa Quebrada, Lagoinha, 3 Playas y traslados. Guía habilitado en Cadastur, reservá con una seña del 20% y pagá el resto al embarcar."],
    "home.hero_alt": ["Praia de Iracema e Beira Mar de Fortaleza", "Playa de Iracema y Beira Mar de Fortaleza"],
    "home.hero_credit": ["Foto: MTur Destinos · Domínio público", "Foto: MTur Destinos · Dominio público"],
    "home.rating_sum": ["Nota média {0} de 5, de quem já viajou com a gente.", "Nota promedio {0} de 5, de quienes ya viajaron con nosotros."],
    "home.rating_sum_few": ["De quem já viajou com a gente.", "De quienes ya viajaron con nosotros."],
    "home.coupon": ["Cupom {0} ativo: {1}% de desconto, indicação de {2}.", "Cupón {0} activo: {1}% de descuento, recomendación de {2}."],
    "home.empty_cat": ["Nenhum passeio nesta categoria ainda.", "Todavía no hay paseos en esta categoría."],
    "home.your_tour": ["Seu passeio", "Tu paseo"], "home.pick_day": ["Escolha seu dia de praia", "Elegí tu día de playa"],
    "card.door": ["Porta a porta", "Puerta a puerta"], "card.pickup": ["Busca no hotel", "Te buscamos en el hotel"], "card.featured": ["Destaque", "Destacado"],
    "card.save": ["Salvar {0}", "Guardar {0}"],
    "card.from_vehicle": ["A partir de · por veículo", "Desde · por vehículo"], "card.from_person": ["A partir de · por pessoa", "Desde · por persona"],
    "card.pix": ["{0} no Pix", "{0} en Pix"], "card.view": ["Ver passeio", "Ver paseo"],
    "card.in_pack": ["✓ No pacote", "✓ En el paquete"], "card.add_pack": ["+ Pacote", "+ Paquete"],
    "fav.on": ["Salvo neste aparelho.", "Guardado en este dispositivo."], "fav.off": ["Removido dos salvos.", "Quitado de guardados."],
    "pack.one": ["{0} passeio no pacote · por pessoa no Pix", "{0} paseo en el paquete · por persona en Pix"],
    "pack.many": ["{0} passeios no pacote · por pessoa no Pix", "{0} paseos en el paquete · por persona en Pix"],
    "pack.save": ["{0}% de desconto de pacote", "{0}% de descuento por paquete"],
    "pack.save_cup": [" + {0}% do cupom {1}", " + {0}% del cupón {1}"],
    "pack.add_more": ["Adicione mais 1 para ganhar {0}%", "Sumá 1 más y ganás {0}%"],
    "pack.wa": ["Olá! Quero reservar um pacote: {0}{1}.", "¡Hola! Quiero reservar un paquete: {0}{1}."],
    "pack.wa_coupon": [". Cupom {0}", ". Cupón {0}"],
    "pack.hint": ["Toque em “+ Pacote” nos passeios que quiser.", "Tocá “+ Paquete” en los paseos que quieras."],
    "form.phone_bad": ["Digite o WhatsApp com DDD.", "Escribí tu WhatsApp con código de área (con el 55 de Brasil si es de allá, o tu código internacional)."],
    "form.news_fail": ["Não deu para salvar agora. Tente de novo em instantes.", "No pudimos guardarlo ahora. Probá de nuevo en unos instantes."],
    "form.news_ok": ["Pronto! Você vai receber as promoções no WhatsApp.", "¡Listo! Vas a recibir las promociones por WhatsApp."],
    "form.partner_bad": ["Preencha nome e WhatsApp com DDD.", "Completá tu nombre y tu WhatsApp con código de área."],
    "form.partner_fail": ["Não deu para enviar agora. Tente de novo em instantes.", "No pudimos enviarlo ahora. Probá de nuevo en unos instantes."],
    "form.partner_ok": ["Recebemos! Vamos te chamar no WhatsApp com o seu cupom.", "¡Recibido! Te escribimos por WhatsApp con tu cupón."],
    // passeio
    "tour.not_found": ["Passeio não encontrado.", "Paseo no encontrado."], "tour.see_all": ["Ver todos os passeios", "Ver todos los paseos"],
    "tour.title": ["{0} saindo de Fortaleza | {1}", "{0} saliendo de Fortaleza | {1}"],
    "tour.meta": [" Confira o que está incluso e consulte datas e condições de embarque.", " Mirá qué incluye y consultá las fechas y las condiciones de embarque."],
    "tour.wa_doubt": ["Olá! Tenho uma dúvida sobre o passeio {0}.", "¡Hola! Tengo una duda sobre el paseo {0}."],
    "tour.crumbs": ["Caminho", "Ruta de navegación"], "tour.home": ["Início", "Inicio"], "tour.tours": ["Passeios", "Paseos"],
    "tour.rev_one": ["avaliação", "reseña"], "tour.rev_many": ["avaliações", "reseñas"],
    "tour.share": ["Compartilhar", "Compartir"], "tour.save": ["♡ Salvar", "♡ Guardar"], "tour.saved": ["♥ Salvo", "♥ Guardado"],
    "tour.photos": ["Fotos", "Fotos"], "tour.summary": ["Resumo", "Resumen"],
    "tour.duration": ["Duração", "Duración"], "tour.times": ["Horários", "Horarios"], "tour.pickup": ["Busca", "Búsqueda"], "tour.confirm": ["Confirmação", "Confirmación"],
    "tour.pickup_wa": ["Combinada no WhatsApp", "A coordinar por WhatsApp"], "tour.pickup_door": ["Porta a porta", "Puerta a puerta"], "tour.pickup_hotel": ["No seu hotel", "En tu hotel"],
    "tour.confirm_wa": ["No WhatsApp", "Por WhatsApp"],
    "tour.about": ["Sobre o passeio", "Sobre el paseo"], "tour.route": ["Roteiro previsto", "Itinerario previsto"],
    "tour.inc_title": ["O que está incluso e o que é à parte", "Qué incluye y qué se paga aparte"],
    "tour.included": ["Incluso", "Incluido"], "tour.aside": ["À parte", "Aparte"],
    "tour.nothing_aside": ["Nada à parte além da alimentação.", "Nada aparte, salvo la comida."],
    "tour.inc_note": ["Opcionais e taxas são pagos no local. Quer saber o valor do dia antes de reservar? Pergunte no WhatsApp.", "Los opcionales y las tasas se pagan en el lugar. ¿Querés saber el valor del día antes de reservar? Preguntanos por WhatsApp."],
    "tour.bring_h": ["Leve com você", "Llevá con vos"],
    "tour.bring1": ["Protetor solar, chapéu e óculos de sol", "Protector solar, gorro y anteojos de sol"],
    "tour.bring2": ["Roupa de banho e toalha", "Malla y toalla"],
    "tour.bring3": ["Dinheiro ou cartão para alimentação e opcionais", "Efectivo (reales) o tarjeta para la comida y los opcionales"],
    "tour.bring4": ["Documento com foto", "Documento con foto (DNI o pasaporte)"],
    "tour.bring_note": ["Alimentação e passeios opcionais não estão inclusos, salvo quando aparecem na lista de incluso.", "La comida y los paseos opcionales no están incluidos, salvo cuando aparecen en la lista de lo incluido."],
    "tour.day_h": ["Como é o dia", "Cómo es el día"],
    "tour.day1": ["Busca no seu hotel pela manhã. O horário exato chega no WhatsApp na véspera.", "Te buscamos en tu hotel por la mañana. El horario exacto te llega por WhatsApp el día anterior."],
    "tour.day2": ["Viagem com guia cadastrado no Cadastur, contando a história de cada lugar.", "Viaje con guía habilitado en Cadastur, que te cuenta la historia de cada lugar."],
    "tour.day3": ["Tempo livre na praia, com ponto de apoio para o almoço quando indicado.", "Tiempo libre en la playa, con punto de apoyo para el almuerzo cuando está indicado."],
    "tour.day4": ["Volta ao hotel no fim do dia.", "Regreso al hotel al final del día."],
    "tour.pay_h": ["Como pagar", "Cómo pagar"], "tour.pill": ["Mais fácil", "Lo más fácil"],
    "tour.pay1_h": ["Sinal de {0}% no Pix", "Seña del {0}% por Pix"],
    "tour.pay1_p": ["Garanta a vaga pagando {0}% agora. O restante é pago no embarque, ao guia, em dinheiro, Pix ou cartão.", "Asegurá tu lugar pagando el {0}% ahora. El resto se paga al embarcar, al guía, en efectivo, Pix o tarjeta."],
    "tour.pay2_h": ["Tudo de uma vez", "Todo de una vez"],
    "tour.pay2_p": ["Pague o total no Pix ou no cartão em até 4x. O link do cartão chega no seu WhatsApp.", "Pagá el total por Pix o con tarjeta en hasta 4 cuotas. El link de pago te llega por WhatsApp."],
    "tour.pay_reais": ["Pagás en reales (R$): aceptamos Pix, tarjeta o efectivo.", "Pagás en reales (R$): aceptamos Pix, tarjeta o efectivo."],
    "tour.cancel_h": ["Política de cancelamento", "Política de cancelación"],
    "tour.reviews_h": ["O que os clientes dizem", "Lo que dicen los clientes"], "tour.faq_h": ["Perguntas frequentes", "Preguntas frecuentes"],
    "tour.more_h": ["Monte seu roteiro", "Armá tu itinerario"], "tour.from": ["a partir de {0}", "desde {0}"],
    "tour.from_unit_v": ["Por veículo", "Por vehículo"], "tour.from_unit_p": ["Por pessoa a partir de", "Por persona desde"],
    "tour.pix_card": ["no Pix · {0} em até 4x", "en Pix · {0} en hasta 4 cuotas"],
    "tour.buggy_label": ["<b>Garantir o buggy</b> · {0} por carro, até 4 pessoas.", "<b>Asegurar el buggy</b> · {0} por auto, hasta 4 personas."],
    "tour.cutoff": ["Saídas de amanhã: reservas até as {0}h de hoje (horário de Fortaleza), para a empresa organizar a busca.", "Salidas de mañana: reservas hasta las {0} h de hoy (hora de Fortaleza), para que la empresa organice la búsqueda."],
    "tour.min_adult": ["A reserva precisa de pelo menos 1 adulto ou idoso.", "La reserva necesita al menos 1 adulto o adulto mayor."],
    "tour.coupon_ok": ["Cupom aplicado: {0}% de desconto.", "Cupón aplicado: {0}% de descuento."],
    "tour.coupon_bad": ["Cupom não encontrado. Confira com quem te indicou.", "Cupón no encontrado. Confirmalo con quien te lo pasó."],
    "tour.coupon_msg": ["✓ {0}% de desconto · indicação de {1}", "✓ {0}% de descuento · recomendación de {1}"],
    "tour.priv_label": ["Veículo só para o seu grupo", "Vehículo solo para tu grupo"],
    "tour.person": ["pessoa", "persona"], "tour.people": ["pessoas", "personas"],
    "tour.coupon_row": ["Cupom {0}", "Cupón {0}"], "tour.coupon_max": [" (desconto máximo)", " (descuento máximo)"],
    "tour.buggy_row": ["Buggy · {0} {1}", "Buggy · {0} {1}"], "tour.car": ["carro", "auto"], "tour.cars": ["carros", "autos"],
    "tour.total_pix": ["Total no Pix", "Total en Pix"], "tour.total_card": ["Total no cartão", "Total con tarjeta"],
    "tour.card_4x": ["em até 4x de", "hasta 4 cuotas de"],
    "tour.deposit_now": ["Sinal agora", "Seña ahora"], "tour.at_boarding": ["No embarque", "Al embarcar"],
    "tour.seats_one": ["Resta 1 vaga nesta data.", "Queda 1 lugar en esta fecha."], "tour.seats_many": ["Restam {0} vagas nesta data.", "Quedan {0} lugares en esta fecha."],
    "tour.summary_line": ["{0} · {1} · {2} no Pix", "{0} · {1} · {2} en Pix"], "tour.summary_line_card": ["{0} · {1} · {2} no cartão", "{0} · {1} · {2} con tarjeta"],
    "tour.sending": ["Enviando…", "Enviando…"], "tour.send": ["Enviar pedido de reserva", "Enviar solicitud de reserva"],
    "tour.err_book": ["Não deu para registrar agora. Tente de novo ou chame no WhatsApp.", "No pudimos registrarlo ahora. Probá de nuevo o escribinos por WhatsApp."],
    "tour.wa_booked": ["Olá! Acabei de reservar pelo site{0}:", "¡Hola! Acabo de reservar por el sitio{0}:"],
    "tour.wa_priv": ["Privativo", "Privado"], "tour.wa_group": ["Em grupo", "En grupo"],
    "tour.wa_pax": ["{0} adulto(s), {1} criança(s), {2} idoso(s)", "{0} adulto(s), {1} niño(s), {2} adulto(s) mayor(es)"],
    "tour.wa_buggy": ["Buggy: {0} carro(s)", "Buggy: {0} auto(s)"], "tour.wa_coupon": ["Cupom: {0}", "Cupón: {0}"],
    "tour.wa_total": ["Total: {0}{1}", "Total: {0}{1}"], "tour.wa_pix": [" no Pix", " en Pix"], "tour.wa_card": [" no cartão", " con tarjeta"],
    "tour.wa_name": ["Nome: {0}", "Nombre: {0}"], "tour.wa_pickup": [" · Busca: {0}", " · Búsqueda: {0}"],
    "tour.demo": ["(Demonstração: o banco ainda não está ligado.) ", "(Demostración: la base de datos todavía no está conectada.) "],
    "tour.done": ["Sua vaga fica garantida quando o pagamento for confirmado. A confirmação chega no seu WhatsApp.", "Tu lugar queda asegurado cuando se confirme el pago. La confirmación te llega por WhatsApp."],
    "tour.pix_res": ["Reserva {0}", "Reserva {0}"], "tour.pix_dep": ["Sinal: pague {0} no Pix", "Seña: pagá {0} por Pix"],
    "tour.pix_rest": ["O restante ({0}) é pago no embarque.", "El resto ({0}) se paga al embarcar."],
    "tour.pix_copy": ["Copiar chave Pix", "Copiar clave Pix"], "tour.pix_copied": ["Chave Pix copiada.", "Clave Pix copiada."],
    "tour.pix_ar": ["Si pagás desde Argentina, escribinos por WhatsApp y te indicamos cómo hacerlo.", "Si pagás desde Argentina, escribinos por WhatsApp y te indicamos cómo hacerlo."],
    "tour.card_msg": ["O link de pagamento no cartão chega no seu WhatsApp em instantes.", "El link de pago con tarjeta te llega por WhatsApp en instantes."],
    "tour.pix_msg": ["A chave Pix chega no seu WhatsApp em instantes.", "La clave Pix te llega por WhatsApp en instantes."],
    "tour.send_receipt": ["Enviar comprovante no WhatsApp", "Enviar comprobante por WhatsApp"], "tour.notify_wa": ["Avisar no WhatsApp", "Avisar por WhatsApp"],
    "tour.name_phone": ["Preencha nome e WhatsApp com DDD.", "Completá tu nombre y tu WhatsApp con código de área."],
    "tour.link_copied": ["Link copiado. É só colar no WhatsApp.", "Link copiado. Pegalo en WhatsApp."],
    "tour.close_x": ["Fechar", "Cerrar"],
    "tour.consult_open": ["Consultar datas", "Consultar fechas"],
    "tour.booking_open": ["Ver disponibilidade", "Ver disponibilidad"],
    "tour.consult_title": ["Disponibilidade", "Disponibilidad"],
    "tour.booking_title": ["Datas e valores", "Fechas y precios"],
    "tour.consult_cta": ["Consultar no WhatsApp", "Consultar por WhatsApp"],
    "tour.booking_cta": ["Continuar reserva", "Continuar reserva"],
    "tour.price_reference": ["Valor de referência no Pix", "Precio de referencia en Pix"],
    "tour.price_consult": ["Valor sob consulta", "Precio a consultar"],
    "tour.from_vehicle": ["Por veículo a partir de", "Por vehículo desde"],
    "tour.consult_note": ["Confirme disponibilidade, valor final e formas de pagamento pelo WhatsApp.", "Confirmá disponibilidad, precio final y medios de pago por WhatsApp."],
    "tour.consult_payment_h": ["Disponibilidade e pagamento", "Disponibilidad y pago"],
    "tour.consult_payment_p": ["Após confirmar a disponibilidade e o valor final, a equipe informa as condições de pagamento.", "Después de confirmar la disponibilidad y el precio final, el equipo te informa las condiciones de pago."],
    "tour.online_payment_p": ["Confira a cotação da data escolhida. As orientações de pagamento aparecem após o registro do pedido.", "Mirá la cotización de la fecha elegida. Las instrucciones de pago aparecen después de registrar la solicitud."],
    "tour.consult_policy": ["Peça ao atendimento as condições de alteração e cancelamento do roteiro escolhido.", "Pedile al equipo las condiciones para cambiar o cancelar el itinerario que elijas."],
    "tour.date_prompt": ["Escolha uma data para continuar.", "Elegí una fecha para continuar."],
    "tour.date_min": ["Para este pedido, escolha uma data a partir de {0}.", "Para este pedido, elegí una fecha desde el {0}."],
    "tour.date_max": ["Escolha uma data até {0}.", "Elegí una fecha hasta el {0}."],
    "tour.date_no_departure": ["Escolha uma das datas com saída para este passeio.", "Elegí una de las fechas con salida para este paseo."],
    "tour.pax_note": ["Confirme o preço e as regras de embarque das crianças com a equipe antes de pagar.", "Confirmá el precio y las reglas de embarque para los niños con el equipo antes de pagar."],
    "tour.wa_consult": ["Olá! Quero consultar disponibilidade, embarque e valor para este passeio.", "¡Hola! Quiero consultar disponibilidad, embarque y precio para este paseo."],
    "tour.wa_ref": ["Referência: {0}", "Referencia: {0}"],
    "tour.wa_no_date": ["Quero ajuda para escolher outra data.", "Quiero ayuda para elegir otra fecha."],
    "tour.wa_extra": ["Quero incluir o buggy.", "Quiero incluir el buggy."],
    "tour.wa_booking_pending": ["Olá! Quero atendimento sobre o pedido de reserva {0}.", "¡Hola! Quiero consultar por la solicitud de reserva {0}."],
    "tour.referral": ["Código incluído na consulta: {0}", "Código incluido en la consulta: {0}"],
    "tour.coupon_invalid_format": ["Use um código com até 32 letras, números, hífens ou sublinhados.", "Usá un código de hasta 32 letras, números, guiones o guiones bajos."],
    "tour.quote_loading": ["Consultando a cotação da data…", "Consultando la cotización de la fecha…"],
    "tour.quote_unavailable": ["Não conseguimos confirmar a cotação agora. Tente novamente ou consulte no WhatsApp.", "No pudimos confirmar la cotización ahora. Probá de nuevo o consultá por WhatsApp."],
    "tour.quote_retry": ["Tentar cotação novamente", "Volver a intentar la cotización"],
    "tour.quote_changed": ["Os valores mudaram. Feche esta janela e revise a cotação antes de enviar.", "Los precios cambiaron. Cerrá esta ventana y revisá la cotización antes de enviar."],
    "tour.quote_expired": ["Atualize a cotação antes de continuar.", "Actualizá la cotización antes de continuar."],
    "tour.form_title": ["Seus dados para a reserva", "Tus datos para la reserva"],
    "tour.request_received": ["Pedido de reserva recebido", "Solicitud de reserva recibida"],
    "tour.pending_with_time": ["Pedido {0}. A vaga está em retenção até {1}, no horário de Fortaleza. A confirmação depende da validação do pagamento.", "Solicitud {0}. Tu lugar queda retenido hasta las {1}, hora de Fortaleza. La confirmación depende de la validación del pago."],
    "tour.pending_review": ["Pedido {0}. Fale com a equipe para verificar disponibilidade e pagamento.", "Solicitud {0}. Escribile al equipo para verificar la disponibilidad y el pago."],
    "tour.pending_expired": ["A retenção do pedido {0} venceu. Fale com a equipe para consultar uma nova disponibilidade.", "La retención de la solicitud {0} venció. Escribile al equipo para volver a consultar disponibilidad."],
    "tour.payment_support": ["Use o protocolo para pedir as instruções de pagamento no canal oficial.", "Usá el número de solicitud para pedir las instrucciones de pago por el canal oficial."],
    "tour.payment_contact": ["Falar com atendimento no WhatsApp", "Hablar con atención por WhatsApp"],
    "tour.buggy_interest": ["Quero consultar a opção de buggy.", "Quiero consultar la opción de buggy."],
    "tour.phone_international": ["WhatsApp com código do país ou DDD", "WhatsApp con código de país o de área"],
    "tour.wa_point": ["Endereço da busca ou ponto de encontro", "Dirección de búsqueda o punto de encuentro"]
  };

  /* ---------- HTML fixo: texto em português -> espanhol (aplicado ao carregar) ---------- */
  var STATIC = {
    "Reservar passeio": "Reservar paseo", "Passeios em Fortaleza": "Paseos en Fortaleza",
    "O desconto já entra em qualquer passeio que você reservar.": "El descuento ya se aplica a cualquier paseo que reserves.",
    "Guia de turismo cadastrado no Cadastur": "Guía de turismo habilitado en Cadastur",
    "a partir de": "desde", "por pessoa no Pix": "por persona en Pix",
    "Buscar passeio": "Buscar paseo", "Destino": "Destino", "Todos os destinos": "Todos los destinos", "Data do passeio": "Fecha del paseo",
    "Ver passeios": "Ver paseos", "Montar pacote com vários passeios": "Armar un paquete con varios paseos",
    "Passeios": "Paseos", "Carregando passeios…": "Cargando paseos…", "Categorias": "Categorías",
    "Como funciona": "Cómo funciona", "Reservar leva 2 minutos": "Reservar lleva 2 minutos",
    "Escolha o passeio": "Elegí el paseo", "Veja o que está incluso e o que é opcional. Dúvidas? Chame no WhatsApp.": "Mirá qué incluye y qué es opcional. ¿Dudas? Escribinos por WhatsApp.",
    "Garanta a vaga com 20%": "Asegurá tu lugar con el 20%", "Pague 20% de sinal no Pix. O restante é pago no embarque, em dinheiro, Pix ou cartão.": "Pagá el 20% de seña por Pix. El resto se paga al embarcar, en efectivo, Pix o tarjeta.",
    "Embarque no hotel": "Te buscamos en el hotel", "A confirmação chega no WhatsApp, e o horário da busca chega na véspera.": "La confirmación te llega por WhatsApp y el horario de búsqueda, el día anterior.",
    "Vai ficar mais dias? Monte um pacote": "¿Te quedás más días? Armá un paquete",
    "Escolha 2 passeios ou mais e ganhe": "Elegí 2 paseos o más y llevate", "% de desconto em tudo, numa reserva só.": "% de descuento en todo, en una sola reserva.",
    "Montar meu pacote": "Armar mi paquete",
    "Por que reservar com a gente": "Por qué reservar con nosotros", "Sem surpresa do embarque à volta": "Sin sorpresas, de ida a vuelta",
    "Opcionais por escrito": "Opcionales por escrito", "Cada passeio mostra o que está incluso e o que é opcional, como buggy, jangada e almoço. Você confirma o valor do dia no WhatsApp antes de pagar.": "Cada paseo muestra qué está incluido y qué es opcional, como buggy, jangada y almuerzo. Confirmás el valor del día por WhatsApp antes de pagar.",
    "Gente de verdade no WhatsApp": "Personas reales en WhatsApp", "Você fala direto com quem organiza o seu passeio, antes e durante a viagem.": "Hablás directo con quien organiza tu paseo, antes y durante el viaje.",
    "Reserve com 20%": "Reservá con el 20%", "Garanta a vaga com um sinal no Pix e pague o restante no embarque.": "Asegurá tu lugar con una seña por Pix y pagá el resto al embarcar.",
    "Guia credenciado": "Guía habilitado", "Todos os passeios com guia de turismo credenciado no Cadastur.": "Todos los paseos con guía de turismo habilitado en Cadastur.",
    "Clientes": "Clientes", "O que os clientes dizem": "Lo que dicen los clientes",
    "Seja nosso parceiro": "Sé nuestro socio", "Indique passeios e ganhe por cada venda": "Recomendá paseos y ganá por cada venta",
    "Trabalha em pousada, dirige por aplicativo ou cria conteúdo de viagem? Receba um cupom com seu nome.": "¿Trabajás en una posada, manejás por aplicación o creás contenido de viajes? Recibí un cupón con tu nombre.",
    "Seu cliente ganha desconto": "Tu cliente recibe descuento", "Você ganha comissão por passeio realizado (percentual e prazo combinados com você no WhatsApp)": "Vos ganás comisión por cada paseo realizado (porcentaje y plazo a coordinar con vos por WhatsApp)",
    "Não paga nada para entrar": "No pagás nada para entrar",
    "Seu nome": "Tu nombre", "WhatsApp com DDD": "WhatsApp con código de área", "Onde você trabalha": "Dónde trabajás",
    "Pousada ou hotel": "Posada u hotel", "Motorista": "Conductor", "Criador de conteúdo": "Creador de contenido", "Vendedor de passeios": "Vendedor de paseos", "Outro": "Otro",
    "Quero meu cupom": "Quiero mi cupón", "Informações": "Información", "Perguntas frequentes": "Preguntas frecuentes",
    "Promoções no WhatsApp": "Promociones por WhatsApp", "Receba os roteiros e descontos no seu WhatsApp": "Recibí los itinerarios y descuentos en tu WhatsApp",
    "Só o que vale a pena. Ao enviar, você aceita receber nossas mensagens; responda SAIR para parar quando quiser.": "Solo lo que vale la pena. Al enviar, aceptás recibir nuestros mensajes; respondé SALIR para dejar de recibirlos cuando quieras.",
    "Seu WhatsApp com DDD": "Tu WhatsApp con código de área", "Quero receber": "Quiero recibir",
    "Pronto para o seu dia de praia?": "¿Listo para tu día de playa?", "Escolher meu passeio": "Elegir mi paseo",
    "Créditos das fotos": "Créditos de las fotos", "Reservar pacote": "Reservar paquete", "Falar no WhatsApp": "Hablar por WhatsApp",
    // página do passeio
    "Carregando passeio…": "Cargando paseo…", "A partir de": "Desde", "no Pix": "en Pix", "Reservar": "Reservar",
    "Reserva": "Reserva", "Sua reserva": "Tu reserva", "Fechar": "Cerrar",
    "Seus dados para a reserva": "Tus datos para la reserva", "Hotel ou endereço da busca": "Hotel o dirección donde te buscamos",
    "Enviar pedido de reserva": "Enviar solicitud de reserva", "Voltar": "Volver", "Pedido de reserva recebido": "Solicitud de reserva recibida",
    "Enviar comprovante no WhatsApp": "Enviar comprobante por WhatsApp",
    "Por pessoa a partir de": "Por persona desde", "Data": "Fecha", "Tipo": "Tipo", "Tipo de passeio": "Tipo de paseo",
    "Em grupo": "En grupo", "Privativo": "Privado", "Viajantes": "Viajeros",
    "Adultos": "Adultos", "11 anos ou mais": "11 años o más", "Menos adultos": "Menos adultos", "Mais adultos": "Más adultos",
    "Crianças": "Niños", "5 a 10 anos": "5 a 10 años", "Menos crianças": "Menos niños", "Mais crianças": "Más niños",
    "Idosos": "Adultos mayores", "60 anos ou mais · preço de adulto": "60 años o más · precio de adulto", "Menos idosos": "Menos adultos mayores", "Mais idosos": "Más adultos mayores",
    "Até 4 anos: no colo, grátis. De 5 a 10 anos: o valor é confirmado no WhatsApp; o total abaixo usa o preço de adulto.": "Hasta 4 años: en brazos, gratis. De 5 a 10 años: el valor se confirma por WhatsApp; el total de abajo usa el precio de adulto.",
    "Cupom": "Cupón", "Código de quem te indicou": "Código de quien te lo pasó", "Aplicar": "Aplicar",
    "Pagamento": "Pago", "Forma de pagamento": "Forma de pago", "Pix": "Pix", "Cartão": "Tarjeta", "Cartão 4x": "Tarjeta en 4 cuotas",
    "Guia Cadastur": "Guía Cadastur", "Sinal de": "Seña del", "Restante no embarque": "Resto al embarcar",
    "Reservar agora": "Reservar ahora", "Dúvidas? Fale com a gente": "¿Dudas? Escribinos",
    "Pagás en reales (R$): aceptamos Pix, tarjeta o efectivo.": "Pagás en reales (R$): aceptamos Pix, tarjeta o efectivo."
  };

  /* ---------- Textos do banco (configurações, perguntas frequentes): português -> espanhol ---------- */
  var DYN = {
    "Jericoacoara, Cumbuco e Canoa Quebrada saindo do seu hotel em Fortaleza": "Jericoacoara, Cumbuco y Canoa Quebrada saliendo de tu hotel en Fortaleza",
    "Guia de turismo cadastrado no Cadastur": "Guía de turismo habilitado en Cadastur",
    "Busca no seu hotel": "Te buscamos en tu hotel", "Guia credenciado Cadastur": "Guía habilitado en Cadastur",
    "Reserve com 20% de sinal": "Reservá con una seña del 20%", "Restante no embarque": "El resto al embarcar",
    "Pix, cartão ou dinheiro": "Pix, tarjeta o efectivo", "Atendimento no WhatsApp": "Atención por WhatsApp",
    "Passeios em Fortaleza": "Paseos en Fortaleza",
    "Fortaleza, CE · Guia de turismo cadastrado no Cadastur": "Fortaleza, CE · Guía de turismo habilitado en Cadastur",
    "Reserva com sinal de 20% do valor (50% em pacotes com hospedagem). O restante é pago no embarque, ao guia, em dinheiro, Pix ou cartão, e o embarque só acontece com o saldo quitado. Cancelamentos sem justificativa médica ou legal não são reembolsados. Quem não comparecer no horário combinado (tolerância de 10 minutos) perde a reserva, sem devolução. Passeios opcionais (buggy, jangada, quadriciclo) e alimentação são por conta do passageiro.":
      "Reserva con una seña del 20% del valor (50% en paquetes con alojamiento). El resto se paga al embarcar, al guía, en efectivo, Pix o tarjeta, y el embarque solo se realiza con el saldo pagado. Las cancelaciones sin justificación médica o legal no se reembolsan. Quien no se presente en el horario acordado (tolerancia de 10 minutos) pierde la reserva, sin devolución. Los paseos opcionales (buggy, jangada, cuatriciclo) y la comida corren por cuenta del pasajero.",
    "Como funciona a reserva?": "¿Cómo funciona la reserva?",
    "Você escolhe o passeio, a data e quantas pessoas, deixa seu nome e WhatsApp e paga 20% de sinal no Pix. O restante é pago no embarque, e a confirmação chega no WhatsApp.":
      "Elegís el paseo, la fecha y cuántas personas son, dejás tu nombre y WhatsApp y pagás el 20% de seña por Pix. El resto se paga al embarcar y la confirmación te llega por WhatsApp.",
    "Posso cancelar?": "¿Puedo cancelar?",
    "Cancelamentos sem justificativa médica ou legal não são reembolsados. Quem não comparecer no horário combinado (tolerância de 10 minutos) perde a reserva. Em caso de dúvida, fale com a gente no WhatsApp antes de reservar.":
      "Las cancelaciones sin justificación médica o legal no se reembolsan. Quien no se presente en el horario acordado (tolerancia de 10 minutos) pierde la reserva. Ante cualquier duda, escribinos por WhatsApp antes de reservar.",
    "O que está incluso?": "¿Qué está incluido?",
    "Os passeios incluem transfer de ida e volta e guia credenciado no Cadastur. Passeios opcionais, como buggy e jangada, e a alimentação são pagos à parte, no local.":
      "Los paseos incluyen traslado de ida y vuelta y guía habilitado en Cadastur. Los paseos opcionales, como buggy y jangada, y la comida se pagan aparte, en el lugar.",
    "Criança paga?": "¿Los niños pagan?",
    "Até 4 anos vai no colo, sem ocupar vaga. De 5 a 10 anos, o valor é confirmado no WhatsApp antes do pagamento; a calculadora do site mostra o preço de adulto.":
      "Hasta 4 años va en brazos, sin ocupar lugar. De 5 a 10 años, el valor se confirma por WhatsApp antes del pago; la calculadora del sitio muestra el precio de adulto.",
    "Tenho cupom de quem me indicou. Onde uso?": "Tengo un cupón de quien me recomendó. ¿Dónde lo uso?",
    "Abra o link que recebeu ou digite o código na reserva. O desconto aparece na hora.": "Abrí el link que recibiste o escribí el código en la reserva. El descuento aparece al instante.",
    "opcional": "opcional", "à parte": "aparte"
  };

  /* ---------- Texto alternativo das fotos (pelo nome do arquivo) ---------- */
  var ALT = {
    "3praias-1.jpg": "Acantilados y piscinas naturales de Praia das Fontes, Beberibe", "3praias-2.jpg": "Mar y acantilados en Praia das Fontes, Beberibe",
    "3praias-3.jpg": "Acantilados de colores de Praia das Fontes, Beberibe", "canoa-1.jpg": "Acantilados rojos de Canoa Quebrada, Aracati",
    "canoa-2.jpg": "Vista de Canoa Quebrada, Aracati", "canoa-3.jpg": "Playa de Canoa Quebrada, Aracati",
    "morro-1.jpg": "Acantilados de Morro Branco, Beberibe", "morro-2.jpg": "Laberinto de acantilados de Morro Branco, Beberibe",
    "morro-3.jpg": "Playa de Beberibe vista desde arriba", "cumbuco-1.jpg": "Dunas y mar en Cumbuco, Caucaia",
    "cumbuco-2.jpg": "Playa de Cumbuco con jangadas", "cumbuco-3.jpg": "Costanera de Cumbuco, Caucaia",
    "lagoinha-1.jpg": "Cocoteros y mar calmo en Praia da Lagoinha, Paraipaba", "lagoinha-2.jpg": "Ensenada de Lagoinha vista desde el mirador",
    "lagoinha-3.jpg": "Praia da Lagoinha, Paraipaba", "flexau-1.jpg": "Estuario del río Mundaú, Trairi",
    "flexau-2.jpg": "Desembocadura del río Mundaú en el mar", "flexau-3.jpg": "Desembocadura del río Mundaú, Ceará",
    "aguas-1.jpg": "Encuentro del río con el mar en Águas Belas, Cascavel", "aguas-2.jpg": "Playa de Águas Belas, Cascavel",
    "paracuru-1.jpg": "Playa de Paracuru", "paracuru-2.jpg": "Costanera de Paracuru",
    "jeribv-1.jpg": "Pedra Furada, Jericoacoara", "jeribv-2.jpg": "Duna del Atardecer, Jericoacoara", "jeribv-3.jpg": "Atardecer en la duna de Jericoacoara",
    "jeri3-1.jpg": "Hamacas en la Laguna del Paraíso, Jijoca", "jeri3-2.jpg": "Laguna Azul, Jericoacoara", "jeri3-3.jpg": "Duna del Atardecer, Jericoacoara",
    "transjeri-1.jpg": "Camino a Jericoacoara", "transjeri-2.jpg": "Pueblo de Jericoacoara",
    "beachpark-1.jpg": "Beach Park y el mar, Aquiraz", "beachpark-2.jpg": "Tobogán Insano en el Beach Park", "beachpark-3.jpg": "Entrada del Beach Park",
    "alchymist-1.jpg": "Laguna del Alchymist Beach Club", "alchymist-2.jpg": "Reposeras en el Alchymist Beach Club",
    "hero-2.jpg": "Playa de Iracema y Beira Mar de Fortaleza"
  };

  function fill(s, args) { return String(s).replace(/\{(\d+)\}/g, function (m, i) { return args[+i] == null ? "" : args[+i]; }); }
  function t(key) {
    var e = K[key]; if (!e) return key;
    return fill(e[ES ? 1 : 0], Array.prototype.slice.call(arguments, 1));
  }
  // Mensagens de erro vindas do servidor (em português)
  var ERR = [
    [/^Passeio indisponível\.?$/, "Paseo no disponible."],
    [/^A reserva precisa de pelo menos 1 adulto ou idoso\.?$/, "La reserva necesita al menos 1 adulto o adulto mayor."],
    [/^As saídas dessa data já fecharam\. Escolha a partir de (.+?)\.?$/, "Las salidas de esa fecha ya cerraron. Elegí una fecha a partir del $1."],
    [/^Data muito distante\.?$/, "Fecha demasiado lejana."],
    [/^Restam (\d+) vagas nesta data\.?$/, "Quedan $1 lugares en esta fecha."],
    [/^Informe seu nome\.?$/, "Indicá tu nombre."],
    [/^Informe o WhatsApp com DDD\.?$/, "Indicá tu WhatsApp con código de área."],
    [/^A cotação mudou\. Atualize os valores antes de reservar\.?$/, "La cotización cambió. Actualizá los valores antes de reservar."]
  ];
  function err(m) {
    if (!ES || !m) return m;
    for (var i = 0; i < ERR.length; i++) if (ERR[i][0].test(m)) return m.replace(ERR[i][0], ERR[i][1]);
    return m;
  }
  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function tx(s) {
    if (!ES || s == null) return s;
    var k = norm(s); return DYN[k] || STATIC[k] || s;
  }
  // campo do passeio: espanhol (i18n.es) quando existir
  function tr(tour, field) {
    if (ES && tour && tour.i18n && tour.i18n.es && tour.i18n.es[field] != null && tour.i18n.es[field] !== "") return tour.i18n.es[field];
    return tour ? tour[field] : "";
  }
  function trList(tour, field) { var v = tr(tour, field); return Array.isArray(v) ? v : (tour && tour[field]) || []; }
  function trExtras(tour) {
    var base = (tour && tour.extras) || [], es = ES && tour && tour.i18n && tour.i18n.es && tour.i18n.es.extras;
    return base.map(function (e, i) {
      var c = Object.assign({}, e);
      if (es && es[i] && es[i].name) c.name = es[i].name;
      if (ES && typeof c.price === "string") c.price = tx(c.price);
      return c;
    });
  }
  function altFile(url) { return ES ? ALT[String(url || "").split("/").pop()] : ""; }

  /* ---------- Traduz o HTML fixo e os modelos <template> ---------- */
  var ATTRS = ["placeholder", "aria-label", "title", "alt"];
  function walk(root) {
    if (!ES) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var p = node.parentNode; if (!p || /^(SCRIPT|STYLE)$/.test(p.nodeName) || (p.closest && p.closest("[data-i18n]"))) return;
      var raw = node.nodeValue, k = norm(raw); if (!k) return;
      var es = STATIC[k]; if (es == null) return;
      if (p.nodeName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", k);
      node.nodeValue = raw.match(/^\s*/)[0] + es + raw.match(/\s*$/)[0];
    });
    var els = root.querySelectorAll ? root.querySelectorAll("[placeholder],[aria-label],[title],[alt]") : [];
    Array.prototype.forEach.call(els, function (el) {
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && STATIC[norm(v)]) el.setAttribute(a, STATIC[norm(v)]); });
    });
    Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll("[data-i18n]") : [], function (el) {
      var key = el.getAttribute("data-i18n"); if (K[key]) el.innerHTML = t(key);
    });
    Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll("[data-es-only]") : [], function (el) { el.hidden = false; });
  }
  function applyAll() {
    walk(document.body);
    Array.prototype.forEach.call(document.querySelectorAll("template"), function (tp) { walk(tp.content); });
    var md = document.querySelector('meta[property="og:locale"]'); if (md && ES) md.content = "es_AR";
  }

  /* ---------- Botão PT | ES no cabeçalho ---------- */
  function go(code) {
    try { localStorage.setItem("site-lang", code); } catch (e) {}
    var u = new URL(location.href); u.searchParams.set("lang", code); location.href = u.href;
  }
  function mountSwitch() {
    var wrap = document.querySelector("header.top .wrap"); if (!wrap || wrap.querySelector(".lang-sw")) return;
    var d = document.createElement("div"); d.className = "lang-sw"; d.setAttribute("role", "group"); d.setAttribute("aria-label", ES ? "Idioma" : "Idioma / Language");
    d.innerHTML = '<button type="button" data-lang="pt" aria-pressed="' + !ES + '" lang="pt">PT</button><span aria-hidden="true">|</span><button type="button" data-lang="es" aria-pressed="' + ES + '" lang="es">ES</button>';
    d.addEventListener("click", function (e) { var b = e.target.closest("button[data-lang]"); if (b && b.dataset.lang !== (ES ? "es" : "pt")) go(b.dataset.lang); });
    var btn = wrap.querySelector(".btn"); wrap.insertBefore(d, btn || null);
  }

  if (!off) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mountSwitch(); applyAll(); });
    else { mountSwitch(); applyAll(); }
  }
  window.I18N = { lang: lang, es: ES, t: t, tx: tx, err: err, tr: tr, trList: trList, trExtras: trExtras, altFile: altFile, walk: walk, K: K, STATIC: STATIC, DYN: DYN };
})();
