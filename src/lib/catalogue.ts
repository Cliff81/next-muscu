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

export type Equipement =
  | "bands" | "barbell" | "body only" | "cable" | "dumbbell" | "e-z curl bar"
  | "exercise ball" | "foam roll" | "kettlebells" | "machine" | "medicine ball"
  | "other";

export type Niveau = "beginner" | "intermediate" | "expert";

export type Categorie =
  | "cardio" | "olympic weightlifting" | "plyometrics" | "powerlifting"
  | "strength" | "stretching" | "strongman";

export type ExerciceCatalogue = {
  id: string;
  name: string;
  muscles: Muscle[];
  secondary: Muscle[];
  equipment: Equipement | null;
  level: Niveau | null;
  force: "push" | "pull" | "static" | null;
  mechanic: "compound" | "isolation" | null;
  category: Categorie | null;
  images: string[];
};

export const MUSCLES_FR: Record<Muscle, string> = {
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

export const EQUIPEMENT_FR: Record<Equipement, string> = {
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

export const NIVEAU_FR: Record<Niveau, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  expert: "Avancé",
};

let enCours: Promise<ExerciceCatalogue[]> | null = null;

/** Télécharge le catalogue une seule fois par session. */
export function chargerCatalogue(): Promise<ExerciceCatalogue[]> {
  if (!enCours) {
    enCours = fetch("/exercices.json")
      .then((r) => {
        if (!r.ok) throw new Error("catalogue");
        return r.json() as Promise<ExerciceCatalogue[]>;
      })
      .catch((err) => {
        // Un échec ne doit pas figer le cache : la prochaine tentative réessaie.
        enCours = null;
        throw err;
      });
  }
  return enCours;
}

/** Exercices ciblant un muscle en premier, matériel disponible respecté. */
export function pourMuscle(
  catalogue: ExerciceCatalogue[],
  muscle: Muscle,
  materiel: Equipement[]
): ExerciceCatalogue[] {
  return catalogue.filter(
    (e) =>
      e.muscles.includes(muscle) &&
      (e.equipment === null || materiel.includes(e.equipment))
  );
}

/**
 * Ordre de préférence pour construire une séance : les mouvements
 * polyarticulaires d'abord — ils chargent le plus de masse musculaire — puis
 * l'isolation, et à niveau égal on privilégie les exercices accessibles.
 */
export function trierPourSeance(
  liste: ExerciceCatalogue[],
  niveau: Niveau
): ExerciceCatalogue[] {
  const rangNiveau: Record<Niveau, number> = {
    beginner: 0,
    intermediate: 1,
    expert: 2,
  };
  const plafond = rangNiveau[niveau];
  return [...liste]
    .filter((e) => (e.level ? rangNiveau[e.level] <= plafond : true))
    .sort((a, b) => {
      const poly = Number(b.mechanic === "compound") - Number(a.mechanic === "compound");
      if (poly !== 0) return poly;
      const av = a.level ? rangNiveau[a.level] : 0;
      const bv = b.level ? rangNiveau[b.level] : 0;
      if (av !== bv) return av - bv;
      return a.name.localeCompare(b.name);
    });
}
