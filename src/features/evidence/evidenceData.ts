/**
 * Evidence card data for Track C (evidence feature).
 *
 * Curated local pack used until the Track B/E content pipeline publishes
 * approved records. Every card follows spec §3: discovery context, dating,
 * present location when verified, "Qué aporta" / "Qué no demuestra", source
 * list and image-rights attribution. Spanish-first, denomination-neutral.
 */

export type EvidenceKind = "artefacto" | "inscripcion" | "sitio";

export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  artefacto: "Artefacto",
  inscripcion: "Inscripción",
  sitio: "Sitio",
};

export type ImageRightsStatus = "pending" | "public-domain" | "licensed";

export interface EvidenceSource {
  title: string;
  detail?: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  kind: EvidenceKind;
  summary: string;
  dating: string;
  discovery: {
    year: string;
    place: string;
    context: string;
  };
  presentLocation?: {
    place: string;
    verified: boolean;
  };
  contributes: string[];
  doesNotProve: string[];
  sources: EvidenceSource[];
  imageRights: {
    status: ImageRightsStatus;
    attribution?: string;
  };
  lastReviewed: string;
  relatedIds: string[];
}

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: "estela-tel-dan",
    title: "Estela de Tel Dan",
    kind: "inscripcion",
    summary:
      "Fragmentos de una estela de basalto con una inscripción aramea que menciona la «casa de David»: la referencia extrabíblica más antigua conocida a la dinastía davídica.",
    dating: "Siglo IX a. C. (aprox. 850–800 a. C.)",
    discovery: {
      year: "1993–1994",
      place: "Tel Dan, norte de Israel",
      context:
        "Hallada en excavaciones dirigidas por Avraham Biran, reutilizada en un muro de la puerta de la ciudad. El texto conmemora la victoria de un rey arameo sobre Israel y Judá.",
    },
    presentLocation: {
      place: "Museo de Israel, Jerusalén",
      verified: true,
    },
    contributes: [
      "Aporta una mención independiente de la «casa de David» fuera del texto bíblico, unos 150 años después del periodo tradicionalmente atribuido a David.",
      "Confirma el uso de la fórmula dinástica «casa de X» en las inscripciones reales de la región.",
      "Corrobora el contexto de guerras entre Aram-Damasco e Israel en el siglo IX a. C.",
    ],
    doesNotProve: [
      "No demuestra los detalles biográficos de David narrados en el texto bíblico.",
      "No establece por sí sola la extensión ni la naturaleza del reino unido del siglo X a. C., que sigue siendo objeto de debate.",
      "La reconstrucción exacta de algunas líneas del texto es discutida entre epigrafistas.",
    ],
    sources: [
      { title: "A. Biran y J. Naveh, «The Tel Dan Inscription», Israel Exploration Journal 43 (1993)", detail: "Publicación inicial del hallazgo." },
      { title: "Museo de Israel, Jerusalén", detail: "Ficha del objeto en la colección." },
    ],
    imageRights: { status: "pending" },
    lastReviewed: "2026-10-03",
    relatedIds: ["piedra-pilato", "cilindro-ciro"],
  },
  {
    id: "cilindro-ciro",
    title: "Cilindro de Ciro",
    kind: "artefacto",
    summary:
      "Cilindro de arcilla con inscripción cuneiforme en acadio que registra la toma de Babilonia por Ciro el Grande (539 a. C.) y su política de restauración de cultos y retorno de deportados.",
    dating: "539 a. C. (época de Ciro el Grande)",
    discovery: {
      year: "1879",
      place: "Babilonia (actual Irak)",
      context:
        "Descubierto durante excavaciones en las ruinas de Babilonia; depositado como inscripción fundacional. El texto está redactado en la tradición de la propaganda real mesopotámica.",
    },
    presentLocation: {
      place: "Museo Británico, Londres",
      verified: true,
    },
    contributes: [
      "Ilustra la política persa que el texto bíblico presenta como marco del retorno del exilio: permitir el regreso de poblaciones deportadas.",
      "Confirma la fecha de la caída de Babilonia (539 a. C.) y el inicio del dominio persa.",
      "Es un ejemplo claro del género de las inscripciones reales: hay que leerlo como propaganda, no como crónica neutral.",
    ],
    doesNotProve: [
      "No menciona a los judíos ni a Jerusalén por su nombre: la conexión con el retorno es contextual, no explícita.",
      "No demuestra los detalles del relato de Esdras; el decreto específico pertenece al nivel del texto.",
    ],
    sources: [
      { title: "Museo Británico, Londres", detail: "Ficha del objeto BM 90920 y traducción." },
      { title: "Crónica de Nabónido", detail: "Fuente babilónica complementaria sobre la toma de Babilonia." },
    ],
    imageRights: { status: "pending" },
    lastReviewed: "2026-10-03",
    relatedIds: ["estela-tel-dan", "inscripcion-siloe"],
  },
  {
    id: "piedra-pilato",
    title: "Piedra de Pilato",
    kind: "inscripcion",
    summary:
      "Bloque de piedra caliza con inscripción latina que nombra a Poncio Pilato con el título de prefecto de Judea. Es la única evidencia epigráfica contemporánea de este gobernador.",
    dating: "Siglo I d. C. (época de Tiberio, 26–36 d. C.)",
    discovery: {
      year: "1961",
      place: "Cesarea Marítima, Israel",
      context:
        "Hallada en excavaciones del teatro de Cesarea, reutilizada como escalón. La inscripción dedicaba un edificio (probablemente un templo) al emperador Tiberio.",
    },
    presentLocation: {
      place: "Museo de Israel, Jerusalén",
      verified: true,
    },
    contributes: [
      "Confirma el nombre y el título oficial (prefecto) del gobernador mencionado en los evangelios.",
      "Corrobora la administración romana de Judea desde Cesarea en la época de Tiberio.",
    ],
    doesNotProve: [
      "No aporta información sobre el juicio de Jesús ni sobre ningún hecho narrado en los evangelios.",
      "El texto conservado es fragmentario: la reconstrucción del nombre completo se apoya en el contexto.",
    ],
    sources: [
      { title: "A. Frova, «L'iscrizione di Ponzio Pilato a Cesarea» (1961)", detail: "Publicación del hallazgo." },
      { title: "Museo de Israel, Jerusalén", detail: "Ficha del objeto en la colección." },
    ],
    imageRights: { status: "pending" },
    lastReviewed: "2026-10-03",
    relatedIds: ["estela-tel-dan", "rollos-qumran"],
  },
  {
    id: "rollos-qumran",
    title: "Rollos del Mar Muerto",
    kind: "artefacto",
    summary:
      "Cerca de 900 manuscritos hallados en cuevas junto a Qumrán, copiados entre los siglos III a. C. y I d. C. Incluyen textos bíblicos, reglas comunitarias y comentarios: la biblioteca judía más antigua conservada.",
    dating: "Siglos III a. C. – I d. C. (copias)",
    discovery: {
      year: "1947 en adelante",
      place: "Cuevas de Qumrán, orilla noroccidental del Mar Muerto",
      context:
        "Localizados a partir de 1947 en once cuevas cercanas al asentamiento de Qumrán. La comunidad que los conservó suele identificarse con un grupo judío del Segundo Templo, sin consenso total.",
    },
    presentLocation: {
      place: "Santuario del Libro, Museo de Israel, Jerusalén (la mayoría)",
      verified: true,
    },
    contributes: [
      "Aportan copias de textos bíblicos unos mil años más antiguas que los manuscritos medievales, lo que permite estudiar la transmisión del texto.",
      "Muestran la diversidad del judaísmo del Segundo Templo: no era un bloque monolítico.",
      "Confirman prácticas y expectativas de la época (pureza ritual, calendario, interpretación de profecías).",
    ],
    doesNotProve: [
      "No demuestran la historicidad de ningún relato concreto: son textos de una comunidad, no crónicas de hechos.",
      "La identificación de la comunidad de Qumrán con los esenios es una interpretación común, no un hecho establecido.",
    ],
    sources: [
      { title: "Santuario del Libro, Museo de Israel", detail: "Colección y proyecto digital de los rollos." },
      { title: "E. Tov, «Textual Criticism of the Hebrew Bible»", detail: "Referencia académica sobre la transmisión textual." },
    ],
    imageRights: { status: "pending" },
    lastReviewed: "2026-10-03",
    relatedIds: ["papiro-p52", "piedra-pilato"],
  },
  {
    id: "papiro-p52",
    title: "Papiro 𝔓52",
    kind: "artefacto",
    summary:
      "Pequeño fragmento de papiro con parte del Evangelio de Juan (18,31-33.37-38). Es el manuscrito del Nuevo Testamento más antiguo conocido.",
    dating: "Primera mitad del siglo II d. C. (aprox. 100–150 d. C.)",
    discovery: {
      year: "Adquirido en 1920, identificado en 1934",
      place: "Egipto (procedencia de compra); hoy en Mánchester",
      context:
        "Fragmento adquirido en Egipto y reconocido por C. H. Roberts entre papiros sin catalogar. Su datación paleográfica lo sitúa pocas décadas después de la redacción tradicional del evangelio.",
    },
    presentLocation: {
      place: "Biblioteca John Rylands, Universidad de Mánchester",
      verified: true,
    },
    contributes: [
      "Acerca la evidencia manuscrita del Evangelio de Juan a pocas décadas de su composición tradicional.",
      "Muestra la circulación temprana de los textos cristianos en formato de códice y en Egipto.",
    ],
    doesNotProve: [
      "El fragmento conserva apenas unas líneas: no permite reconstruir el texto completo ni datar la redacción original.",
      "La datación paleográfica tiene un margen de varias décadas y ha sido discutida.",
    ],
    sources: [
      { title: "C. H. Roberts, «An Unpublished Fragment of the Fourth Gospel» (1935)", detail: "Publicación inicial del fragmento." },
      { title: "Biblioteca John Rylands, Mánchester", detail: "Ficha del manuscrito Gr. P. 457." },
    ],
    imageRights: { status: "pending" },
    lastReviewed: "2026-10-03",
    relatedIds: ["rollos-qumran", "piedra-pilato"],
  },
  {
    id: "inscripcion-siloe",
    title: "Inscripción del túnel de Siloé",
    kind: "inscripcion",
    summary:
      "Inscripción hebrea hallada en el túnel de agua de Siloé, en Jerusalén, que describe cómo dos equipos de excavadores se encontraron en el centro al perforar la roca. Se asocia tradicionalmente con las obras de Ezequías (siglo VIII a. C.).",
    dating: "Siglo VIII a. C. (atribución tradicional; debatida)",
    discovery: {
      year: "1880",
      place: "Túnel de Siloé, Jerusalén",
      context:
        "Descubierta en la pared del túnel que lleva agua del manantial de Guijón al estanque de Siloé. El texto celebra la conclusión de la obra desde la perspectiva de los trabajadores.",
    },
    presentLocation: {
      place: "Museo de Arqueología de Estambul",
      verified: true,
    },
    contributes: [
      "Documenta una gran obra hidráulica en la Jerusalén antigua y la capacidad técnica de sus constructores.",
      "Es uno de los textos hebreos monumentales más antiguos conservados.",
      "El contexto encaja con la preparación de Jerusalén ante el asedio asirio del 701 a. C., según una interpretación común.",
    ],
    doesNotProve: [
      "La inscripción no nombra a Ezequías: la atribución a su reinado es una interpretación, no un dato del texto.",
      "Estudios recientes han reabierto el debate sobre su datación exacta.",
    ],
    sources: [
      { title: "A. H. Sayce, publicación inicial (1881)", detail: "Primera lectura de la inscripción." },
      { title: "Museo de Arqueología de Estambul", detail: "Ficha del objeto en la colección." },
    ],
    imageRights: { status: "pending" },
    lastReviewed: "2026-10-03",
    relatedIds: ["estela-tel-dan", "cilindro-ciro"],
  },
];

export function getEvidenceById(id: string): EvidenceItem | undefined {
  return EVIDENCE_ITEMS.find((e) => e.id === id);
}
