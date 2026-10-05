// 7 eras (era-01..era-07)
import { base, SRC, AC } from "./common.mjs";

const R = "original-illustration-needed";

export const eras = [
  base("era-01", "Orígenes y patriarcas", {
    type: "era",
    summary:
      "Abraham, Isaac, Jacob y José: los relatos fundacionales de Israel en el mundo del segundo milenio a. C., entre Sumer, Egipto y Canaán. Las fechas de los patriarcas son debatidas; el contexto cultural está bien documentado.",
    order: 1,
    year_min: AC(2100), year_max: AC(1550),
    date_label: "c. 2100–1550 a. C.",
    certainty: "disputed", confidence: "medium",
    sources: [SRC.RVR09, SRC.AYBD, SRC.OUP],
    image_rights: R, tier: "free",
  }),
  base("era-02", "Éxodo y asentamiento", {
    type: "era",
    summary:
      "Moisés, la salida de Egipto, el Sinaí y la llegada a Canaán: el relato constitutivo de Israel como pueblo. La cronología y las rutas se presentan como debatidas donde corresponde.",
    order: 2,
    year_min: AC(1550), year_max: AC(1050),
    date_label: "c. 1550–1050 a. C.",
    certainty: "disputed", confidence: "medium",
    sources: [SRC.RVR09, SRC.AYBD, SRC.ASOR],
    image_rights: R, tier: "free",
  }),
  base("era-03", "Monarquía unida", {
    type: "era",
    summary:
      "Saúl, David y Salomón: el siglo del reino unificado con capital en Jerusalén. La magnitud del reino davídico es objeto de debate; la dinastía está confirmada por la estela de Tel Dan.",
    order: 3,
    year_min: AC(1050), year_max: AC(930),
    date_label: "c. 1050–930 a. C.",
    certainty: "disputed", confidence: "medium",
    sources: [SRC.RVR09, SRC.AYBD, SRC.IAA],
    image_rights: R, tier: "premium",
  }),
  base("era-04", "Reinos divididos", {
    type: "era",
    summary:
      "Israel en el norte y Judá en el sur, entre la presión de Aram, Asiria y Babilonia. Profetas, guerras y asedios: la época mejor documentada por fuentes externas del Antiguo Testamento.",
    order: 4,
    year_min: AC(930), year_max: AC(586),
    date_label: "930–586 a. C.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.RVR09, SRC.BRITISH_MUSEUM, SRC.AYBD],
    image_rights: R, tier: "premium",
  }),
  base("era-05", "Exilio y retorno", {
    type: "era",
    summary:
      "La destrucción de Jerusalén, el destierro en Babilonia y el regreso bajo Persia. El trauma que transformó la religión de Israel: sin templo ni rey, nacieron la sinagoga y el judaísmo centrado en la Torá.",
    order: 5,
    year_min: AC(586), year_max: AC(332),
    date_label: "586–332 a. C.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.RVR09, SRC.BRITISH_MUSEUM, SRC.OUP],
    image_rights: R, tier: "premium",
  }),
  base("era-06", "Mundo de Jesús", {
    type: "era",
    summary:
      "Del helenismo a Roma: macabeos, Herodes y la Galilea del siglo I. El escenario histórico, geográfico y cultural en el que vivió Jesús de Nazaret.",
    order: 6,
    year_min: AC(332), year_max: 70,
    date_label: "332 a. C.–70 d. C.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.RVR09, SRC.OUP, SRC.IAA],
    image_rights: R, tier: "premium",
  }),
  base("era-07", "Iglesia primitiva", {
    type: "era",
    summary:
      "De Pentecostés a Patmos: la expansión del movimiento cristiano desde Jerusalén por todo el Mediterráneo romano, con Pablo como gran viajero y las primeras persecuciones.",
    order: 7,
    year_min: 30, year_max: 100,
    date_label: "c. 30–100 d. C.",
    certainty: "consensus", confidence: "high",
    sources: [SRC.RVR09, SRC.AYBD, SRC.OUP],
    image_rights: R, tier: "premium",
  }),
];
