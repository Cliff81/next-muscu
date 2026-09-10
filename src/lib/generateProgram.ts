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
  sortForSession,
  type Equipment,
  type CatalogExercise,
  type Muscle,
  type Level,
} from "@/lib/catalog";
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from "@/lib/catalog";
import type { Day, Exercise, Program, Section } from "@/lib/types";

export type ProgramType = "fullbody" | "upperlower" | "ppl" | "split" | "endurance";

export const PROGRAM_TYPES: { id: ProgramType; name: string; summary: string; days: number[] }[] = [
  {
    id: "fullbody",
    name: "Full body",
    summary: "Tout le corps à chaque séance. Idéal à 2 ou 3 séances.",
    days: [2, 3, 4],
  },
  {
    id: "upperlower",
    name: "Haut / Bas",
    summary: "Un jour le haut, un jour le bas. Bon compromis volume et récupération.",
    days: [2, 4, 6],
  },
  {
    id: "ppl",
    name: "Push / Pull / Jambes",
    summary: "Poussée, tirage, jambes. Le classique au-delà de 3 séances.",
    days: [3, 6],
  },
  {
    id: "split",
    name: "Split par groupe",
    summary: "Un ou deux groupes musculaires par séance. Beaucoup de volume par muscle.",
    days: [4, 5, 6],
  },
  {
    id: "endurance",
    name: "Endurance",
    summary: "Séries longues, repos courts, circuits. Cardio et condition physique.",
    days: [2, 3, 4, 5, 6],
  },
];

type SectionTemplate = { title: string; muscles: Muscle[]; count: number };
type DayTemplate = { title: string; description: string; sections: SectionTemplate[] };

const UPPER: SectionTemplate[] = [
  { title: "Pectoraux", muscles: ["chest"], count: 2 },
  { title: "Dos", muscles: ["lats", "middle back"], count: 2 },
  { title: "Épaules", muscles: ["shoulders"], count: 1 },
  { title: "Bras", muscles: ["biceps", "triceps"], count: 2 },
];

const LOWER: SectionTemplate[] = [
  { title: "Quadriceps", muscles: ["quadriceps"], count: 2 },
  { title: "Ischios & fessiers", muscles: ["hamstrings", "glutes"], count: 2 },
  { title: "Mollets", muscles: ["calves"], count: 1 },
  { title: "Abdominaux", muscles: ["abdominals"], count: 1 },
];

const FULL_BODY: SectionTemplate[] = [
  { title: "Jambes", muscles: ["quadriceps", "hamstrings", "glutes"], count: 2 },
  { title: "Pectoraux", muscles: ["chest"], count: 1 },
  { title: "Dos", muscles: ["lats", "middle back"], count: 1 },
  { title: "Épaules", muscles: ["shoulders"], count: 1 },
  { title: "Bras", muscles: ["biceps", "triceps"], count: 1 },
  { title: "Abdominaux", muscles: ["abdominals"], count: 1 },
];

const PUSH: SectionTemplate[] = [
  { title: "Pectoraux", muscles: ["chest"], count: 3 },
  { title: "Épaules", muscles: ["shoulders"], count: 2 },
  { title: "Triceps", muscles: ["triceps"], count: 2 },
];

const PULL: SectionTemplate[] = [
  { title: "Dos", muscles: ["lats", "middle back"], count: 3 },
  { title: "Trapèzes", muscles: ["traps"], count: 1 },
  { title: "Biceps", muscles: ["biceps"], count: 2 },
];

const LEGS: SectionTemplate[] = [
  { title: "Quadriceps", muscles: ["quadriceps"], count: 2 },
  { title: "Ischios & fessiers", muscles: ["hamstrings", "glutes"], count: 2 },
  { title: "Mollets", muscles: ["calves"], count: 1 },
  { title: "Abdominaux", muscles: ["abdominals"], count: 1 },
];

