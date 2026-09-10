"use client";

/**
 * Construction d'un programme à partir des réponses de l'assistant.
 *
 * Les exercices viennent du catalogue (domaine public) : leurs noms sont en
 * anglais, la structure et les libellés autour sont en français. Traduire 876
 * intitulés automatiquement produirait des approximations sur des mouvements
 * précis — mieux vaut le nom d'origine que « Développé couché guillotine »
 * inventé de travers. Les noms restent modifiables : le programme est éditable
 * et exportable.
 */
import {
  trierPourSeance,
  type Equipement,
  type ExerciceCatalogue,
  type Muscle,
  type Niveau,
} from "@/lib/catalogue";
import { MUSCLES_FR, EQUIPEMENT_FR } from "@/lib/catalogue";
import type { Day, Exercise, Program, Section } from "@/lib/types";

export type TypeProgramme = "fullbody" | "hautbas" | "ppl" | "split" | "endurance";

export const TYPES: { id: TypeProgramme; nom: string; resume: string; jours: number[] }[] = [
  {
    id: "fullbody",
    nom: "Full body",
    resume: "Tout le corps à chaque séance. Idéal à 2 ou 3 séances.",
    jours: [2, 3, 4],
  },
  {
    id: "hautbas",
    nom: "Haut / Bas",
    resume: "Un jour le haut, un jour le bas. Bon compromis volume et récupération.",
    jours: [2, 4, 6],
  },
  {
    id: "ppl",
    nom: "Push / Pull / Jambes",
    resume: "Poussée, tirage, jambes. Le classique au-delà de 3 séances.",
    jours: [3, 6],
  },
  {
    id: "split",
    nom: "Split par groupe",
    resume: "Un ou deux groupes musculaires par séance. Beaucoup de volume par muscle.",
    jours: [4, 5, 6],
  },
  {
    id: "endurance",
    nom: "Endurance",
    resume: "Séries longues, repos courts, circuits. Cardio et condition physique.",
    jours: [2, 3, 4, 5, 6],
  },
];

type ModeleSection = { titre: string; muscles: Muscle[]; nombre: number };
type ModeleJour = { titre: string; description: string; sections: ModeleSection[] };

const HAUT: ModeleSection[] = [
  { titre: "Pectoraux", muscles: ["chest"], nombre: 2 },
  { titre: "Dos", muscles: ["lats", "middle back"], nombre: 2 },
  { titre: "Épaules", muscles: ["shoulders"], nombre: 1 },
  { titre: "Bras", muscles: ["biceps", "triceps"], nombre: 2 },
];

const BAS: ModeleSection[] = [
  { titre: "Quadriceps", muscles: ["quadriceps"], nombre: 2 },
  { titre: "Ischios & fessiers", muscles: ["hamstrings", "glutes"], nombre: 2 },
  { titre: "Mollets", muscles: ["calves"], nombre: 1 },
  { titre: "Abdominaux", muscles: ["abdominals"], nombre: 1 },
];

const CORPS_ENTIER: ModeleSection[] = [
  { titre: "Jambes", muscles: ["quadriceps", "hamstrings", "glutes"], nombre: 2 },
  { titre: "Pectoraux", muscles: ["chest"], nombre: 1 },
  { titre: "Dos", muscles: ["lats", "middle back"], nombre: 1 },
  { titre: "Épaules", muscles: ["shoulders"], nombre: 1 },
  { titre: "Bras", muscles: ["biceps", "triceps"], nombre: 1 },
  { titre: "Abdominaux", muscles: ["abdominals"], nombre: 1 },
];

const POUSSEE: ModeleSection[] = [
  { titre: "Pectoraux", muscles: ["chest"], nombre: 3 },
  { titre: "Épaules", muscles: ["shoulders"], nombre: 2 },
  { titre: "Triceps", muscles: ["triceps"], nombre: 2 },
];

const TIRAGE: ModeleSection[] = [
  { titre: "Dos", muscles: ["lats", "middle back"], nombre: 3 },
  { titre: "Trapèzes", muscles: ["traps"], nombre: 1 },
  { titre: "Biceps", muscles: ["biceps"], nombre: 2 },
];

const JAMBES: ModeleSection[] = [
  { titre: "Quadriceps", muscles: ["quadriceps"], nombre: 2 },
  { titre: "Ischios & fessiers", muscles: ["hamstrings", "glutes"], nombre: 2 },
  { titre: "Mollets", muscles: ["calves"], nombre: 1 },
  { titre: "Abdominaux", muscles: ["abdominals"], nombre: 1 },
];

