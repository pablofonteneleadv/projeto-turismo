(function () {
  var places = {
    "jericoacoara": ["Jericoacoara", "Jericoacoara"],
    "3-praias": ["3 Praias do Litoral Leste", "3 Playas del Litoral Este"],
    "morro-branco": ["Morro Branco", "Morro Branco"],
    "praia-das-fontes": ["Praia das Fontes", "Praia das Fontes"],
    "canoa-quebrada": ["Canoa Quebrada", "Canoa Quebrada"],
    "cumbuco": ["Cumbuco", "Cumbuco"],
    "lagoinha": ["Lagoinha", "Lagoinha"],
    "flecheiras-e-mundau": ["Flecheiras e Mundaú", "Flecheiras y Mundaú"],
    "flecheiras": ["Flecheiras", "Flecheiras"],
    "mundau": ["Mundaú", "Mundaú"],
    "aguas-belas": ["Águas Belas", "Águas Belas"],
    "paracuru": ["Paracuru", "Paracuru"],
    "beach-park": ["Beach Park", "Beach Park"],
    "lagoa-encantada": ["Lagoa Encantada", "Lagoa Encantada"],
    "varios-destinos": ["Pacotes com vários destinos", "Paquetes con varios destinos"]
  };
  var aliases = { "jeri": "jericoacoara", "jijoca-de-jericoacoara": "jericoacoara", "flexeiras": "flecheiras", "litoral-leste": "3-praias" };
  var beaches = ["morro-branco", "praia-das-fontes", "canoa-quebrada"];
  var routes = {
    "jeri-economy": ["jericoacoara"],
    "jeri-premium": ["jericoacoara"],
    "jeri-vip": ["jericoacoara"],
    "3praias": ["3-praias"].concat(beaches),
    "3praias-buggy": ["3-praias"].concat(beaches),
    "3praias-por-do-sol": ["3-praias"].concat(beaches),
    "cumbuco": ["cumbuco"],
    "lagoinha": ["lagoinha"],
    "combo-lagoinha": ["lagoinha"],
    "flexau": ["flecheiras-e-mundau", "flecheiras", "mundau"],
    "aguas": ["aguas-belas"],
    "paracuru": ["paracuru"],
    "combo-paracuru": ["paracuru"],
    "beach-park": ["beach-park"],
    "lagoa-encantada": ["lagoa-encantada"],
    "leste-oeste-economy": ["varios-destinos", "jericoacoara", "3-praias"].concat(beaches),
    "leste-oeste-vip": ["varios-destinos", "jericoacoara", "3-praias"].concat(beaches),
    "transfer-jeri-economy": ["jericoacoara"],
    "transfer-jeri-premium": ["jericoacoara"],
    "transfer-jeri-vip": ["jericoacoara"],
    "transfer-jeri-volta": ["jericoacoara"]
  };
  var names = {
    "leste-oeste-economy": ["Jericoacoara + 3 Praias · Economy", "Jericoacoara + 3 Playas · Economy"],
    "leste-oeste-vip": ["Jericoacoara + 3 Praias · VIP com buggy", "Jericoacoara + 3 Playas · VIP con buggy"],
    "combo-lagoinha": ["Lagoinha com buggy, catamarã e pau de arara", "Lagoinha con buggy, catamarán y pau de arara"],
    "combo-paracuru": ["Paracuru com buggy", "Paracuru con buggy"],
    "flexau": ["Flecheiras e Mundaú com catamarã", "Flecheiras y Mundaú con catamarán"]
  };

  function key(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function describe(tour, i18n) {
    var ids = routes[tour.slug];
    var labels = new Map();
    var knownCategories = ["passeios", "pacotes", "privativos", "transfers", "nautico"];
    var category = tour.slug === "beach-park" ? "transfers" : knownCategories.indexOf(tour.category) > -1 ? tour.category : "passeios";
    function label(id) { return places[id][i18n.es ? 1 : 0]; }
    if (ids) {
      ids.filter(function (id) { return id !== "varios-destinos"; }).forEach(function (id) {
        labels.set(id, label(id));
      });
    } else {
      // Nas novas ofertas, o campo Localização aceita destinos separados por +, vírgula ou ponto médio.
      String(tour.location || "").split(/[+,;·↔]/).forEach(function (place) {
        place = place.trim();
        var id = key(place);
        if (!id || (id === "fortaleza" && category === "transfers")) return;
        id = Object.hasOwn(aliases, id) ? aliases[id] : id;
        labels.set(id, Object.hasOwn(places, id) ? label(id) : place);
      });
    }
    var groupId = ids ? ids[0] : labels.size > 1 ? "varios-destinos" : labels.keys().next().value || "";
    var group = Object.hasOwn(places, groupId) ? label(groupId) : labels.get(groupId);
    var stops = Array.from(labels.entries()).filter(function (entry) {
      return entry[0] !== "3-praias" && entry[0] !== "flecheiras-e-mundau";
    }).map(function (entry) { return entry[1]; });
    if (category === "transfers" && groupId === "jericoacoara") stops = ["Fortaleza ↔ Jericoacoara"];
    return {
      places: labels, groupId: groupId, group: group, category: category, stops: stops,
      name: names[tour.slug] ? names[tour.slug][i18n.es ? 1 : 0] : i18n.tr(tour, "name")
    };
  }

  window.MareCatalog = { describe: describe };
})();
