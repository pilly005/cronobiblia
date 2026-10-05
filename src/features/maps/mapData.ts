/**
 * Map data for Track C (maps feature).
 *
 * Hand-built STYLIZED SVG geometry of the ancient Mediterranean / Near East.
 * Schematic coastlines — NO modern political borders, no external tiles, no
 * network dependency. All coordinates live in the 800x520 viewBox space used
 * by BaseMap.
 *
 * Certainty labels per spec §3: "documented" | "reconstructed" | "debated".
 * Copy is Spanish-first and denomination-neutral; debated routes say so
 * plainly instead of presenting one option as certain.
 */

export type RouteCertainty = "documented" | "reconstructed" | "debated";

export const CERTAINTY_LABEL: Record<RouteCertainty, string> = {
  documented: "Documentada",
  reconstructed: "Reconstruida",
  debated: "Debatida",
};

export const CERTAINTY_DESCRIPTION: Record<RouteCertainty, string> = {
  documented:
    "Los lugares y el recorrido general cuentan con respaldo arqueológico o textual sólido.",
  reconstructed:
    "Reconstrucción probable a partir de las fuentes disponibles; algunos tramos son interpretación.",
  debated:
    "La fecha es debatida y se han propuesto varias rutas; esta es una interpretación común, no un hecho establecido.",
};

export interface MapPlace {
  id: string;
  /** Ancient name shown on the map. */
  ancient: string;
  /** Modern name / location shown on the place card, when relevant. */
  modern?: string;
  x: number;
  y: number;
  note?: string;
}

export interface MapStep {
  placeId: string;
  title: string;
  narration: string;
  reference?: string;
}

export interface JourneyMap {
  id: string;
  title: string;
  subtitle: string;
  era: string;
  certainty: RouteCertainty;
  isFree: boolean;
  summary: string;
  /** Polyline points in viewBox coordinates. */
  path: Array<[number, number]>;
  places: MapPlace[];
  steps: MapStep[];
}

function place(
  id: string,
  ancient: string,
  modern: string | undefined,
  x: number,
  y: number,
  note?: string,
): MapPlace {
  return { id, ancient, modern, x, y, note };
}

