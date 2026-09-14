/**
 * Séries qui se comptent en temps — gainage, cardio.
 *
 * Le programme les écrit en texte : « 30–45 s », « 30 s effort / 90 s récup »,
 * « 1 min ». Sans minuteur, la séance ne les tient pas : on regarde une
 * horloge ailleurs, ou on ne tient rien. La durée retenue est le haut de la
 * fourchette — c'est la cible ; pour un enchaînement, la première durée est
 * l'effort, le reste est du repos que le minuteur de repos connaît déjà.
 */

const DUREE = /(\d+(?:[.,]\d+)?)\s*(?:[–-]|à)?\s*(\d+(?:[.,]\d+)?)?\s*(s|sec|secondes?|min|minutes?)\b/i;

export function timedSeconds(reps: string): number | null {
  const m = reps.match(DUREE);
  if (!m) return null;
  const haut = Number((m[2] ?? m[1]).replace(",", "."));
  const secondes = m[3].toLowerCase().startsWith("min") ? haut * 60 : haut;
  return Number.isFinite(secondes) && secondes > 0 ? Math.round(secondes) : null;
}

export const isTimed = (reps: string): boolean => timedSeconds(reps) !== null;

/** « 45 s », « 1 min », « 1 min 30 s ». */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const reste = s % 60;
  return reste ? `${min} min ${reste} s` : `${min} min`;
}