/** Rotations de séances par type. On prend les `frequence` premières. */
const ROTATIONS: Record<TypeProgramme, ModeleJour[]> = {
  fullbody: [
    { titre: "Full body A", description: "Tout le corps — priorité aux jambes et au dos", sections: CORPS_ENTIER },
    { titre: "Full body B", description: "Tout le corps — priorité à la poussée", sections: CORPS_ENTIER },
    { titre: "Full body C", description: "Tout le corps — variantes différentes", sections: CORPS_ENTIER },
    { titre: "Full body D", description: "Tout le corps — dernière variation", sections: CORPS_ENTIER },
  ],
  hautbas: [
    { titre: "Haut du corps A", description: "Poussée et tirage", sections: HAUT },
    { titre: "Bas du corps A", description: "Quadriceps, ischios, mollets", sections: BAS },
    { titre: "Haut du corps B", description: "Autres angles, autre matériel", sections: HAUT },
    { titre: "Bas du corps B", description: "Variantes et unilatéral", sections: BAS },
    { titre: "Haut du corps C", description: "Volume complémentaire", sections: HAUT },
    { titre: "Bas du corps C", description: "Volume complémentaire", sections: BAS },
  ],
  ppl: [
    { titre: "Poussée", description: "Pectoraux, épaules, triceps", sections: POUSSEE },
    { titre: "Tirage", description: "Dos, trapèzes, biceps", sections: TIRAGE },
    { titre: "Jambes", description: "Quadriceps, ischios, fessiers, mollets", sections: JAMBES },
    { titre: "Poussée B", description: "Autres angles de poussée", sections: POUSSEE },
    { titre: "Tirage B", description: "Autres angles de tirage", sections: TIRAGE },
    { titre: "Jambes B", description: "Variantes et unilatéral", sections: JAMBES },
  ],
  split: [
    { titre: "Pectoraux + Triceps", description: "Poussée horizontale et verticale", sections: [
      { titre: "Pectoraux", muscles: ["chest"], nombre: 4 },
      { titre: "Triceps", muscles: ["triceps"], nombre: 2 },
    ] },
    { titre: "Dos + Biceps", description: "Tirages vertical et horizontal", sections: [
      { titre: "Dos", muscles: ["lats", "middle back"], nombre: 4 },
      { titre: "Biceps", muscles: ["biceps"], nombre: 2 },
    ] },
    { titre: "Épaules", description: "Deltoïdes sur les trois faisceaux", sections: [
      { titre: "Épaules", muscles: ["shoulders"], nombre: 4 },
      { titre: "Trapèzes", muscles: ["traps"], nombre: 1 },
    ] },
    { titre: "Jambes", description: "Quadriceps, ischios, fessiers, mollets", sections: JAMBES },
    { titre: "Bras + Abdos", description: "Biceps, triceps, gainage", sections: [
      { titre: "Biceps", muscles: ["biceps"], nombre: 2 },
      { titre: "Triceps", muscles: ["triceps"], nombre: 2 },
      { titre: "Abdominaux", muscles: ["abdominals"], nombre: 2 },
    ] },
    { titre: "Full body", description: "Rattrapage sur les points faibles", sections: CORPS_ENTIER },
  ],
  endurance: [
    { titre: "Circuit corps entier A", description: "Séries longues, repos courts", sections: CORPS_ENTIER },
    { titre: "Circuit haut du corps", description: "Séries longues sur le haut", sections: HAUT },
    { titre: "Circuit bas du corps", description: "Séries longues sur le bas", sections: BAS },
    { titre: "Circuit corps entier B", description: "Autres mouvements", sections: CORPS_ENTIER },
    { titre: "Circuit haut du corps B", description: "Volume complémentaire", sections: HAUT },
    { titre: "Circuit bas du corps B", description: "Volume complémentaire", sections: BAS },
  ],
};

const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/**
 * Matériel supposé disponible : une salle classique. Le catalogue contient
 * aussi des exercices exotiques qu'on écarte ainsi.
 */
export const MATERIEL_SALLE: Equipement[] = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "body only",
  "e-z curl bar",
];

/** Catégories écartées : elles ne construisent pas une séance de renforcement. */
const CATEGORIES_EXCLUES = new Set(["stretching", "olympic weightlifting", "strongman"]);

export type Reponses = {
  frequence: number;
  type: TypeProgramme;
  niveau: Niveau;
};

function seriesEtReps(
  type: TypeProgramme,
  polyarticulaire: boolean
): Pick<Exercise, "series" | "reps" | "restLabel" | "restSeconds"> {
  if (type === "endurance") {
    return { series: 3, reps: "15–20", restLabel: "45 s repos", restSeconds: 45 };
  }
  return polyarticulaire
    ? { series: 4, reps: "8–10", restLabel: "2 min repos", restSeconds: 120 }
    : { series: 3, reps: "10–12", restLabel: "75 s repos", restSeconds: 75 };
}