export const JOURNEY_MAPS: JourneyMap[] = [
  {
    id: "viaje-abraham",
    title: "El viaje de Abraham",
    subtitle: "De Ur a Canaán",
    era: "Orígenes y patriarcas",
    certainty: "reconstructed",
    isFree: true,
    summary:
      "El texto bíblico presenta el viaje de Abraham desde Ur, en Mesopotamia, hasta Canaán, pasando por Harán. La ruta exacta es una reconstrucción a partir del relato.",
    path: [
      [585, 400],
      [578, 330],
      [562, 262],
      [540, 200],
      [528, 232],
      [505, 262],
      [502, 290],
      [488, 312],
      [470, 345],
      [488, 312],
      [502, 290],
    ],
    places: [
      place("ur", "Ur", "sur de Irak", 585, 400, "Ciudad de origen según el relato de Génesis."),
      place("haran", "Harán", "sureste de Turquía", 540, 200, "Escala del viaje; el texto la sitúa en la ruta hacia Canaán."),
      place("siquem", "Siquem", "cerca de Nablus", 505, 262),
      place("hebron", "Hebrón", "Cisjordania", 502, 290, "El texto la presenta como lugar de residencia de los patriarcas."),
      place("egipto", "Egipto", "noreste de Egipto", 470, 345, "Estancia breve durante una hambruna, según Génesis 12."),
    ],
    steps: [
      {
        placeId: "ur",
        title: "Ur de los caldeos",
        narration:
          "El texto bíblico presenta a Abraham partiendo de Ur, una ciudad de la baja Mesopotamia. La arqueología confirma que Ur fue una ciudad importante en el segundo milenio a. C.",
        reference: "Génesis 11,31",
      },
      {
        placeId: "haran",
        title: "Harán",
        narration:
          "La familia se establece en Harán, en la ruta comercial que unía Mesopotamia con el Levante. Una interpretación común sitúa aquí una larga escala antes de seguir a Canaán.",
        reference: "Génesis 11,31-32",
      },
      {
        placeId: "siquem",
        title: "Siquem, en Canaán",
        narration:
          "El relato sitúa la llegada a Siquem, en la región montañosa central. La fecha de estos acontecimientos es debatida entre los especialistas.",
        reference: "Génesis 12,6",
      },
      {
        placeId: "egipto",
        title: "Bajada a Egipto",
        narration:
          "Ante una hambruna, el texto describe un viaje a Egipto y el regreso. Este tramo del relato no cuenta con confirmación externa directa.",
        reference: "Génesis 12,10-20",
      },
      {
        placeId: "hebron",
        title: "Hebrón",
        narration:
          "El relato cierra el ciclo con Abraham establecido en la región de Hebrón. La ruta completa es una reconstrucción probable, no un itinerario documentado paso a paso.",
        reference: "Génesis 13,18",
      },
    ],
  },
  {
    id: "rutas-exodo",
    title: "Rutas propuestas del éxodo",
    subtitle: "Del delta del Nilo a Canaán",
    era: "Éxodo y asentamiento",
    certainty: "debated",
    isFree: true,
    summary:
      "La fecha es debatida y existen varias rutas propuestas (norte, central y sur). Este mapa muestra la ruta sur tradicional como una interpretación común, sin presentarla como la única opción.",
    path: [
      [475, 318],
      [482, 338],
      [466, 362],
      [492, 380],
      [498, 348],
      [496, 322],
      [508, 300],
      [508, 275],
    ],
    places: [
      place("rameses", "Ramesés", "delta del Nilo", 475, 318, "Punto de partida según el relato de Éxodo 12."),
      place("mar-rojo", "Mar Rojo", "golfo de Suez", 466, 362, "El cruce del mar es uno de los puntos más debatidos: su ubicación exacta no tiene consenso."),
      place("sinai", "Monte Sinaí", "península del Sinaí", 492, 380, "La identificación tradicional; otras propuestas lo sitúan en distintos puntos."),
      place("cades", "Cades-barnea", "sur del Néguev", 496, 322, "Campamento prolongado según el relato de Números."),
      place("jerico", "Jericó", "valle del Jordán", 508, 275),
    ],
    steps: [
      {
        placeId: "rameses",
        title: "Salida del delta",
        narration:
          "El texto bíblico presenta la salida desde la región de Ramesés, en el delta oriental del Nilo. La fecha es debatida: las propuestas principales se reparten entre los siglos XV y XIII a. C.",
        reference: "Éxodo 12,37",
      },
      {
        placeId: "mar-rojo",
        title: "El cruce del mar",
        narration:
          "El relato describe el cruce de un cuerpo de agua («mar de juncos»). No existe consenso sobre su ubicación exacta, y varias rutas propuestas difieren precisamente en este punto.",
        reference: "Éxodo 14",
      },
      {
        placeId: "sinai",
        title: "El monte Sinaí",
        narration:
          "La tradición identifica el monte con la zona sur de la península del Sinaí. La evidencia externa indica actividad minera egipcia en la península, pero no confirma el itinerario del relato.",
        reference: "Éxodo 19",
      },
      {
        placeId: "cades",
        title: "Cades-barnea",
        narration:
          "El texto sitúa aquí una estancia prolongada antes de avanzar hacia Canaán. Es una de las paradas con mejor correspondencia geográfica entre las rutas propuestas.",
        reference: "Números 13-14",
      },
      {
        placeId: "jerico",
        title: "Llegada a Jericó",
        narration:
          "El relato culmina con la entrada desde el este del Jordán. La arqueología de Jericó muestra una larga ocupación, aunque la correlación con el relato sigue siendo objeto de debate académico.",
        reference: "Josué 6",
      },
    ],
  },
  {
    id: "asentamiento-tribus",
    title: "El asentamiento de las tribus",
    subtitle: "Panorama de Canaán",
    era: "Éxodo y asentamiento",
    certainty: "reconstructed",
    isFree: false,
    summary:
      "Panorama del asentamiento israelita en Canaán según el texto bíblico, contrastado con lo que la evidencia externa indica sobre el surgimiento de las aldeas de la región montañosa.",
    path: [
      [508, 275],
      [505, 262],
      [502, 290],
      [505, 283],
      [520, 240],
    ],
    places: [
      place("jerico", "Jericó", "valle del Jordán", 508, 275),
      place("siquem", "Siquem", "cerca de Nablus", 505, 262, "Centro tribal del norte según el relato."),
      place("jerusalen", "Jerusalén", "Jerusalén", 505, 283),
      place("hebron", "Hebrón", "Cisjordania", 502, 290, "Centro tribal del sur según el relato."),
      place("dan", "Dan", "norte de Israel", 520, 240, "Extremo norte del territorio tribal."),
    ],
    steps: [
      {
        placeId: "jerico",
        title: "Desde el Jordán",
        narration:
          "El texto bíblico presenta la entrada desde el este. La evidencia externa indica que, hacia el final de la Edad del Bronce, surgieron numerosas aldeas nuevas en la región montañosa central.",
        reference: "Josué 3-4",
      },
      {
        placeId: "siquem",
        title: "El centro del norte",
        narration:
          "Siquem aparece como punto de reunión tribal. La arqueología confirma su importancia como ciudad de la región en la Edad del Hierro temprana.",
        reference: "Josué 24",
      },
      {
        placeId: "hebron",
        title: "El centro del sur",
        narration:
          "Hebrón se presenta como base en el sur. El proceso de asentamiento fue probablemente gradual, más que una única campaña.",
        reference: "Jueces 1",
      },
      {
        placeId: "jerusalen",
        title: "Jerusalén, aún por tomar",
        narration:
          "Según el texto, Jerusalén quedó fuera del control tribal inicial. Su toma se atribuye al periodo de David.",
        reference: "Jueces 1,21",
      },
      {
        placeId: "dan",
        title: "Hasta Dan",
        narration:
          "La fórmula «desde Dan hasta Beerseba» resume la extensión del territorio. Los límites exactos variaron con el tiempo y no deben leerse como fronteras modernas.",
        reference: "Jueces 20,1",
      },
    ],
  },
  {
    id: "david-monarquia",
    title: "David y la monarquía unida",
    subtitle: "Belén, Hebrón y Jerusalén",
    era: "Monarquía unida",
    certainty: "reconstructed",
    isFree: false,
    summary:
      "El ascenso de David según el texto bíblico: de Belén a Hebrón y a la toma de Jerusalén. La estela de Tel Dan aporta la referencia extrabíblica más antigua a la «casa de David».",
    path: [
      [506, 285],
      [502, 292],
      [505, 283],
      [525, 270],
    ],
    places: [
      place("belen", "Belén", "Cisjordania", 506, 285, "Lugar de origen de David según el relato."),
      place("hebron", "Hebrón", "Cisjordania", 502, 292, "Primera capital de David, según 2 Samuel."),
      place("jerusalen", "Jerusalén", "Jerusalén", 505, 283, "Capital tras su toma; centro político y religioso."),
      place("raba", "Rabá", "Amán, Jordania", 525, 270, "Capital amonita; el texto describe campañas en la región."),
    ],
    steps: [
      {
        placeId: "belen",
        title: "Belén",
        narration:
          "El texto bíblico presenta a David como natural de Belén. La evidencia externa no confirma detalles biográficos, pero la estela de Tel Dan (siglo IX a. C.) menciona la «casa de David».",
        reference: "1 Samuel 16",
      },
      {
        placeId: "hebron",
        title: "Rey en Hebrón",
        narration:
          "Según el relato, David reinó primero en Hebrón sobre Judá. La cronología tradicional sitúa estos hechos hacia el año 1000 a. C., con un margen de debate.",
        reference: "2 Samuel 2,1-4",
      },
      {
        placeId: "jerusalen",
        title: "La toma de Jerusalén",
        narration:
          "El texto atribuye a David la toma de la ciudad y su conversión en capital. La arqueología de la Jerusalén de la Edad del Hierro sigue siendo objeto de intenso debate.",
        reference: "2 Samuel 5,6-9",
      },
      {
        placeId: "raba",
        title: "Campañas al este",
        narration:
          "El relato describe la expansión hacia el territorio amonita. Estas campañas pertenecen al nivel del texto; la evidencia externa confirma el contexto de reinos vecinos en la región.",
        reference: "2 Samuel 10-12",
      },
    ],
  },
  {
    id: "expansion-asiria",
    title: "Expansión asiria y el exilio",
    subtitle: "Nínive, Samaria y Jerusalén",
    era: "Reinos divididos",
    certainty: "documented",
    isFree: false,
    summary:
      "La expansión del imperio neoasirio está ampliamente documentada en inscripciones reales: la caída de Samaria (722 a. C.) y el asedio de Jerusalén (701 a. C.) aparecen tanto en el texto bíblico como en fuentes asirias.",
    path: [
      [620, 230],
      [560, 245],
      [502, 268],
      [498, 292],
      [505, 283],
    ],
    places: [
      place("ninive", "Nínive", "cerca de Mosul, Irak", 620, 230, "Capital del imperio neoasirio."),
      place("samaria", "Samaria", "cerca de Nablus", 502, 268, "Capital del reino del norte; cayó en 722 a. C."),
      place("laquis", "Laquis", "Israel", 498, 292, "Los relieves asirios de Nínive representan su asedio."),
      place("jerusalen", "Jerusalén", "Jerusalén", 505, 283, "Asediada por Senaquerib en 701 a. C.; la ciudad no cayó."),
    ],
    steps: [
      {
        placeId: "ninive",
        title: "El centro del imperio",
        narration:
          "Nínive fue la capital asiria en su apogeo (siglos VIII-VII a. C.). Las inscripciones reales asirias documentan con detalle sus campañas hacia el oeste.",
      },
      {
        placeId: "samaria",
        title: "Caída de Samaria (722 a. C.)",
        narration:
          "La evidencia externa indica la conquista del reino del norte por Asiria y la deportación de parte de su población. El texto bíblico y las fuentes asirias coinciden en lo esencial del hecho.",
        reference: "2 Reyes 17",
      },
      {
        placeId: "laquis",
        title: "Laquis (701 a. C.)",
        narration:
          "Los relieves del palacio de Senaquerib en Nínive representan el asedio de Laquis con gran detalle: una de las correspondencias más claras entre texto y evidencia visual.",
        reference: "2 Reyes 18,13-14",
      },
      {
        placeId: "jerusalen",
        title: "El asedio de Jerusalén",
        narration:
          "En 701 a. C. Senaquerib asedió Jerusalén sin tomarla. La inscripción del prisma de Senaquerib y el texto bíblico ofrecen versiones distintas del desenlace: un caso modelo para comparar fuentes.",
        reference: "2 Reyes 18-19",
      },
    ],
  },
  {
    id: "exilio-babilonia",
    title: "Exilio babilónico y retorno",
    subtitle: "Jerusalén, Babilonia y el regreso",
    era: "Exilio y retorno",
    certainty: "documented",
    isFree: false,
    summary:
      "La deportación a Babilonia (inicios del siglo VI a. C.) y el retorno bajo dominio persa están documentados en crónicas babilónicas, el Cilindro de Ciro y tablillas administrativas.",
    path: [
      [505, 283],
      [535, 245],
      [600, 330],
      [655, 345],
      [560, 300],
      [505, 283],
    ],
    places: [
      place("jerusalen", "Jerusalén", "Jerusalén", 505, 283, "Destruida por Nabucodonosor II hacia 586 a. C."),
      place("ribla", "Ribla", "Siria", 535, 245, "Cuartel babilónico mencionado en el relato."),
      place("babilonia", "Babilonia", "cerca de Hilla, Irak", 600, 330, "Capital del imperio neobabilónico; destino del exilio."),
      place("susa", "Susa", "Irán", 655, 345, "Capital administrativa persa; contexto del retorno."),
    ],
    steps: [
      {
        placeId: "jerusalen",
        title: "La caída de Jerusalén",
        narration:
          "Las crónicas babilónicas confirman la toma de Jerusalén por Nabucodonosor II a inicios del siglo VI a. C. y la deportación de parte de la población.",
        reference: "2 Reyes 25",
      },
      {
        placeId: "babilonia",
        title: "La vida en Babilonia",
        narration:
          "Tablillas administrativas (como las de Al-Yahudu) muestran a los deportados integrados en la economía babilónica: arriendan tierras y participan en el comercio.",
      },
      {
        placeId: "susa",
        title: "El giro persa",
        narration:
          "Ciro el Grande tomó Babilonia en 539 a. C. El Cilindro de Ciro ilustra la política persa de permitir el regreso de poblaciones deportadas y la restauración de sus cultos.",
      },
      {
        placeId: "jerusalen",
        title: "El retorno",
        narration:
          "El texto bíblico presenta el regreso y la reconstrucción del Templo. La evidencia externa confirma el marco persa; los detalles del retorno pertenecen al nivel del texto.",
        reference: "Esdras 1",
      },
    ],
  },
  {
    id: "judea-galilea",
    title: "Judea y Galilea en tiempos de Jesús",
    subtitle: "El mundo del siglo I",
    era: "Mundo de Jesús",
    certainty: "documented",
    isFree: false,
    summary:
      "Panorama geográfico de la Palestina del siglo I bajo Roma: Galilea, Samaria, Judea y las ciudades de la Decápolis. Los lugares principales están documentados por la arqueología y las fuentes de la época.",
    path: [
      [500, 272],
      [508, 268],
      [515, 262],
      [503, 266],
      [505, 285],
    ],
    places: [
      place("cesarea", "Cesarea Marítima", "costa de Israel", 500, 272, "Capital administrativa romana; sede del prefecto."),
      place("nazaret", "Nazaret", "Galilea", 508, 268, "Aldea galilea; la arqueología confirma una ocupación modesta en el siglo I."),
      place("cafarnaum", "Cafarnaúm", "mar de Galilea", 515, 262, "Excavaciones muestran casas del siglo I y una sinagoga posterior."),
      place("jerusalen", "Jerusalén", "Jerusalén", 505, 285, "Centro religioso; el Templo reconstruido por Herodes dominaba la ciudad."),
      place("mar-muerto", "Mar Muerto", "frontera Israel-Jordania", 512, 292, "En sus orillas se hallaron los rollos de Qumrán."),
    ],
    steps: [
      {
        placeId: "cesarea",
        title: "Cesarea, sede del poder romano",
        narration:
          "Herodes construyó este puerto monumental; aquí residía el prefecto romano. La piedra de Pilato, hallada en 1961, confirma el título y el nombre del prefecto mencionado en los evangelios.",
      },
      {
        placeId: "nazaret",
        title: "Nazaret, aldea de Galilea",
        narration:
          "Galilea era una región de aldeas agrícolas bajo el gobierno de Herodes Antipas. Las excavaciones muestran una Nazaret pequeña y modesta en el siglo I.",
      },
      {
        placeId: "cafarnaum",
        title: "Cafarnaúm, junto al lago",
        narration:
          "Pueblo pesquero a orillas del mar de Galilea. La arqueología ha revelado viviendas del siglo I y los restos de una sinagoga de época posterior.",
      },
      {
        placeId: "jerusalen",
        title: "Jerusalén y el Templo",
        narration:
          "La ciudad era el centro religioso del judaísmo del Segundo Templo. La reconstrucción herodiana dejó una explanada monumental cuyos muros de contención aún se conservan.",
      },
      {
        placeId: "mar-muerto",
        title: "El desierto junto al Mar Muerto",
        narration:
          "En Qumrán, una comunidad judía copió y conservó manuscritos entre los siglos III a. C. y I d. C.: los rollos del Mar Muerto, hallados a partir de 1947.",
      },
    ],
  },
  {
    id: "ministerio-jesus",
    title: "La geografía del ministerio de Jesús",
    subtitle: "Galilea, Samaria y Jerusalén",
    era: "Mundo de Jesús",
    certainty: "reconstructed",
    isFree: false,
    summary:
      "Los evangelios sitúan el ministerio de Jesús entre Galilea y Jerusalén, con pasos por Samaria y Jericó. El itinerario es una reconstrucción a partir de los relatos; los lugares están documentados.",
    path: [
      [508, 268],
      [515, 262],
      [503, 266],
      [508, 275],
      [505, 285],
    ],
    places: [
      place("nazaret", "Nazaret", "Galilea", 508, 268),
      place("cafarnaum", "Cafarnaúm", "mar de Galilea", 515, 262, "Base del ministerio en Galilea según los evangelios."),
      place("samaria", "Samaria", "región central", 503, 266, "Región entre Galilea y Judea, con tensiones históricas con los judíos."),
      place("jerico", "Jericó", "valle del Jordán", 508, 275, "Ciudad de paso en la ruta del Jordán hacia Jerusalén."),
      place("jerusalen", "Jerusalén", "Jerusalén", 505, 283),
    ],
    steps: [
      {
        placeId: "nazaret",
        title: "Nazaret",
        narration:
          "Los evangelios presentan a Nazaret como el lugar de crianza de Jesús. La geografía de Galilea —aldeas, el lago y las rutas comerciales— enmarca los relatos.",
        reference: "Lucas 4,16",
      },
      {
        placeId: "cafarnaum",
        title: "Cafarnaúm",
        narration:
          "El texto la presenta como base en Galilea. La evidencia externa confirma un pueblo activo junto al lago en el siglo I.",
        reference: "Marcos 1,21",
      },
      {
        placeId: "samaria",
        title: "El paso por Samaria",
        narration:
          "Los relatos incluyen encuentros en territorio samaritano. La ruta directa entre Galilea y Judea cruzaba Samaria; existían también rutas alternativas por el Jordán.",
        reference: "Juan 4",
      },
      {
        placeId: "jerico",
        title: "Jericó",
        narration:
          "Ciudad oasis en la ruta de subida a Jerusalén. Los relatos la sitúan en el camino final hacia la capital.",
        reference: "Lucas 19,1",
      },
      {
        placeId: "jerusalen",
        title: "Jerusalén",
        narration:
          "Destino final de los relatos de la pasión. La topografía de la ciudad —el Templo, el valle del Cedrón, el Gólgota— es objeto de estudio arqueológico continuo.",
        reference: "Lucas 19,28-44",
      },
    ],
  },
  {
    id: "pablo-primer-viaje",
    title: "El primer viaje de Pablo",
    subtitle: "Chipre y Asia Menor",
    era: "Iglesia primitiva",
    certainty: "documented",
    isFree: false,
    summary:
      "El libro de los Hechos describe el primer viaje misionero desde Antioquía de Siria por Chipre y el sur de Asia Menor. Las ciudades y rutas marítimas están bien documentadas.",
    path: [
      [545, 185],
      [538, 178],
      [472, 192],
      [458, 198],
      [495, 140],
      [505, 125],
      [520, 135],
      [540, 148],
      [495, 140],
      [458, 198],
      [538, 178],
      [545, 185],
    ],
    places: [
      place("antioquia", "Antioquía", "Antakya, Turquía", 545, 185, "Tercera ciudad del imperio; punto de partida."),
      place("salamina", "Salamina", "Chipre", 472, 192, "Puerto oriental de Chipre."),
      place("pafos", "Pafos", "Chipre", 458, 198, "Capital provincial; residencia del procónsul."),
      place("perge", "Perge", "Turquía", 495, 140),
      place("antioquia-pisidia", "Antioquía de Pisidia", "Turquía", 505, 125),
      place("derbe", "Derbe", "Turquía", 540, 148, "Punto más oriental del recorrido."),
    ],
    steps: [
      {
        placeId: "antioquia",
        title: "Antioquía de Siria",
        narration:
          "Metrópoli helenística y base de la misión. El texto de Hechos la presenta como la comunidad que envía a Pablo y Bernabé.",
        reference: "Hechos 13,1-3",
      },
      {
        placeId: "salamina",
        title: "Desembarco en Chipre",
        narration:
          "La travesía marítima seguía las rutas comerciales habituales del Mediterráneo oriental, bien documentadas por la arqueología náutica.",
        reference: "Hechos 13,4-5",
      },
      {
        placeId: "pafos",
        title: "Pafos y el procónsul",
        narration:
          "El relato menciona al procónsul Sergio Paulo. Una inscripción en Chipre confirma el título de procónsul para la isla en esta época.",
        reference: "Hechos 13,6-12",
      },
      {
        placeId: "perge",
        title: "Perge de Panfilia",
        narration:
          "Puerto de entrada a Asia Menor. Desde aquí la ruta ascendía a la meseta de Anatolia, un viaje exigente por los pasos montañosos.",
        reference: "Hechos 13,13",
      },
      {
        placeId: "derbe",
        title: "Hasta Derbe y regreso",
        narration:
          "El itinerario recorre las ciudades del sur de Galacia y regresa por el mismo camino: un patrón típico de las calzadas romanas de la región.",
        reference: "Hechos 14,20-26",
      },
    ],
  },
  {
    id: "pablo-viajes-roma",
    title: "Los últimos viajes de Pablo a Roma",
    subtitle: "De Cesarea a la capital del imperio",
    era: "Iglesia primitiva",
    certainty: "documented",
    isFree: false,
    summary:
      "Hechos 27-28 narra el viaje de Pablo como prisionero desde Cesarea hasta Roma, con naufragio en Malta. La ruta marítima y las escalas coinciden con la navegación romana de la época.",
    path: [
      [500, 272],
      [518, 250],
      [440, 205],
      [390, 215],
      [330, 210],
      [270, 207],
      [285, 180],
      [280, 150],
      [262, 108],
      [248, 95],
    ],
    places: [
      place("cesarea", "Cesarea Marítima", "costa de Israel", 500, 272, "Puerto de embarque como prisionero."),
      place("sidon", "Sidón", "Líbano", 518, 250, "Primera escala según el relato."),
      place("creta", "Creta", "Grecia", 390, 215, "La nave invernó en la costa sur; el relato menciona Buenos Puertos."),
      place("malta", "Malta", "Malta", 270, 207, "Naufragio tradicional según Hechos 27-28."),
      place("puteoli", "Puteoli", "Pozzuoli, Italia", 262, 108, "Principal puerto de Roma en la época."),
      place("roma", "Roma", "Italia", 248, 95, "Capital del imperio; destino final del relato."),
    ],
    steps: [
      {
        placeId: "cesarea",
        title: "Embarque en Cesarea",
        narration:
          "El relato presenta a Pablo embarcado como prisionero hacia Roma. La navegación seguía las rutas comerciales del grano entre Oriente y la capital.",
        reference: "Hechos 27,1-2",
      },
      {
        placeId: "sidon",
        title: "Escala en Sidón",
        narration:
          "Antiguo puerto fenicio integrado en las rutas romanas. Las escalas costeras eran la norma antes de cruzar mar abierto.",
        reference: "Hechos 27,3",
      },
      {
        placeId: "creta",
        title: "La costa sur de Creta",
        narration:
          "El relato describe la decisión de seguir navegando pese al riesgo estacional. Los vientos del Mediterráneo marcaban el calendario de la navegación antigua.",
        reference: "Hechos 27,7-12",
      },
      {
        placeId: "malta",
        title: "Naufragio en Malta",
        narration:
          "La tradición identifica la isla del naufragio con Malta. El relato del naufragio refleja con precisión detalles de la navegación romana, según los estudios náuticos.",
        reference: "Hechos 27,39-44",
      },
      {
        placeId: "puteoli",
        title: "Puteoli y la vía a Roma",
        narration:
          "Desembarco en el puerto que servía a Roma; desde allí, la Vía Apia llevaba a la capital. El viaje ilustra la conectividad del imperio en el siglo I.",
        reference: "Hechos 28,13-14",
      },
      {
        placeId: "roma",
        title: "Roma",
        narration:
          "El relato cierra con Pablo en la capital del imperio. La presencia de comunidades cristianas en la Roma del siglo I está documentada por fuentes romanas y cristianas.",
        reference: "Hechos 28,16-31",
      },
    ],
  },
];

/** Finds a place definition by id within a map (defensive: may be absent). */
export function findPlace(map: JourneyMap, placeId: string): MapPlace | undefined {
  return map.places.find((p) => p.id === placeId);
}

/** Step marker coordinates: the route point nearest each step's place. */
export function stepCoordinates(map: JourneyMap): Array<[number, number]> {
  return map.steps.map((step) => {
    const p = findPlace(map, step.placeId);
    return p ? ([p.x, p.y] as [number, number]) : map.path[0];
  });
}
