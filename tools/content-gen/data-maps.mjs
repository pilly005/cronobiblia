// 10 journey maps (map-01..map-10)
// Place IDs are per-map prefixed (map-NN-pl-*) to guarantee global uniqueness.
// Route certainty: documented | reconstructed | debated
import { base, SRC } from "./common.mjs";

const R = "original-illustration-needed";

function P(mapId, slug, ancient_name, modern_name, lon, lat, description) {
  return { id: `${mapId}-pl-${slug}`, ancient_name, modern_name, coords: [lon, lat], description };
}
function RT(mapId, slug, name, certainty, polyline, steps) {
  return { id: `${mapId}-rt-${slug}`, name, certainty, polyline, steps };
}
function ST(order, mapId, placeSlug, text, related_ids = []) {
  return { order, place_id: `${mapId}-pl-${placeSlug}`, text, related_ids };
}

export const maps = [
  base("map-01", "El viaje de Abraham", {
    type: "map",
    summary:
      "De Ur de los caldeos a Canaán pasando por Harán: la ruta tradicional del patriarca. El itinerario exacto es reconstruido; las ciudades son reales y están documentadas.",
    era: "era-01",
    places: [
      P("map-01", "ur", "Ur de los caldeos", "Tell el-Muqayyar, Irak", 46.103, 30.962, "Gran ciudad sumeria con el zigurat de Nanna; excavada en 1922–1934."),
      P("map-01", "haran", "Harán", "Harran, Turquía", 39.031, 36.853, "Ciudad caravanera de la alta Mesopotamia, centro del culto lunar."),
      P("map-01", "siquem", "Siquem", "Nablus, Cisjordania", 35.281, 32.221, "Primera parada en Canaán según Génesis 12; ciudad cananea real."),
      P("map-01", "betel", "Betel", "Beitín, Cisjordania", 35.241, 31.928, "Lugar del sueño de la escalera de Jacob."),
      P("map-01", "hebron", "Hebrón", "Hebrón, Cisjordania", 35.105, 31.532, "Donde Abraham compró la cueva de Macpela; ciudad habitada desde la Edad del Bronce."),
      P("map-01", "beerseba", "Beerseba", "Beerseba, Israel", 34.797, 31.253, "Pozo del juramento; límite sur tradicional de la tierra ('de Dan a Beerseba')."),
    ],
    routes: [
      RT("map-01", "abraham", "De Ur a Canaán", "reconstructed",
        [[46.103, 30.962], [42.5, 34.5], [39.031, 36.853], [37.5, 35.0], [36.292, 33.513], [35.281, 32.221], [35.241, 31.928], [35.105, 31.532], [34.797, 31.253]],
        [
          ST(1, "map-01", "ur", "El texto bíblico presenta la partida desde Ur de los caldeos, la metrópoli sumeria del sur de Mesopotamia.", ["evt-001", "evt-007"]),
          ST(2, "map-01", "haran", "La caravana sube por el Éufrates hasta Harán, ciudad de mercaderes donde la familia se establece un tiempo.", ["evt-001"]),
          ST(3, "map-01", "siquem", "Desde Harán, la ruta desciende hacia el sur: Damasco y la entrada a Canaán por Siquem, junto a la encina de Moré.", ["evt-001"]),
          ST(4, "map-01", "betel", "Entre Betel y Hai, Abraham levanta altar; la zona montañosa central será el corazón del futuro Israel.", ["evt-004"]),
          ST(5, "map-01", "hebron", "En Hebrón compra la cueva de Macpela como sepulcro familiar: la única tierra que el texto le atribuye en propiedad.", ["evt-001"]),
          ST(6, "map-01", "beerseba", "El viaje termina en el Neguev, en Beerseba, entre pozos disputados y pactos con los filisteos de la zona.", ["evt-001"]),
        ]),
    ],
    text_alternative:
      "Mapa del viaje tradicional de Abraham: comienza en Ur, en el sur de Irak actual, sube en dirección noroeste siguiendo el Éufrates hasta Harán, en la actual Turquía. Desde allí gira al suroeste, pasa por la región de Damasco y entra en Canaán por el norte, llegando a Siquem. Continúa hacia el sur por la cordillera central pasando por Betel y Hebrón, y termina en Beerseba, en el límite del desierto del Neguev. La ruta es una reconstrucción basada en el relato bíblico; las ciudades mencionadas están documentadas arqueológicamente.",
    certainty: "disputed", confidence: "medium",
    sources: [SRC.RVR09, SRC.AYBD, SRC.BRITISH_MUSEUM],
    image_rights: R, tier: "free",
  }),

  base("map-02", "Rutas propuestas del Éxodo", {
    type: "map",
    summary:
      "Dos grandes hipótesis sobre la ruta de la salida de Egipto: la ruta norte, directa por la costa, y la ruta sur, por el Sinaí. Ambas son debatidas; el mapa muestra lo que cada una propone.",
    era: "era-02",
    places: [
      P("map-02", "piramses", "Pi-Ramsés", "Qantir, Egipto", 31.835, 30.785, "Capital del delta en época ramésida; punto de partida tradicional del Éxodo."),
      P("map-02", "marjuncos", "Mar de los Juncos", "Zona del istmo de Suez", 32.55, 29.9, "El 'yam suf' hebreo; su localización exacta es debatida."),
      P("map-02", "sinai", "Monte Sinaí", "Yebel Musa, Egipto (tradicional)", 33.974, 28.539, "Identificación tradicional desde el siglo IV d. C.; otras propuestas existen."),
      P("map-02", "cades", "Cades-Barnea", "Ain Qedeis, Neguev", 34.475, 30.65, "Oasis donde el pueblo acampó largamente según Números; hay restos de fortaleza."),
      P("map-02", "nebo", "Monte Nebo", "Jordania", 35.725, 31.768, "Desde donde Moisés contempló la tierra; memorial cristiano antiguo."),
      P("map-02", "moab", "Llanuras de Moab", "Valle del Jordán oriental", 35.55, 31.9, "Campamento final antes del cruce del Jordán según el texto bíblico."),
    ],
    routes: [
      RT("map-02", "ruta-norte", "Hipótesis de la ruta norte", "debated",
        [[31.835, 30.785], [32.3, 31.0], [33.5, 31.2], [34.5, 31.4], [35.2, 31.9]],
        [
          ST(1, "map-02", "piramses", "El punto de partida común a casi todas las hipótesis: el delta oriental del Nilo.", ["evt-016"]),
          ST(2, "map-02", "marjuncos", "La ruta norte cruza las lagunas del istmo de Suez y sigue la 'vía del mar' costera, guarnecida por fortalezas egipcias.", ["evt-017"]),
          ST(3, "map-02", "cades", "Algunos modelos llevan al grupo directamente a Cades-Barnea, evitando el sur del Sinaí.", ["evt-019"]),
        ]),
      RT("map-02", "ruta-sur", "Hipótesis de la ruta sur (tradicional)", "debated",
        [[31.835, 30.785], [32.55, 29.9], [33.4, 29.0], [33.974, 28.539], [34.3, 29.5], [34.475, 30.65], [35.2, 31.2], [35.725, 31.768], [35.55, 31.9]],
        [
          ST(1, "map-02", "piramses", "Salida del delta oriental hacia el sureste, bordeando el golfo de Suez.", ["evt-016"]),
          ST(2, "map-02", "marjuncos", "El cruce de las aguas: el texto hebreo dice 'mar de los Juncos', quizá una laguna del istmo.", ["evt-017"]),
          ST(3, "map-02", "sinai", "El monte de la Ley según la tradición bizantina; Santa Catalina se alza a sus pies desde el siglo VI.", ["evt-018"]),
          ST(4, "map-02", "cades", "Tras el Sinaí, el largo campamento en Cades-Barnea, base de los exploradores.", ["evt-019"]),
          ST(5, "map-02", "nebo", "Rodeando Edom y Moab, la llegada a las llanuras del Jordán y la muerte de Moisés en el Nebo.", ["evt-020"]),
          ST(6, "map-02", "moab", "El campamento final frente a Jericó, donde el texto sitúa los discursos del Deuteronomio.", ["evt-020"]),
        ]),
    ],
    text_alternative:
      "Mapa con dos rutas hipotéticas del Éxodo desde el delta del Nilo. La ruta norte avanza hacia el noreste por la costa mediterránea, pasando por la zona del istmo de Suez hasta Canaán por el sur. La ruta sur desciende hacia el sur por el istmo hasta el macizo del Sinaí tradicional (Yebel Musa), luego gira al noreste hacia el oasis de Cades-Barnea, bordea Edom y Moab por el este y termina en las llanuras de Moab frente a Jericó, pasando por el monte Nebo. Ambas rutas están marcadas como debatidas: ninguna está confirmada por la arqueología.",
    certainty: "disputed", confidence: "low",
    sources: [SRC.RVR09, SRC.AYBD, SRC.ASOR],
    image_rights: R, tier: "free",
  }),

  base("map-03", "El asentamiento de las tribus", {
    type: "map",
    summary:
      "Los territorios tradicionales de las doce tribus tras la llegada a Canaán: Judá en el sur montañoso, Efraín y Manasés en el centro, y las tribus del norte en Galilea. Los límites son aproximados y debatidos.",
    era: "era-02",
    places: [
      P("map-03", "dan", "Dan", "Tel Dan, Israel", 35.652, 33.249, "Extremo norte tradicional ('de Dan a Beerseba'); santuario del reino del norte."),
      P("map-03", "hazor", "Hazor", "Tel Hazor, Israel", 35.671, 33.018, "Gran ciudad cananea; centro del territorio de Neftalí."),
      P("map-03", "jezreel", "Jezreel", "Valle de Jezreel", 35.33, 32.56, "Fértil valle asignado a Isacar; escenario de batallas durante siglos."),
      P("map-03", "megido", "Megido", "Tel Megido, Israel", 35.184, 32.585, "En territorio de Manasés; fortaleza que controlaba la vía Maris."),
      P("map-03", "siquem", "Siquem", "Nablus, Cisjordania", 35.281, 32.221, "Corazón del territorio de Efraín; primera capital del reino del norte."),
      P("map-03", "betel", "Betel", "Beitín, Cisjordania", 35.241, 31.928, "En el límite entre Efraín y Benjamín; santuario real del norte."),
      P("map-03", "hebron", "Hebrón", "Hebrón, Cisjordania", 35.105, 31.532, "Centro del territorio de Judá antes de la conquista de Jerusalén."),
      P("map-03", "beerseba", "Beerseba", "Beerseba, Israel", 34.797, 31.253, "Territorio de Simeón, absorbido luego por Judá; extremo sur tradicional."),
      P("map-03", "guilgal", "Guilgal", "Valle del Jordán", 35.46, 31.86, "Primer campamento al oeste del Jordán según el libro de Josué."),
    ],
    routes: [
      RT("map-03", "entrada", "Entrada tradicional desde el este", "reconstructed",
        [[35.55, 31.9], [35.46, 31.86], [35.444, 31.874], [35.281, 32.221], [35.105, 31.532]],
        [
          ST(1, "map-03", "guilgal", "El texto bíblico presenta el cruce del Jordán y el campamento base en Guilgal.", ["evt-020"]),
          ST(2, "map-03", "siquem", "Las tribus centrales (Efraín, Manasés) ocupan la cordillera entre Siquem y Betel.", ["evt-011"]),
          ST(3, "map-03", "hebron", "Judá se asienta en la montaña del sur, con Hebrón como centro.", ["evt-011"]),
          ST(4, "map-03", "dan", "La tribu de Dan migra al extremo norte, dando nombre a la ciudad de Dan.", ["evt-011"]),
          ST(5, "map-03", "beerseba", "Simeón queda en el Neguev, rodeado por Judá, que acabará absorbiéndolo.", ["evt-011"]),
        ]),
    ],
    text_alternative:
      "Mapa de Canaán con los territorios tribales tradicionales: en el extremo norte, Dan junto a las fuentes del Jordán; en la alta Galilea, Neftalí con centro en Hazor; en el centro-norte, Isacar en el valle de Jezreel y Manasés en torno a Megido; en la cordillera central, Efraín con centro en Siquem y Benjamín en torno a Betel; en el sur montañoso, Judá con centro en Hebrón; y en el Neguev, Simeón en torno a Beerseba. Las tribus de la Transjordania (Rubén, Gad y media Manasés) quedan al este del Jordán. Los límites son aproximados y reflejan la geografía del texto bíblico, no fronteras excavadas.",
    certainty: "disputed", confidence: "low",
    sources: [SRC.RVR09, SRC.AYBD, SRC.IAA],
    image_rights: R, tier: "premium",
  }),

  base("map-04", "David y la monarquía unida", {
    type: "map",
    summary:
      "De pastor en Belén a rey en Jerusalén: los lugares clave del ascenso de David y la extensión aproximada del reino unido, con las campañas contra filisteos y amonitas.",
    era: "era-03",
    places: [
      P("map-04", "belen", "Belén", "Belén, Cisjordania", 35.209, 31.705, "Aldea natal de David; allí lo unge Samuel según el texto."),
      P("map-04", "elah", "Valle de Elah", "Sefela, Israel", 34.99, 31.69, "Escenario tradicional del duelo con Goliat, entre Soco y Azeca."),
      P("map-04", "hebron", "Hebrón", "Hebrón, Cisjordania", 35.105, 31.532, "Primera capital de David: siete años rey de Judá."),
      P("map-04", "jerusalen", "Jerusalén", "Jerusalén", 35.213, 31.768, "Capital unificada; traslado del arca y planes del Templo."),
      P("map-04", "raba", "Rabá", "Amán, Jordania", 35.934, 31.954, "Capital amonita tomada por Joab; escenario del episodio de Urías."),
      P("map-04", "gat", "Gat", "Tell es-Safi, Israel", 34.85, 31.7, "Ciudad filistea donde David se refugió de Saúl."),
    ],
    routes: [
      RT("map-04", "ascenso", "El ascenso de David", "reconstructed",
        [[35.209, 31.705], [34.99, 31.69], [34.85, 31.7], [35.105, 31.532], [35.213, 31.768], [35.934, 31.954]],
        [
          ST(1, "map-04", "belen", "El texto bíblico presenta a David como el menor de los hijos de Isaí, pastor en Belén.", ["evt-028"]),
          ST(2, "map-04", "elah", "La victoria sobre Goliat en el valle de Elah lo catapulta a la corte de Saúl.", ["evt-028"]),
          ST(3, "map-04", "gat", "Perseguido por Saúl, David se refugia entre los filisteos de Gat.", ["evt-027"]),
          ST(4, "map-04", "hebron", "Muerto Saúl, David es coronado en Hebrón, rey primero solo de Judá.", ["evt-029"]),
          ST(5, "map-04", "jerusalen", "La toma de la fortaleza jebusea y su conversión en capital neutral del reino unido.", ["evt-029", "evt-030"]),
          ST(6, "map-04", "raba", "Las campañas al este del Jordán extienden el reino hasta el territorio amonita.", ["evt-039"]),
        ]),
    ],
    text_alternative:
      "Mapa del reino de David: comienza en Belén, al sur de Jerusalén, lugar de su nacimiento. Hacia el oeste, en la Sefela, el valle de Elah, escenario del duelo con Goliat. Más al oeste, Gat, ciudad filistea de refugio. Al sur, Hebrón, primera capital. En el centro, Jerusalén, capital definitiva tras su conquista. Hacia el este, al otro lado del Jordán, Rabá (la actual Amán), capital amonita tomada en campaña. La extensión exacta del reino es debatida entre los especialistas.",
    certainty: "disputed", confidence: "medium",
    sources: [SRC.RVR09, SRC.AYBD, SRC.IAA],
    image_rights: R, tier: "premium",
  }),

  base("map-05", "La expansión asiria y la caída del norte", {
    type: "map",
    summary:
      "El avance del imperio asirio hacia el Levante en el siglo VIII a. C.: de Nínive a Samaria, Laquis y las puertas de Jerusalén. Las campañas están documentadas en anales asirios.",
    era: "era-04",
    places: [
      P("map-05", "ninive", "Nínive", "Mosul, Irak", 43.154, 36.359, "Capital asiria; sus palacios y relieves narran las campañas del oeste."),
      P("map-05", "damasco", "Damasco", "Damasco, Siria", 36.292, 33.513, "Reino arameo sometido por Asiria; antes, rival de Israel."),
      P("map-05", "samaria", "Samaria", "Sebaste, Cisjordania", 35.196, 32.276, "Capital del reino del norte; cayó en el 722 a. C. tras tres años de asedio."),
      P("map-05", "laquis", "Laquis", "Tel Laquis, Israel", 34.846, 31.703, "Segunda ciudad de Judá; su asedio del 701 a. C. se representa en Nínive."),
      P("map-05", "jerusalen", "Jerusalén", "Jerusalén", 35.213, 31.768, "Sitiada por Senaquerib en el 701 a. C.; la ciudad no cayó."),
    ],
    routes: [
      RT("map-05", "campanas", "Campañas asirias al Levante (744–701 a. C.)", "documented",
        [[43.154, 36.359], [40.0, 36.5], [36.292, 33.513], [35.196, 32.276], [34.846, 31.703], [35.213, 31.768]],
        [
          ST(1, "map-05", "ninive", "Desde Nínive parten las campañas de Tiglat-pileser III, Salmanasar V, Sargón II y Senaquerib.", ["evt-047"]),
          ST(2, "map-05", "damasco", "Damasco cae en el 732 a. C.; el Levante queda abierto al avance asirio.", ["evt-044"]),
          ST(3, "map-05", "samaria", "Samaria resiste tres años y cae en el 722 a. C.: fin del reino del norte y deportaciones.", ["evt-047", "evt-045"]),
          ST(4, "map-05", "laquis", "En el 701 a. C., Senaquerib toma Laquis; los relieves de su palacio muestran el asedio con detalle.", ["evt-048"]),
          ST(5, "map-05", "jerusalen", "El asedio de Jerusalén se levanta sin que la ciudad caiga: ambas fuentes, bíblica y asiria, coinciden en el hecho.", ["evt-048", "evt-049"]),
        ]),
    ],
    text_alternative:
      "Mapa de la expansión asiria: desde Nínive, en el norte del actual Irak, la ruta de las campañas desciende hacia el oeste cruzando el Éufrates, pasa por Damasco en Siria, entra en el reino de Israel y llega a Samaria, su capital, destruida en el 722 a. C. Desde allí continúa al sur hacia Judá: Laquis, tomada en el 701 a. C., y finalmente Jerusalén, sitiada pero no conquistada. Las campañas están documentadas en los anales reales asirios y en relieves de palacio.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.BRITISH_MUSEUM, SRC.RVR09, SRC.OUP],
    image_rights: R, tier: "premium",
  }),

  base("map-06", "Exilio a Babilonia y retorno", {
    type: "map",
    summary:
      "El camino del destierro (597 y 586 a. C.) y del regreso bajo Ciro (538 a. C.): de Jerusalén a Babilonia por el Éufrates, y de vuelta por la media luna fértil. Las deportaciones están documentadas en fuentes babilónicas.",
    era: "era-05",
    places: [
      P("map-06", "jerusalen", "Jerusalén", "Jerusalén", 35.213, 31.768, "Destruida en el 586 a. C.; reconstruida tras el retorno."),
      P("map-06", "ribla", "Ribla", "Siria", 36.55, 34.42, "Cuartel de Nabucodonosor; allí Sedequías fue juzgado según el texto bíblico."),
      P("map-06", "quebar", "Río Quebar", "Sur de Irak", 44.0, 32.0, "Canal babilónico junto al que se asentaron exiliados como Ezequiel (localización aproximada)."),
      P("map-06", "babilonia", "Babilonia", "Irak", 44.421, 32.536, "Capital del imperio; puerta de Ishtar y zigurat Etemenanki."),
      P("map-06", "susa", "Susa", "Irán", 48.244, 32.184, "Capital persa de invierno; escenario del libro de Ester y base de Nehemías."),
    ],
    routes: [
      RT("map-06", "deportacion", "Las deportaciones (597 y 586 a. C.)", "documented",
        [[35.213, 31.768], [36.55, 34.42], [38.5, 35.5], [41.0, 34.5], [44.421, 32.536]],
        [
          ST(1, "map-06", "jerusalen", "Tras cada rebelión, Babilonia deporta a la élite: la corte, los artesanos y los sacerdotes.", ["evt-053", "evt-054"]),
          ST(2, "map-06", "ribla", "El texto bíblico presenta Ribla como el cuartel general babilónico en Siria.", ["evt-054"]),
          ST(3, "map-06", "quebar", "Los exiliados se asientan en comunidades agrícolas junto a los canales, como Tel Abib.", ["evt-056"]),
          ST(4, "map-06", "babilonia", "La capital imperial: allí viven Ezequiel, Daniel según la tradición, y la familia real de Joaquín.", ["evt-057", "evt-058"]),
        ]),
      RT("map-06", "retorno", "El retorno bajo Persia (desde 538 a. C.)", "reconstructed",
        [[44.421, 32.536], [41.0, 34.5], [38.5, 35.5], [36.292, 33.513], [35.213, 31.768]],
        [
          ST(1, "map-06", "babilonia", "El edicto de Ciro autoriza el regreso; no todos vuelven: muchos permanecen en Babilonia.", ["evt-059", "evt-060"]),
          ST(2, "map-06", "susa", "Siglos después, Susa será la corte desde la que Nehemías pida permiso para reconstruir los muros.", ["evt-064", "evt-062"]),
          ST(3, "map-06", "jerusalen", "Los retornados reconstruyen el altar, el Templo (516 a. C.) y finalmente los muros (445 a. C.).", ["evt-061", "evt-064"]),
        ]),
    ],
    text_alternative:
      "Mapa del exilio y el retorno: la ruta de la deportación parte de Jerusalén hacia el norte hasta Ribla, en Siria, y desde allí sigue el curso del Éufrates hacia el sureste hasta Babilonia, pasando por la zona del río Quebar donde se asentaron comunidades de exiliados. La ruta del retorno invierte el camino: de Babilonia hacia el noroeste por la media luna fértil, pasando por Siria hasta Jerusalén. Susa, en el actual Irán, aparece como capital persa vinculada a Ester y Nehemías. Las deportaciones están documentadas en crónicas babilónicas; el itinerario exacto del retorno es reconstruido.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.BRITISH_MUSEUM, SRC.RVR09, SRC.OUP],
    image_rights: R, tier: "premium",
  }),

  base("map-07", "Judea y Galilea en tiempos de Jesús", {
    type: "map",
    summary:
      "La geografía política del siglo I: Galilea bajo Herodes Antipas, Judea bajo prefectos romanos, y las ciudades que marcaron la vida de Jesús. Incluye la ruta típica de peregrinación galilea a Jerusalén.",
    era: "era-06",
    places: [
      P("map-07", "nazaret", "Nazaret", "Nazaret, Israel", 35.293, 32.703, "Aldea galilea donde creció Jesús; sinagoga del siglo I en debate."),
      P("map-07", "cafarnaum", "Cafarnaúm", "Israel", 35.573, 32.88, "Base del ministerio; sinagoga y la 'casa de Pedro' excavadas."),
      P("map-07", "seforis", "Séforis", "Israel", 35.28, 32.75, "Capital galilea de Antipas; ciudad helenizada que los evangelios no mencionan."),
      P("map-07", "tiberiades", "Tiberíades", "Israel", 35.539, 32.793, "Nueva capital de Antipas a orillas del lago; tampoco aparece en los evangelios."),
      P("map-07", "jerico", "Jericó", "Cisjordania", 35.444, 31.874, "Oasis del valle del Jordán; palacios herodianos excavados."),
      P("map-07", "jerusalen", "Jerusalén", "Jerusalén", 35.213, 31.768, "Centro religioso y destino de peregrinación; Templo de Herodes."),
      P("map-07", "belen", "Belén", "Cisjordania", 35.209, 31.705, "Lugar del nacimiento según Mateo y Lucas."),
      P("map-07", "cesarea", "Cesarea Marítima", "Israel", 34.892, 32.498, "Capital administrativa romana; sede de Pilato y Cornelio."),
    ],
    routes: [
      RT("map-07", "peregrinacion", "Ruta de peregrinación galilea", "reconstructed",
        [[35.293, 32.703], [35.28, 32.2], [35.444, 31.874], [35.213, 31.768]],
        [
          ST(1, "map-07", "nazaret", "Los galileos solían evitar Samaria y bajaban por el valle del Jordán.", ["evt-073"]),
          ST(2, "map-07", "jerico", "Jericó, el oasis, era la última parada antes de la subida a Jerusalén.", ["evt-075"]),
          ST(3, "map-07", "jerusalen", "La subida a Jerusalén para las fiestas reunía decenas de miles de peregrinos.", ["evt-075"]),
        ]),
    ],
    text_alternative:
      "Mapa de la Palestina del siglo I: en el norte, Galilea, con Nazaret en las colinas, Cafarnaúm a orillas del mar de Galilea, y las ciudades herodianas de Séforis y Tiberíades. Hacia el sur, Samaria en el centro, y Judea con Jerusalén como capital religiosa y Belén al sur. En la costa, Cesarea Marítima, sede del gobierno romano. En el valle del Jordán, Jericó, el oasis en la ruta de peregrinación. Una ruta reconstruida muestra el camino habitual de los peregrinos galileos: de Nazaret al valle del Jordán, pasando por Jericó y subiendo a Jerusalén, evitando Samaria.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.IAA, SRC.RVR09, SRC.OUP],
    image_rights: R, tier: "premium",
  }),

  base("map-08", "El ministerio de Jesús", {
    type: "map",
    summary:
      "Los escenarios del ministerio: de Nazaret a Cafarnaúm, las orillas del lago, Cesarea de Filipo y la subida final a Jerusalén. Los lugares principales están identificados y excavados.",
    era: "era-06",
    places: [
      P("map-08", "nazaret", "Nazaret", "Nazaret, Israel", 35.293, 32.703, "Inicio del ministerio según Lucas; rechazo en la sinagoga."),
      P("map-08", "cana", "Caná", "Kafr Kanna, Israel", 35.346, 32.755, "Tradicional lugar del primer milagro, las bodas."),
      P("map-08", "cafarnaum", "Cafarnaúm", "Israel", 35.573, 32.88, "'Su ciudad': base del ministerio galileo."),
      P("map-08", "betsaida", "Betsaida", "Israel", 35.63, 32.91, "Patria de Pedro, Andrés y Felipe; multiplicación de los panes en sus cercanías."),
      P("map-08", "cesarea-filipo", "Cesarea de Filipo", "Banias, Israel", 35.646, 33.248, "La confesión de Pedro; santuario del dios Pan en una cueva."),
      P("map-08", "betania", "Betania", "Al-Azariya, Cisjordania", 35.263, 31.769, "Hogar de Marta, María y Lázaro; punto de partida hacia Jerusalén."),
      P("map-08", "jerusalen", "Jerusalén", "Jerusalén", 35.213, 31.768, "Entrada, última cena, Getsemaní y Gólgota."),
    ],
    routes: [
      RT("map-08", "ministerio", "Itinerario del ministerio", "reconstructed",
        [[35.293, 32.703], [35.346, 32.755], [35.573, 32.88], [35.63, 32.91], [35.646, 33.248], [35.573, 32.88], [35.444, 31.874], [35.263, 31.769], [35.213, 31.768]],
        [
          ST(1, "map-08", "nazaret", "El ministerio comienza en la Galilea natal, con el anuncio en la sinagoga de Nazaret.", ["evt-073"]),
          ST(2, "map-08", "cana", "Caná, en las colinas galileas, escenario tradicional del primer signo.", ["evt-073"]),
          ST(3, "map-08", "cafarnaum", "Cafarnaúm se convierte en base: pesca, sinagoga y la casa de Pedro.", ["evt-073"]),
          ST(4, "map-08", "betsaida", "Las orillas del lago: parábolas, multiplicaciones y caminatas sobre el agua.", ["evt-073"]),
          ST(5, "map-08", "cesarea-filipo", "En el extremo norte, la confesión de Pedro: 'Tú eres el Cristo'.", ["evt-073"]),
          ST(6, "map-08", "betania", "La subida final a Jerusalén pasa por Jericó y Betania, hogar de sus amigos.", ["evt-075"]),
          ST(7, "map-08", "jerusalen", "La última semana: entrada, Templo, cena, Getsemaní y crucifixión.", ["evt-075", "evt-076"]),
        ]),
    ],
    text_alternative:
      "Mapa del ministerio de Jesús en Galilea y Judea: comienza en Nazaret, en las colinas de la baja Galilea, pasa por Caná, se establece en Cafarnaúm a orillas del mar de Galilea, recorre las aldeas del lago como Betsaida, sube al extremo norte hasta Cesarea de Filipo al pie del monte Hermón, regresa al lago, desciende por el valle del Jordán pasando por Jericó, llega a Betania en el monte de los Olivos y entra finalmente en Jerusalén. El itinerario es una reconstrucción basada en los cuatro evangelios; los lugares principales están identificados arqueológicamente.",
    certainty: "consensus", confidence: "medium",
    sources: [SRC.IAA, SRC.RVR09, SRC.AYBD],
    image_rights: R, tier: "premium",
  }),

  base("map-09", "El primer viaje de Pablo", {
    type: "map",
    summary:
      "Hechos 13–14: de Antioquía de Siria a Chipre y el sur de Anatolia, el primer viaje misionero documentado del cristianismo. Las ciudades y rutas están bien atestiguadas.",
    era: "era-07",
    places: [
      P("map-09", "antioquia", "Antioquía de Siria", "Antakya, Turquía", 36.16, 36.203, "Tercera ciudad del imperio; base de la misión a los gentiles."),
      P("map-09", "salamina", "Salamina", "Chipre", 33.902, 35.183, "Puerto oriental de Chipre; primera escala del viaje."),
      P("map-09", "pafos", "Pafos", "Chipre", 32.485, 34.814, "Capital romana de Chipre; encuentro con el procónsul Sergio Paulo."),
      P("map-09", "perge", "Perge", "Turquía", 30.789, 36.962, "Ciudad panfilia; aquí Juan Marcos abandona la expedición."),
      P("map-09", "antioquia-pisidia", "Antioquía de Pisidia", "Turquía", 31.191, 38.308, "Sinagoga donde Pablo predica su gran discurso; expulsión posterior."),
      P("map-09", "iconio", "Iconio", "Konya, Turquía", 32.484, 37.871, "División de la ciudad entre creyentes y opositores."),
      P("map-09", "listra", "Listra", "Turquía", 32.2, 37.67, "Curación del cojo; la multitud los toma por dioses; lapidación de Pablo."),
      P("map-09", "derbe", "Derbe", "Turquía", 33.16, 37.36, "Punto más oriental del viaje; desde aquí regresan por el mismo camino."),
    ],
    routes: [
      RT("map-09", "primer-viaje", "Primer viaje misionero (Hechos 13–14)", "documented",
        [[36.16, 36.203], [35.88, 36.26], [33.902, 35.183], [32.485, 34.814], [30.789, 36.962], [31.191, 38.308], [32.484, 37.871], [32.2, 37.67], [33.16, 37.36], [32.2, 37.67], [32.484, 37.871], [31.191, 38.308], [30.789, 36.962], [33.0, 35.5], [36.16, 36.203]],
        [
          ST(1, "map-09", "antioquia", "La iglesia de Antioquía aparta a Bernabé y Saulo para la obra misionera.", ["evt-082"]),
          ST(2, "map-09", "salamina", "Desembarco en Chipre; predicación en las sinagogas de Salamina.", ["evt-082"]),
          ST(3, "map-09", "pafos", "Ante el procónsul Sergio Paulo; aquí Saulo es llamado por primera vez Pablo.", ["evt-082"]),
          ST(4, "map-09", "perge", "Travesía a Panfilia; Juan Marcos regresa a Jerusalén.", ["evt-082"]),
          ST(5, "map-09", "antioquia-pisidia", "El discurso en la sinagoga: la historia de Israel culminando en Jesús.", ["evt-082"]),
          ST(6, "map-09", "iconio", "Señales y división; huida ante el intento de apedreamiento.", ["evt-082"]),
          ST(7, "map-09", "listra", "De la aclamación como dioses a la lapidación: el viaje toca fondo y se recupera.", ["evt-082"]),
          ST(8, "map-09", "derbe", "Tras Derbe, regresan confirmando las nuevas iglesias y nombrando ancianos.", ["evt-083"]),
        ]),
    ],
    text_alternative:
      "Mapa del primer viaje de Pablo: parte de Antioquía de Siria, en la costa del actual sureste de Turquía, navega a Chipre desembarcando en Salamina al este y cruzando la isla hasta Pafos al oeste. Desde allí navega al sur de Turquía, desembarca en Perge y sube al interior de Anatolia: Antioquía de Pisidia, Iconio, Listra y Derbe, el punto más oriental. El regreso sigue el mismo camino en sentido inverso hasta la costa y de vuelta a Antioquía de Siria. El itinerario está documentado en Hechos 13–14 y las ciudades están identificadas arqueológicamente.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.RVR09, SRC.AYBD, SRC.OUP],
    image_rights: R, tier: "premium",
  }),

  base("map-10", "Los últimos viajes de Pablo hasta Roma", {
    type: "map",
    summary:
      "Del tercer viaje misionero al viaje como prisionero: Éfeso, Macedonia, Grecia, Jerusalén y la travesía a Roma con el naufragio en Malta. El relato de Hechos 27 es famoso por su precisión náutica.",
    era: "era-07",
    places: [
      P("map-10", "efeso", "Éfeso", "Turquía", 27.334, 37.941, "Tercera ciudad del imperio; tres años de ministerio y el tumulto de Demetrio."),
      P("map-10", "filipos", "Filipos", "Grecia", 24.415, 40.983, "Primera iglesia en Europa; la carta a los Filipenses."),
      P("map-10", "tesalonica", "Tesalónica", "Grecia", 22.944, 40.64, "Capital de Macedonia; dos cartas conservadas."),
      P("map-10", "atenas", "Atenas", "Grecia", 23.728, 37.984, "El discurso en el Areópago ante filósofos estoicos y epicúreos."),
      P("map-10", "corinto", "Corinto", "Grecia", 22.957, 37.906, "Dieciocho meses de ministerio; las cartas a los Corintios y a los Romanos."),
      P("map-10", "jerusalen", "Jerusalén", "Jerusalén", 35.213, 31.768, "Arresto en el Templo; apelación al César."),
      P("map-10", "cesarea", "Cesarea Marítima", "Israel", 34.892, 32.498, "Dos años preso; defensa ante Félix, Festo y Agripa."),
      P("map-10", "malta", "Malta", "Malta", 14.375, 35.899, "El naufragio; tres meses en la isla según Hechos 28."),
      P("map-10", "puteoli", "Puteoli", "Pozzuoli, Italia", 14.12, 40.823, "Principal puerto de Roma; desembarco final."),
      P("map-10", "roma", "Roma", "Italia", 12.496, 41.903, "Capital del imperio; dos años de arresto domiciliario predicando."),
    ],
    routes: [
      RT("map-10", "tercer-viaje", "Tercer viaje y regreso a Jerusalén", "documented",
        [[27.334, 37.941], [24.415, 40.983], [22.944, 40.64], [23.728, 37.984], [22.957, 37.906], [24.415, 40.983], [27.334, 37.941], [33.0, 35.0], [35.213, 31.768]],
        [
          ST(1, "map-10", "efeso", "Tres años en Éfeso: la escuela de Tiranno y el conflicto con los plateros de Artemisa.", ["evt-085", "evt-088"]),
          ST(2, "map-10", "filipos", "Recorrido por Macedonia recogiendo la ofrenda para Jerusalén.", ["evt-086"]),
          ST(3, "map-10", "corinto", "Tres meses en Grecia; desde Corinto escribe la carta a los Romanos.", ["evt-084", "evt-088"]),
          ST(4, "map-10", "jerusalen", "El regreso por mar termina en Jerusalén, donde es arrestado en el Templo.", ["evt-086"]),
        ]),
      RT("map-10", "viaje-roma", "Viaje como prisionero a Roma (Hechos 27–28)", "documented",
        [[34.892, 32.498], [33.0, 34.5], [30.0, 36.0], [24.809, 35.24], [14.375, 35.899], [15.293, 37.075], [15.651, 37.913], [14.12, 40.823], [12.496, 41.903]],
        [
          ST(1, "map-10", "cesarea", "Embarque en Cesarea como preso del centurión Julio, con apelación al César.", ["evt-086"]),
          ST(2, "map-10", "malta", "Catorce noches a la deriva y naufragio en Malta; la tripulación se salva.", ["evt-086"]),
          ST(3, "map-10", "puteoli", "Tras invernar en Malta, navegación a Siracusa, Regio y Puteoli.", ["evt-086"]),
          ST(4, "map-10", "roma", "Por la vía Apia hasta Roma: dos años de arresto domiciliario 'predicando el reino'.", ["evt-086", "evt-087"]),
        ]),
    ],
    text_alternative:
      "Mapa de los últimos viajes de Pablo en dos rutas. La primera, el tercer viaje: de Éfeso en la costa turca a Macedonia (Filipos, Tesalónica), luego al sur de Grecia (Atenas, Corinto), regreso por Macedonia y Éfeso, y travesía marítima hasta Jerusalén. La segunda, como prisionero: embarque en Cesarea Marítima, navegación por el Mediterráneo oriental bordeando Creta, naufragio en Malta tras catorce noches a la deriva, escala en Siracusa y Regio, desembarco en Puteoli y llegada por tierra a Roma. Hechos 27–28 narra la travesía con detalle náutico preciso; las escalas están identificadas.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.RVR09, SRC.AYBD, SRC.OUP],
    image_rights: R, tier: "premium",
  }),
];