export function genererProgramme(
  catalogue: ExerciceCatalogue[],
  reponses: Reponses
): Program {
  const { frequence, type, niveau } = reponses;
  const rotation = ROTATIONS[type];
  const utilises = new Set<string>();

  const utilisables = catalogue.filter(
    (e) =>
      (e.equipment === null || MATERIEL_SALLE.includes(e.equipment)) &&
      !(e.category && CATEGORIES_EXCLUES.has(e.category))
  );

  /**
   * Combien de mouvements polyarticulaires dans une section de `nombre`
   * exercices. Une séance qui n'empile que des polyarticulaires est épuisante
   * et incomplète : après deux poussées lourdes, c'est l'isolation qui va
   * chercher le muscle.
   */
  const partPoly = (nombre: number): number => {
    if (nombre <= 1) return 1;
    if (nombre <= 3) return Math.min(2, nombre - 1);
    return 2;
  };

  const choisir = (muscles: Muscle[], nombre: number): ExerciceCatalogue[] => {
    const candidats = trierPourSeance(
      utilisables.filter((e) => muscles.some((m) => e.muscles.includes(m))),
      niveau
    );
    const poly = candidats.filter((e) => e.mechanic === "compound");
    const isolation = candidats.filter((e) => e.mechanic !== "compound");

    const retenus: ExerciceCatalogue[] = [];
    const prendre = (source: ExerciceCatalogue[], combien: number) => {
      for (const c of source) {
        if (combien <= 0) break;
        if (utilises.has(c.id) || retenus.includes(c)) continue;
        retenus.push(c);
        utilises.add(c.id);
        combien--;
      }
    };

    const vise = partPoly(nombre);
    prendre(poly, vise);
    prendre(isolation, nombre - retenus.length);
    // Si une famille manque pour ce muscle — les mollets ont peu de
    // polyarticulaires, par exemple — l'autre comble le reste.
    prendre(candidats, nombre - retenus.length);
    // Dernier recours : accepter une répétition plutôt qu'une séance trouée.
    for (const c of candidats) {
      if (retenus.length >= nombre) break;
      if (!retenus.includes(c)) retenus.push(c);
    }
    return retenus;
  };

  const days: Day[] = [];
  for (let i = 0; i < frequence; i++) {
    const modele = rotation[i % rotation.length];
    const sections: Section[] = [];

    for (const ms of modele.sections) {
      const exercices = choisir(ms.muscles, ms.nombre);
      if (!exercices.length) continue;
      sections.push({
        title: ms.titre,
        exercises: exercices.map((e, j): Exercise => {
          const poly = e.mechanic === "compound";
          const details = [
            e.equipment ? EQUIPEMENT_FR[e.equipment] : null,
            poly ? "polyarticulaire" : "isolation",
          ]
            .filter(Boolean)
            .join(" · ");
          return {
            id: `j${i + 1}-${ms.titre.toLowerCase().replace(/\W+/g, "")}-${j + 1}`,
            name: e.name,
            sub: details,
            ...seriesEtReps(type, poly),
            tip: poly
              ? "Charge la plus lourde de la séance : soigne l'échauffement"
              : undefined,
          };
        }),
      });
    }

    const muscleTags = [
      ...new Set(modele.sections.flatMap((s) => s.muscles.map((m) => MUSCLES_FR[m]))),
    ].slice(0, 4);

    days.push({
      id: `j${i + 1}`,
      code: `J${i + 1}`,
      title: modele.titre,
      description: modele.description,
      muscleTags,
      sections,
      restInfo: {
        duration: type === "endurance" ? "45 min" : "60–75 min",
        warmup: "5–10 min",
        suggestedDay: JOURS_SEMAINE[Math.round((i * 7) / frequence) % 7],
      },
      tips: [
        "Commence par deux séries légères sur le premier exercice",
        type === "endurance"
          ? "Enchaîne les exercices d'une section en circuit si le temps presse"
          : "Ajoute du poids dès que tu tiens le haut de la fourchette de répétitions",
        "Note tes charges à chaque séance : c'est la progression qui compte",
      ],
    });
  }

  const nomType = TYPES.find((t) => t.id === type)?.nom ?? type;

  return {
    tag: type === "endurance" ? "Endurance — condition physique" : "Renforcement — hypertrophie",
    title: nomType,
    titleAccent: `${frequence} jour${frequence > 1 ? "s" : ""}`,
    subtitle: `Programme généré · ${frequence} séance${frequence > 1 ? "s" : ""} par semaine`,
    statsRow: [
      { value: String(frequence), label: "Séances/sem" },
      { value: String(7 - frequence), label: "Jours off" },
      { value: type === "endurance" ? "~45'" : "~70'", label: "Durée/séance" },
    ],
    days,
    nutrition: [],
  };
}
