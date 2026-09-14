import type { Day, SessionLog } from "@/lib/types";

/**
 * Où en est la semaine.
 *
 * Le programme s'annonce en séances par semaine ; c'est donc la semaine — du
 * lundi au dimanche, en heure locale — qui sert de cycle. Une journée est
 * « faite » si une séance terminée la porte depuis lundi, et la prochaine est
 * la première, dans l'ordre du programme, qui ne l'est pas encore. Lundi, tout
 * repart : c'est ce que dit le compteur « Séances/sem ».
 *
 * Rien n'est stocké : tout se relit dans l'historique, qui suit déjà les
 * appareils.
 */

/** Lundi 00:00 de la semaine d'une date. */
export function startOfWeek(date: Date): Date {
  const lundi = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  return lundi;
}

export type WeekStatus = {
  /** Journées faites cette semaine, avec la date de la dernière séance. */
  done: Map<string, string>;
  /** Prochaine journée à faire, `null` si la semaine est complète. */
  next: string | null;
};

export function weekStatus(days: Day[], history: SessionLog[], now: Date = new Date()): WeekStatus {
  const debut = startOfWeek(now).getTime();
  const fin = debut + 7 * 86_400_000;

  const done = new Map<string, string>();
  for (const seance of history) {
    if (seance.finishedAt === null) continue;
    const quand = new Date(seance.finishedAt).getTime();
    if (Number.isNaN(quand) || quand < debut || quand >= fin) continue;
    const connue = done.get(seance.dayId);
    if (!connue || seance.finishedAt > connue) done.set(seance.dayId, seance.finishedAt);
  }

  const prochaine = days.find((d) => !done.has(d.id));
  return { done, next: prochaine ? prochaine.id : null };
}