/** Rotations de séances par type. On garde les `frequency` premiers jours. */
const ROTATIONS: Record<ProgramType, DayTemplate[]> = {
  fullbody: [
    { title: "Full body A", description: "Tout le corps — priorité aux jambes et au dos", sections: FULL_BODY },
    { title: "Full body B", description: "Tout le corps — priorité à la poussée", sections: FULL_BODY },
    { title: "Full body C", description: "Tout le corps — variantes différentes", sections: FULL_BODY },
    { title: "Full body D", description: "Tout le corps — dernière variation", sections: FULL_BODY },
  ],
  upperlower: [
    { title: "Haut du corps A", description: "Poussée et tirage", sections: UPPER },
    { title: "Bas du corps A", description: "Quadriceps, ischios, mollets", sections: LOWER },
    { title: "Haut du corps B", description: "Autres angles, autre matériel", sections: UPPER },
    { title: "Bas du corps B", description: "Variantes et unilatéral", sections: LOWER },
    { title: "Haut du corps C", description: "Volume complémentaire", sections: UPPER },
    { title: "Bas du corps C", description: "Volume complémentaire", sections: LOWER },
  ],
  ppl: [
    { title: "Poussée", description: "Pectoraux, épaules, triceps", sections: PUSH },
    { title: "Tirage", description: "Dos, trapèzes, biceps", sections: PULL },
    { title: "Jambes", description: "Quadriceps, ischios, fessiers, mollets", sections: LEGS },
    { title: "Poussée B", description: "Autres angles de poussée", sections: PUSH },
    { title: "Tirage B", description: "Autres angles de tirage", sections: PULL },
    { title: "Jambes B", description: "Variantes et unilatéral", sections: LEGS },
  ],
  split: [
    { title: "Pectoraux + Triceps", description: "Poussée horizontale et verticale", sections: [
      { title: "Pectoraux", muscles: ["chest"], count: 4 },
      { title: "Triceps", muscles: ["triceps"], count: 2 },
    ] },
    { title: "Dos + Biceps", description: "Tirages vertical et horizontal", sections: [
      { title: "Dos", muscles: ["lats", "middle back"], count: 4 },
      { title: "Biceps", muscles: ["biceps"], count: 2 },
    ] },
    { title: "Épaules", description: "Deltoïdes sur les trois faisceaux", sections: [
      { title: "Épaules", muscles: ["shoulders"], count: 4 },
      { title: "Trapèzes", muscles: ["traps"], count: 1 },
    ] },
    { title: "Jambes", description: "Quadriceps, ischios, fessiers, mollets", sections: LEGS },
    { title: "Bras + Abdos", description: "Biceps, triceps, gainage", sections: [
      { title: "Biceps", muscles: ["biceps"], count: 2 },
      { title: "Triceps", muscles: ["triceps"], count: 2 },
      { title: "Abdominaux", muscles: ["abdominals"], count: 2 },
    ] },
    { title: "Full body", description: "Rattrapage sur les points faibles", sections: FULL_BODY },
  ],
  endurance: [
    { title: "Circuit corps entier A", description: "Séries longues, repos courts", sections: FULL_BODY },
    { title: "Circuit haut du corps", description: "Séries longues sur le haut", sections: UPPER },
    { title: "Circuit bas du corps", description: "Séries longues sur le bas", sections: LOWER },
    { title: "Circuit corps entier B", description: "Autres mouvements", sections: FULL_BODY },
    { title: "Circuit haut du corps B", description: "Volume complémentaire", sections: UPPER },
    { title: "Circuit bas du corps B", description: "Volume complémentaire", sections: LOWER },
  ],
};

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/**
 * Matériel supposé disponible : une salle classique. Le catalogue contient
 * aussi des exercices exotiques qu'on écarte ainsi.
 */
export const GYM_EQUIPMENT: Equipment[] = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "body only",
  "e-z curl bar",
];

/** Catégories écartées : elles ne construisent pas une séance de renforcement. */
const EXCLUDED_CATEGORIES = new Set(["stretching", "olympic weightlifting", "strongman"]);

export type Answers = {
  frequency: number;
  type: ProgramType;
  level: Level;
};

export function setsAndReps(
  type: ProgramType,
  isCompound: boolean
): Pick<Exercise, "series" | "reps" | "restLabel" | "restSeconds"> {
  if (type === "endurance") {
    return { series: 3, reps: "15–20", restLabel: "45 s repos", restSeconds: 45 };
  }
  return isCompound
    ? { series: 4, reps: "8–10", restLabel: "2 min repos", restSeconds: 120 }
    : { series: 3, reps: "10–12", restLabel: "75 s repos", restSeconds: 75 };
}

/**
 * Sous-titre et conseil déduits de la fiche catalogue. Partagé avec le
 * sélecteur d'exercices : un mouvement choisi à la main est décrit exactement
 * comme ceux que le générateur a posés.
 */
export function catalogDetails(e: CatalogExercise): Pick<Exercise, "sub" | "tip"> {
  const compound = e.mechanic === "compound";
  return {
    sub: [e.equipment ? EQUIPMENT_LABELS[e.equipment] : null, compound ? "polyarticulaire" : "isolation"]
      .filter(Boolean)
      .join(" · "),
    tip: compound ? "Charge la plus lourde de la séance : soigne l'échauffement" : undefined,
  };
}

