"use client";

import { createLocalStore } from "@/lib/createLocalStore";

/** Mémorise que l'assistant a été mené à son terme, pour ne pas le rejouer. */
export const onboardingStore = createLocalStore<boolean>("muscu:assistant", false);

export type Step =
  | "you"
  | "goal"
  | "library"
  | "place"
  | "pain"
  | "frequency"
  | "time"
  | "build"
  | "type"
  | "days"
  | "nutrition";

/**
 * Ce que change chaque fréquence. Volontairement nuancé : « plus de jours =
 * plus de progrès » n'est vrai que jusqu'au point où la récupération devient
 * le facteur limitant, et l'annoncer sans réserve serait trompeur.
 */
export const FREQUENCIES: { days: number; note: string }[] = [
  { days: 2, note: "Suffisant pour progresser en débutant, avec des séances complètes." },
  { days: 3, note: "Bon équilibre pour démarrer : chaque muscle est sollicité souvent." },
  { days: 4, note: "Plus de volume par muscle, récupération encore confortable." },
  { days: 5, note: "Beaucoup de volume : c'est là que la progression est la plus rapide." },
  { days: 6, note: "Volume maximal, mais la récupération devient le facteur limitant." },
];

/** Temps disponible par séance, en minutes. */
export const SESSION_TIMES: { minutes: number; note: string }[] = [
  { minutes: 30, note: "Court : deux ou trois exercices, à intensité soutenue." },
  { minutes: 45, note: "Suffisant pour un travail sérieux sur un groupe musculaire." },
  { minutes: 60, note: "Le format le plus courant : échauffement, quatre à cinq exercices." },
  { minutes: 75, note: "Confortable : du volume sans courir." },
  { minutes: 90, note: "Long : pour du volume important, si la récupération suit." },
];
