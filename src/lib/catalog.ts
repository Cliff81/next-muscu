"use client";

/**
 * Catalogue d'exercices, servi depuis `/exercices.json`.
 *
 * Source : free-exercise-db (https://github.com/yuhonas/free-exercise-db),
 * publié sous **Unlicense** — domaine public, donc réutilisable sans
 * contrainte d'attribution. 876 exercices, réduits ici aux champs utiles
 * (253 Ko au lieu de 982).
 *
 * Le fichier est dans `public/` et non importé dans le bundle : il n'est
 * téléchargé qu'au moment où l'assistant en a besoin, puis mis en cache par le
 * navigateur.
 */

export type Muscle =
  | "abdominals" | "abductors" | "adductors" | "biceps" | "calves" | "chest"
  | "forearms" | "glutes" | "hamstrings" | "lats" | "lower back" | "middle back"
  | "neck" | "quadriceps" | "shoulders" | "traps" | "triceps";

export type Equipment =
  | "bands" | "barbell" | "body only" | "cable" | "dumbbell" | "e-z curl bar"
  | "exercise ball" | "foam roll" | "kettlebells" | "machine" | "medicine ball"
  | "other";

export type Level = "beginner" | "intermediate" | "expert";

export type Category =
  | "cardio" | "olympic weightlifting" | "plyometrics" | "powerlifting"
  | "strength" | "stretching" | "strongman";

export type CatalogExercise = {
  id: string;
  name: string;
  muscles: Muscle[];
  secondary: Muscle[];
  equipment: Equipment | null;
  level: Level | null;
  force: "push" | "pull" | "static" | null;
  mechanic: "compound" | "isolation" | null;
  category: Category | null;
  images: string[];
};

export const MUSCLE_LABELS: Record<Muscle, string> = {
  abdominals: "Abdominaux",
  abductors: "Abducteurs",
  adductors: "Adducteurs",
  biceps: "Biceps",
  calves: "Mollets",
  chest: "Pectoraux",
  forearms: "Avant-bras",
  glutes: "Fessiers",
  hamstrings: "Ischio-jambiers",
  lats: "Grand dorsal",
  "lower back": "Lombaires",
  "middle back": "Milieu du dos",
  neck: "Nuque",
  quadriceps: "Quadriceps",
  shoulders: "Épaules",
  traps: "Trapèzes",
  triceps: "Triceps",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bands: "Élastique",
  barbell: "Barre",
  "body only": "Poids du corps",
  cable: "Poulie",
  dumbbell: "Haltères",
  "e-z curl bar": "Barre EZ",
  "exercise ball": "Swiss ball",
  "foam roll": "Rouleau",
  kettlebells: "Kettlebell",
  machine: "Machine",
  "medicine ball": "Medicine ball",
  other: "Autre",
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  expert: "Avancé",
};

let pending: Promise<CatalogExercise[]> | null = null;

/** Télécharge le catalogue une seule fois par session. */
export function loadCatalog(): Promise<CatalogExercise[]> {
  if (!pending) {
    pending = fetch("/exercises.json")
      .then((r) => {
        if (!r.ok) throw new Error("catalogue");
        return r.json() as Promise<CatalogExercise[]>;
      })
      .catch((err) => {
        // Un échec ne doit pas figer le cache : la prochaine tentative réessaie.
        pending = null;
        throw err;
      });
  }
  return pending;
}

/** Exercices ciblant un muscle en premier, matériel disponible respecté. */
export function forMuscle(
  catalogue: CatalogExercise[],
  muscle: Muscle,
  equipmentAvailable: Equipment[]
): CatalogExercise[] {
  return catalogue.filter(
    (e) =>
      e.muscles.includes(muscle) &&
      (e.equipment === null || equipmentAvailable.includes(e.equipment))
  );
}

/**
 * Ordre de préférence pour construire une séance : les mouvements
 * polyarticulaires d'abord — ils chargent le plus de masse musculaire — puis
 * l'isolation, et à niveau égal on privilégie les exercices accessibles.
 */
export type SortOptions = {
  /** Renforcement : la force d'abord. Endurance : la pliométrie a sa place. */
  emphasis?: "strength" | "endurance";
  /**
   * Identifiants à placer en tête. Sert aux mouvements fondamentaux du poids
   * du corps : le catalogue ne dit pas lesquels comptent, et l'ordre
   * alphabétique faisait passer « Isometric Chest Squeezes » avant les pompes.
   */
  preferred?: ReadonlySet<string>;
};

/** Rang de catégorie : plus petit passe d'abord. */
function categoryRank(category: Category | null, emphasis: "strength" | "endurance"): number {
  if (category === "strength") return emphasis === "strength" ? 0 : 1;
  if (category === "plyometrics" || category === "cardio") return emphasis === "strength" ? 1 : 0;
  return 2;
}

export function sortForSession(
  list: CatalogExercise[],
  level: Level,
  options: SortOptions = {}
): CatalogExercise[] {
  const { emphasis = "strength", preferred } = options;
  const levelRank: Record<Level, number> = {
    beginner: 0,
    intermediate: 1,
    expert: 2,
  };
  const ceiling = levelRank[level];
  return [...list]
    .filter((e) => (e.level ? levelRank[e.level] <= ceiling : true))
    .sort((a, b) => {
      if (preferred) {
        const rank = Number(preferred.has(b.id)) - Number(preferred.has(a.id));
        if (rank !== 0) return rank;
      }
      const compound = Number(b.mechanic === "compound") - Number(a.mechanic === "compound");
      if (compound !== 0) return compound;
      const category = categoryRank(a.category, emphasis) - categoryRank(b.category, emphasis);
      if (category !== 0) return category;
      const av = a.level ? levelRank[a.level] : 0;
      const bv = b.level ? levelRank[b.level] : 0;
      if (av !== bv) return av - bv;
      return a.name.localeCompare(b.name);
    });
}
