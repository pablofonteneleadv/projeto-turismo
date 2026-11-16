/* Dados do site: lê do Supabase quando configurado; senão usa os dados iniciais abaixo. */
(function () {
  var CFG = window.SITE_CONFIG || {};

  var SETTINGS = {
    brand: "Maré", brand_sub: "Passeios · Fortaleza",
    whatsapp: "", pix_key: "", pix_name: "", instagram: "marepasseios",
    hero_eyebrow: "Receptivo em Fortaleza · Cadastur",
    hero_title: "Passeios saindo do seu hotel em Fortaleza",
    hero_promises: ["Busca no seu hotel", "Guia credenciado Cadastur", "Pix ou cartão em até 4x", "Cancelamento grátis até 24 h", "Extras com preço na página", "Troca de data se chover"],
    pack_discount_pct: 5, deposit_pct: 20, child_factor: 1,
    rating_value: "", rating_count: "",
    cancel_policy: "Cancelamento grátis até 24 h antes, com devolução em até 2 dias úteis. Se o passeio for cancelado pela chuva, você escolhe outra data ou recebe tudo de volta.",
    footer_note: "Fortaleza, CE · Cadastur em andamento"
  };

  function T(o) { return Object.assign({ includes: ["Transporte com ar-condicionado", "Guia credenciado no Cadastur", "Seguro do passeio", "Busca e volta ao hotel"], extras: [], itinerary: [], photos: [], active: true, featured: false, per_vehicle: false, price_private: null, sort: 100 }, o); }

  var TOURS = [
    T({ slug: "3praias", name: "3 Praias em 1 dia", category: "passeios", location: "Litoral Leste", times: "Saída 07:00 · Volta 19:00", duration: "Dia inteiro, 12 h", price_card: 99.9, price_pix: 89.9, price_private: 690, rating: 4.9, featured: true, sort: 1,
      summary: "Morro Branco, Praia das Fontes e Uruaú no mesmo dia.",
      description: "O passeio mais pedido do litoral leste: as falésias coloridas e o labirinto de Morro Branco, as fontes de água doce que brotam das falésias na Praia das Fontes e a lagoa do Uruaú. Ideal para quem tem poucos dias em Fortaleza.",
      extras: [{ name: "Buggy pelas falésias (até 4 pessoas)", price: 350 }, { name: "Almoço na barraca", price: "R$ 60–90" }],
      itinerary: [{ time: "07:00", text: "Busca nos hotéis da orla" }, { time: "09:00", text: "Morro Branco e o labirinto das falésias" }, { time: "12:00", text: "Praia das Fontes, banho e almoço" }, { time: "15:00", text: "Lagoa do Uruaú" }, { time: "19:00", text: "Chegada aos hotéis" }],
      photos: [{ url: "fotos/3praias-1.jpg" }] }),
    T({ slug: "cumbuco", name: "Cumbuco", category: "passeios", location: "Caucaia", times: "Saída 08:00 · Volta 17:00", duration: "Dia inteiro, 9 h", price_card: 74.9, price_pix: 69.9, price_private: 449, rating: 4.9, sort: 2,
      summary: "Dunas, lagoa do Parnamirim e a praia do kitesurf.",
      description: "Cumbuco tem dunas altas, lagoas de água doce e vento constante, o paraíso do kitesurf. Você passa o dia na praia e pode descer as dunas de skibunda até cair na Lagoa do Parnamirim.",
      extras: [{ name: "Buggy (até 4 pessoas)", price: 450, buggy: true }, { name: "Passeio de jangada", price: 40 }, { name: "Skibunda", price: 15 }, { name: "Almoço na barraca", price: "R$ 60–90" }],
      itinerary: [{ time: "08:00", text: "Busca nos hotéis da Beira Mar, Meireles e Iracema" }, { time: "09:30", text: "Chegada em Cumbuco e tempo livre na praia" }, { time: "11:00", text: "Opcional: buggy pelas dunas e lagoas" }, { time: "16:00", text: "Saída de volta para Fortaleza" }, { time: "17:00", text: "Chegada aos hotéis. Evite marcar no dia do voo." }],
      photos: [{ url: "fotos/cumbuco-1.jpg" }, { url: "fotos/cumbuco-2.jpg" }, { url: "fotos/cumbuco-3.jpg" }] }),
    T({ slug: "lagoinha", name: "Lagoinha", category: "passeios", location: "Paraipaba", times: "Saída 07:30 · Volta 16:30", duration: "Dia inteiro, 9 h", price_card: 89.9, price_pix: 84.9, price_private: 590, rating: 4.8, sort: 3,
      summary: "Enseada de coqueiros e mar calmo, uma das praias mais bonitas do Ceará.",
      description: "Lagoinha é uma enseada de coqueiros, dunas e mar calmo. Dá para subir o mirante, fazer passeio de buggy até a Lagoa da Torta e almoçar pé na areia.",
      extras: [{ name: "Buggy até a Lagoa da Torta", price: 300, buggy: true }, { name: "Almoço na barraca", price: "R$ 60–90" }],
      itinerary: [{ time: "07:30", text: "Busca nos hotéis" }, { time: "09:30", text: "Chegada em Lagoinha" }, { time: "15:00", text: "Saída" }, { time: "16:30", text: "Chegada aos hotéis" }],
      photos: [{ url: "fotos/lagoinha-1.jpg" }, { url: "fotos/lagoinha-2.jpg" }] }),
    T({ slug: "canoa", name: "Canoa Quebrada", category: "passeios", location: "Aracati", times: "Saída 07:00 · Volta 19:00", duration: "Dia inteiro, 12 h", price_card: 129.9, price_pix: 119.9, price_private: 790, rating: 4.8, sort: 4,
      summary: "Falésias vermelhas, a Broadway e o pôr do sol na duna.",
      description: "Canoa Quebrada tem as falésias mais famosas do Ceará, a rua da Broadway cheia de restaurantes e passeios de buggy até Ponta Grossa.",
      extras: [{ name: "Buggy pelas falésias (até 4 pessoas)", price: 400, buggy: true }, { name: "Passeio de jangada", price: 50 }],
      itinerary: [{ time: "07:00", text: "Busca nos hotéis" }, { time: "10:00", text: "Chegada em Canoa Quebrada" }, { time: "16:00", text: "Saída" }, { time: "19:00", text: "Chegada aos hotéis" }],
      photos: [{ url: "fotos/canoa-1.jpg" }, { url: "fotos/canoa-2.jpg" }] }),
    T({ slug: "morro", name: "Morro Branco", category: "passeios", location: "Beberibe", times: "Saída 07:00 · Volta 17:00", duration: "Dia inteiro, 10 h", price_card: 89.9, price_pix: 84.9, rating: 4.7, sort: 5,
      summary: "O labirinto de falésias e as garrafinhas de areia colorida.",
      description: "Morro Branco é famoso pelo labirinto de falésias com areias de várias cores, usadas nas garrafinhas de areia do artesanato cearense.",
      extras: [{ name: "Buggy (até 4 pessoas)", price: 300, buggy: true }],
      photos: [{ url: "fotos/morro-1.jpg" }] }),
    T({ slug: "aguas", name: "Águas Belas", category: "passeios", location: "Cascavel", times: "Saída 08:00 · Volta 18:00", duration: "Dia inteiro, 10 h", price_card: 79.9, price_pix: 69.9, rating: 4.7, sort: 6,
      summary: "Encontro do rio com o mar e travessia de balsa.",
      description: "Em Águas Belas o rio Malcozinhado encontra o mar. Tem travessia de balsa, banho de rio e praia quase deserta.",
      extras: [{ name: "Passeio de barco no rio", price: 30 }],
      photos: [{ url: "fotos/aguas-1.jpg" }] }),
    T({ slug: "flexau", name: "Flecheiras e Mundaú", category: "passeios", location: "Trairi", times: "Saída 07:00 · Volta 18:30", duration: "Dia inteiro, 11 h", price_card: 189.9, price_pix: 174.9, rating: 4.8, sort: 7,
      summary: "Piscinas naturais de Flecheiras e o rio de Mundaú.",
      description: "Flecheiras tem piscinas naturais na maré baixa; Mundaú tem o encontro do rio com o mar e dunas altas. Dois destinos tranquilos em um dia.",
      extras: [{ name: "Buggy em Mundaú (até 4 pessoas)", price: 350, buggy: true }],
      photos: [{ url: "fotos/flexau-1.jpg" }] }),
    T({ slug: "jeribv", name: "Jericoacoara bate-volta", category: "passeios", location: "Jijoca", times: "Saída 02:30 · Volta 23:30", duration: "21 h, ida e volta no mesmo dia", price_card: 189, price_pix: 179, rating: 4.9, featured: true, sort: 8,
      summary: "Jeri em um dia: Pedra Furada, lagoas e o pôr do sol na duna.",
      description: "Para quem tem pouco tempo: saída de madrugada, dia inteiro em Jericoacoara e volta à noite. Inclui a jardineira até a vila; a Lagoa do Paraíso e a Pedra Furada são opcionais.",
      extras: [{ name: "Passeio de 4x4 pelas lagoas", price: 100 }, { name: "Taxa de turismo sustentável de Jeri", price: 41.5 }],
      photos: [{ url: "fotos/jeribv-1.jpg" }, { url: "fotos/jeribv-2.jpg" }] }),
    T({ slug: "jeri3", name: "Jeri 3 dias com pousada", category: "pacotes", location: "Jericoacoara", times: "3 dias e 2 noites · café incluso", duration: "3 dias", price_card: 790, price_pix: 750, rating: 5.0, featured: true, sort: 9,
      summary: "Transfer, 2 noites em pousada e passeio pelas lagoas.",
      description: "Pacote completo: transfer de Fortaleza a Jeri, 2 noites em pousada com café da manhã e o passeio leste pelas lagoas (Paraíso e Azul) e Pedra Furada.",
      includes: ["Transfer ida e volta", "2 noites em pousada com café", "Passeio leste de 4x4", "Guia credenciado"],
      extras: [{ name: "Taxa de turismo sustentável de Jeri", price: 41.5 }],
      photos: [{ url: "fotos/jeri3-1.jpg" }] }),
    T({ slug: "5praias", name: "5 praias em 3 dias", category: "pacotes", location: "Litoral Leste e Oeste", times: "Um passeio por dia", duration: "3 dias", price_card: 299.9, price_pix: 279.9, rating: 4.8, sort: 10,
      summary: "Cumbuco, Lagoinha e 3 Praias com um só pagamento.",
      description: "Três dias de passeio, um por dia, com busca no hotel em todos. Você escolhe as datas.",
      photos: [{ url: "fotos/5praias-1.jpg" }] }),
    T({ slug: "privcumbuco", name: "Cumbuco privativo", category: "privativos", location: "Van só para você", times: "Horário que você escolher · até 6 pessoas", duration: "Até 9 h", price_card: 449, price_pix: 420, per_vehicle: true, rating: 5.0, sort: 11,
      summary: "Seu grupo, seu horário, sem esperar ninguém.",
      description: "Van com motorista só para o seu grupo, até 6 pessoas, no horário que você escolher.",
      extras: [{ name: "Buggy (até 4 pessoas)", price: 450, buggy: true }],
      photos: [{ url: "fotos/privcumbuco-1.jpg" }] }),
    T({ slug: "privjeri", name: "Jeri privativo", category: "privativos", location: "4x4 só para você", times: "Até 4 pessoas", duration: "Dia inteiro", price_card: 1190, price_pix: 1120, per_vehicle: true, rating: 5.0, sort: 12,
      summary: "4x4 exclusivo de Fortaleza a Jericoacoara.",
      description: "Viagem em 4x4 só para o seu grupo, com paradas onde quiser.",
      photos: [{ url: "fotos/privjeri-1.jpg" }] }),
    T({ slug: "aeroporto", name: "Transfer aeroporto", category: "transfers", location: "Fortaleza", times: "Na hora do seu voo", duration: "30 a 50 min", price_card: 54.9, price_pix: 49.9, rating: 4.9, sort: 13,
      summary: "Do aeroporto ao hotel com motorista esperando.",
      description: "Motorista esperando com placa no desembarque e levando até o seu hotel em Fortaleza.",
      includes: ["Motorista no desembarque", "Acompanhamento do voo", "Bagagem incluída"],
      photos: [{ url: "fotos/aeroporto-1.jpg" }] }),
    T({ slug: "transjeri", name: "Transfer para Jericoacoara", category: "transfers", location: "Fortaleza → Jeri", times: "Saídas 07:00 e 11:00", duration: "5 a 6 h", price_card: 169.9, price_pix: 159.9, rating: 4.8, sort: 14,
      summary: "Do seu hotel em Fortaleza até a pousada em Jeri.",
      description: "Van até Jijoca e jardineira até a vila de Jericoacoara, com bagagem.",
      includes: ["Van com ar-condicionado", "Jardineira até a vila", "Bagagem incluída"],
      extras: [{ name: "Taxa de turismo sustentável de Jeri", price: 41.5 }],
      photos: [{ url: "fotos/transjeri-1.jpg" }] }),
    T({ slug: "veleiro", name: "Pôr do sol de veleiro", category: "nautico", location: "Beira Mar", times: "Saída 16:00 · 1 h 30", duration: "1 h 30", price_card: 79.9, price_pix: 74.9, rating: 4.9, sort: 15,
      summary: "O pôr do sol de Fortaleza visto do mar.",
      description: "Saída da Beira Mar em veleiro para ver o pôr do sol no mar, com a cidade iluminando ao fundo.",
      includes: ["Passeio de veleiro", "Colete salva-vidas", "Seguro"],
      photos: [{ url: "fotos/veleiro-1.jpg" }] })
  ];

  /* Avaliações só entram quando forem de clientes reais (cadastradas no painel). */
  var REVIEWS = [];

  var FAQS = [
    { question: "Como funciona a reserva?", answer: "Você escolhe o passeio, a data e quantas pessoas, deixa seu nome e WhatsApp e paga no Pix. A confirmação e o voucher chegam no WhatsApp." },
    { question: "Posso cancelar ou trocar a data?", answer: "Até 24 horas antes, cancelamento com devolução integral. Se chover e o passeio for cancelado, você escolhe outra data ou recebe tudo de volta." },
    { question: "Os passeios têm seguro?", answer: "Sim. Todos os passageiros têm seguro, e os guias são credenciados no Cadastur." },
    { question: "Criança paga?", answer: "Até 4 anos vai no colo, grátis. De 5 a 10 anos paga meia na maioria dos passeios." },
    { question: "Tenho cupom de quem me indicou. Onde uso?", answer: "Abra o link que recebeu ou digite o código na reserva. O desconto aparece na hora." }
  ];

  var CATS = [["todos", "Todos"], ["passeios", "Passeios"], ["pacotes", "Pacotes"], ["privativos", "Privativos"], ["transfers", "Transfers"], ["nautico", "Náutico"]];
  var DEMO_COUPONS = { BRUNO: { code: "BRUNO", agent_name: "Bruno", discount_pct: 5 } };

  var sb = null;
  function client() {
    if (sb) return sb;
    if (CFG.supabaseUrl && CFG.supabaseKey && window.supabase) sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
    return sb;
  }

  async function load() {
    var c = client();
    if (!c) return { settings: SETTINGS, tours: TOURS, reviews: REVIEWS, faqs: FAQS, live: false };
    try {
      var r = await Promise.all([
        c.from("settings").select("data").eq("id", 1).maybeSingle(),
        c.from("tours").select("*").eq("active", true).order("sort"),
        c.from("reviews").select("*").eq("published", true).order("sort"),
        c.from("faqs").select("*").eq("published", true).order("sort")
      ]);
      if (r[1].error) throw r[1].error;
      return {
        settings: Object.assign({}, SETTINGS, (r[0].data && r[0].data.data) || {}),
        tours: (r[1].data && r[1].data.length) ? r[1].data : TOURS,
        reviews: r[2].data || [],
        faqs: (r[3].data && r[3].data.length) ? r[3].data : FAQS,
        live: true
      };
    } catch (e) {
      console.warn("Usando dados iniciais:", e && e.message);
      return { settings: SETTINGS, tours: TOURS, reviews: REVIEWS, faqs: FAQS, live: false };
    }
  }

  async function checkCoupon(code) {
    code = (code || "").trim().toUpperCase();
    if (!code) return null;
    var c = client();
    if (!c) return DEMO_COUPONS[code] || null;
    var r = await c.rpc("check_coupon", { p_code: code });
    if (r.error || !r.data || !r.data.length) return null;
    return r.data[0];
  }

  async function insert(table, row) {
    var c = client();
    if (!c) return { error: null, demo: true };
    return c.from(table).insert(row);
  }

  window.SiteData = {
    load: load, checkCoupon: checkCoupon, insert: insert, client: client,
    SEED: { settings: SETTINGS, tours: TOURS, reviews: REVIEWS, faqs: FAQS },
    CATS: CATS,
    brl: function (v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); },
    money: function (v) { return typeof v === "number" ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : String(v || ""); },
    esc: function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); },
    art: function (seed) {
      var pals = [["#F2DDB0", "#E2C083", "#3FA7B5"], ["#E7B98A", "#C1673A", "#2B9FB0"], ["#8FD0DA", "#2B9FB0", "#E8D3A2"], ["#E59A4B", "#FBE3A3", "#0F6E7C"], ["#9ED8C8", "#2E8C7A", "#E8D3A2"]];
      var h = 0; String(seed || "").split("").forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
      var a = pals[h % pals.length];
      return '<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="300" height="170" fill="' + a[0] + '"/><path d="M0 105 Q80 55 160 95 T300 80 V170 H0Z" fill="' + a[1] + '"/><path d="M0 135 Q140 115 300 130 V170 H0Z" fill="' + a[2] + '"/></svg>';
    },
    coupon: {
      get: function () { try { return localStorage.getItem("site-cupom") || ""; } catch (e) { return ""; } },
      set: function (v) { try { v ? localStorage.setItem("site-cupom", v) : localStorage.removeItem("site-cupom"); } catch (e) {} }
    },
    waLink: function (number, text) { var n = String(number || "").replace(/\D/g, ""); return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(text || "") : ""; }
  };
})();
