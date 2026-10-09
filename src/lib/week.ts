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

/** Clé de la semaine d'une date : son lundi, en « AAAA-MM-JJ » local. */
export function weekKey(date: Date): string {
  const lundi = startOfWeek(date);
  const mm = String(lundi.getMonth() + 1).padStart(2, "0");
  const jj = String(lundi.getDate()).padStart(2, "0");
  return `${lundi.getFullYear()}-${mm}-${jj}`;
}

/**
 * Comment la semaine s'enchaîne sur la précédente.
 *
 * `restart` : lundi, tout repart de la première journée — le programme est
 * pensé comme un cycle hebdomadaire. `resume` : on continue là où on s'était
 * arrêté — une semaine écourtée ne fait pas sauter les journées manquées.
 */
export type WeekMode = "restart" | "resume";

export type WeekStatus = {
  /** Journées faites cette semaine, avec la date de la dernière séance. */
  done: Map<string, string>;
  /** Prochaine journée à faire, `null` si la semaine est complète. */
  next: string | null;
};

/** La dernière séance terminée avant un instant, portant une journée du programme. */
function lastFinished(days: Day[], history: SessionLog[], before: number): SessionLog | null {
  const connues = new Set(days.map((d) => d.id));
  let derniere: SessionLog | null = null;
  for (const seance of history) {
    if (seance.finishedAt === null || !connues.has(seance.dayId)) continue;
    const quand = new Date(seance.finishedAt).getTime();
    if (Number.isNaN(quand) || quand >= before) continue;
    if (!derniere || seance.finishedAt > (derniere.finishedAt as string)) derniere = seance;
  }
  return derniere;
}

export function weekStatus(
  days: Day[],
  history: SessionLog[],
  now: Date = new Date(),
  mode: WeekMode = "restart"
): WeekStatus {
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

  if (mode === "restart" || !days.some((d) => !done.has(d.id))) {
    const prochaine = days.find((d) => !done.has(d.id));
    return { done, next: prochaine ? prochaine.id : null };
  }

  // Reprise : la journée qui suit la dernière séance faite, en tournant, en
  // sautant celles déjà faites cette semaine.
  const derniere = lastFinished(days, history, fin);
  const depart = derniere ? days.findIndex((d) => d.id === derniere.dayId) : -1;
  for (let k = 1; k <= days.length; k++) {
    const candidate = days[(depart + k) % days.length];
    if (!done.has(candidate.id)) return { done, next: candidate.id };
  }
  return { done, next: null };
}

export type ResumePoint = {
  /** Où l'on s'était arrêté : la dernière journée faite avant cette semaine. */
  lastDayId: string;
  /** Celle qui la suit dans le programme. */
  nextDayId: string;
};

/**
 * Ce que « reprendre » voudrait dire cette semaine, ou `null` s'il n'y a rien
 * à reprendre : aucune séance avant cette semaine, ou un cycle fini — la
 * suite de la dernière journée est la première, et reprendre c'est repartir.
 */
export function resumePoint(days: Day[], history: SessionLog[], now: Date = new Date()): ResumePoint | null {
  if (days.length < 2) return null;
  const derniere = lastFinished(days, history, startOfWeek(now).getTime());
  if (!derniere) return null;
  const index = days.findIndex((d) => d.id === derniere.dayId);
  if (index === -1 || index === days.length - 1) return null;
  return { lastDayId: derniere.dayId, nextDayId: days[index + 1].id };
}
