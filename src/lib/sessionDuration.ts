import type { Day, Exercise } from "@/lib/types";

/**
 * Durée estimée d'une séance, calculée sur son contenu réel.
 *
 * Elle était écrite en dur — « 70 min » — et ne bougeait pas quand on ajoutait
 * ou retirait des exercices. Le calcul repose sur trois postes : l'exécution
 * des séries, le repos entre elles, et le temps de passer d'un exercice à
 * l'autre. La marge finale couvre ce qu'aucune formule ne prévoit : régler une
 * machine, attendre qu'un banc se libère, refaire une série ratée.
 *
 * C'est une estimation, pas une promesse. Elle sert à comparer deux séances
 * entre elles et à savoir si l'une tient dans le temps qu'on a.
 */

/** Secondes d'exécution d'une série, d'après ses répétitions. */
export function setSeconds(reps: string): number {
  // Répétitions comptées en durée : c'est la durée elle-même.
  const duree = reps.match(/(\d+)\s*(?:s|sec|secondes?)\b/i);
  if (duree) return Number(duree[1]);
  const nombres = reps.match(/\d+/g)?.map(Number);
  if (!nombres?.length) return 40;
  const milieu = nombres.reduce((a, b) => a + b, 0) / nombres.length;
  // Environ trois secondes par répétition, bornées : une série tient rarement
  // moins de vingt secondes ni plus d'une minute et demie.
  return Math.min(90, Math.max(20, Math.round(milieu * 3)));
}

/** Secondes de transition entre deux exercices : se déplacer, régler, charger. */
const TRANSITION_SECONDS = 60;

/** Marge pour l'imprévu, appliquée au temps de travail. */
const MARGIN = 1.1;

/** Minutes d'échauffement lues sur la fiche du jour, à défaut 8. */
export function warmupMinutes(warmup: string): number {
  const nombres = warmup.match(/\d+/g)?.map(Number);
  if (!nombres?.length) return 8;
  return Math.round(nombres.reduce((a, b) => a + b, 0) / nombres.length);
}

/** Minutes de travail pour une liste d'exercices, hors échauffement. */
export function workMinutes(exercises: Exercise[]): number {
  const seconds = exercises.reduce(
    (total, e) => total + e.series * (setSeconds(e.reps) + e.restSeconds) + TRANSITION_SECONDS,
    0
  );
  return (seconds * MARGIN) / 60;
}

/** Minutes estimées pour une journée entière, échauffement compris. */
export function dayMinutes(day: Day): number {
  const exercises = day.sections.flatMap((s) => s.exercises);
  if (!exercises.length) return 0;
  return workMinutes(exercises) + warmupMinutes(day.restInfo.warmup);
}

/** Arrondi au multiple de cinq le plus proche, jamais sous cinq. */
export function roundMinutes(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** Libellé prêt à afficher : « 60 min », ou « — » pour une journée vide. */
export function durationLabel(day: Day): string {
  const minutes = dayMinutes(day);
  return minutes === 0 ? "—" : `${roundMinutes(minutes)} min`;
}