/**
 * Exercices retenus pour un programme : matériel de salle classique, et ni
 * étirements ni haltérophilie. Le sélecteur applique le même tamis que le
 * générateur, pour ne pas proposer à la main ce qu'il a écarté.
 */
export function usableExercises(catalog: CatalogExercise[]): CatalogExercise[] {
  return catalog.filter(
    (e) =>
      (e.equipment === null || GYM_EQUIPMENT.includes(e.equipment)) &&
      !(e.category && EXCLUDED_CATEGORIES.has(e.category))
  );
}

export function generateProgram(
  catalog: CatalogExercise[],
  answers: Answers
): Program {
  const { frequency, type, level } = answers;
  const rotation = ROTATIONS[type];
  const used = new Set<string>();

  const usable = usableExercises(catalog);

  /**
   * Combien de mouvements polyarticulaires dans une section de `count`
   * exercices. Une séance qui n'empile que des polyarticulaires est épuisante
   * et incomplète : après deux poussées lourdes, c'est l'isolation qui va
   * chercher le muscle.
   */
  const compoundShare = (count: number): number => {
    if (count <= 1) return 1;
    if (count <= 3) return Math.min(2, count - 1);
    return 2;
  };

  const pick = (muscles: Muscle[], count: number): CatalogExercise[] => {
    const candidates = sortForSession(
      usable.filter((e) => muscles.some((m) => e.muscles.includes(m))),
      level
    );
    const poly = candidates.filter((e) => e.mechanic === "compound");
    const isolation = candidates.filter((e) => e.mechanic !== "compound");

    const chosen: CatalogExercise[] = [];
    const take = (source: CatalogExercise[], remaining: number) => {
      for (const c of source) {
        if (remaining <= 0) break;
        if (used.has(c.id) || chosen.includes(c)) continue;
        chosen.push(c);
        used.add(c.id);
        remaining--;
      }
    };

    const target = compoundShare(count);
    take(poly, target);
    take(isolation, count - chosen.length);
    // Si une famille manque pour ce muscle — les mollets ont peu de
    // polyarticulaires, par exemple — l'autre comble le reste.
    take(candidates, count - chosen.length);
    // Dernier recours : accepter une répétition plutôt qu'une séance trouée.
    for (const c of candidates) {
      if (chosen.length >= count) break;
      if (!chosen.includes(c)) chosen.push(c);
    }
    return chosen;
  };

  const days: Day[] = [];
  for (let i = 0; i < frequency; i++) {
    const template = rotation[i % rotation.length];
    const sections: Section[] = [];

    for (const ms of template.sections) {
      const exercises = pick(ms.muscles, ms.count);
      if (!exercises.length) continue;
      sections.push({
        title: ms.title,
        muscles: ms.muscles,
        exercises: exercises.map((e, j): Exercise => {
          const poly = e.mechanic === "compound";
          return {
            id: `j${i + 1}-${ms.title.toLowerCase().replace(/\W+/g, "")}-${j + 1}`,
            name: e.name,
            catalogId: e.id,
            images: e.images,
            ...catalogDetails(e),
            ...setsAndReps(type, poly),
          };
        }),
      });
    }

    const muscleTags = [
      ...new Set(template.sections.flatMap((s) => s.muscles.map((m) => MUSCLE_LABELS[m]))),
    ].slice(0, 4);

    days.push({
      id: `j${i + 1}`,
      code: `J${i + 1}`,
      title: template.title,
      description: template.description,
      muscleTags,
      sections,
      restInfo: {
        duration: type === "endurance" ? "45 min" : "60–75 min",
        warmup: "5–10 min",
        suggestedDay: WEEKDAYS[Math.round((i * 7) / frequency) % 7],
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

  const typeName = PROGRAM_TYPES.find((t) => t.id === type)?.name ?? type;

  return {
    tag: type === "endurance" ? "Endurance — condition physique" : "Renforcement — hypertrophie",
    title: typeName,
    titleAccent: `${frequency} jour${frequency > 1 ? "s" : ""}`,
    subtitle: `Programme généré · ${frequency} séance${frequency > 1 ? "s" : ""} par semaine`,
    statsRow: [
      { value: String(frequency), label: "Séances/sem" },
      { value: String(7 - frequency), label: "Jours off" },
      { value: type === "endurance" ? "~45'" : "~70'", label: "Durée/séance" },
    ],
    days,
    nutrition: [],
  };
}
