/**
 * Montée en charge avant le premier polyarticulaire.
 *
 * Le programme dit « 5–10 min d'échauffement » et s'arrête là. Trois séries
 * légères qui montent vers la charge de travail préparent le geste autant que
 * les articulations, et coûtent trois minutes. Les pourcentages sont ceux
 * d'usage ; les répétitions décroissent pour ne pas fatiguer avant l'heure.
 */

export type WarmupSet = { pct: number; kg: number; reps: number };

const PALIERS: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 8 },
  { pct: 0.6, reps: 5 },
  { pct: 0.8, reps: 3 },
];

/** Arrondi au disque : 2,5 kg. */
const auDisque = (kg: number) => Math.round(kg / 2.5) * 2.5;

/**
 * La montée pour une charge de travail donnée. Vide quand elle n'a pas de sens :
 * charge inconnue, poids du corps, ou si légère que la première série serait
 * la barre à vide.
 */
export function warmupRamp(workingKg: number | null): WarmupSet[] {
  if (workingKg === null || !(workingKg >= 30)) return [];
  const series = PALIERS.map((p) => ({ pct: p.pct, kg: auDisque(workingKg * p.pct), reps: p.reps }));
  // Deux paliers arrondis au même disque ne font qu'un ; et aucun ne doit
  // atteindre la charge de travail.
  return series.filter((s, i) => s.kg < workingKg && (i === 0 || s.kg > series[i - 1].kg));
}
