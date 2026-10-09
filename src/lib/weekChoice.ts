import { resumePoint, weekKey, weekStatus, type WeekMode } from "@/lib/week";
import type { Day, SessionLog } from "@/lib/types";

/**
 * Le choix fait en début de semaine : repartir de la première journée, ou
 * reprendre là où l'on s'était arrêté.
 *
 * Il ne vaut que pour sa semaine : lundi suivant, la question se repose. Pris
 * sur un appareil, il suit le profil vers l'autre — sans cela, chacun
 * annoncerait une prochaine séance différente.
 */
export type WeekChoice = {
  /** La semaine concernée, par son lundi — voir `weekKey`. */
  week: string;
  mode: WeekMode;
  /** Quand le choix a été fait, en ISO : entre deux appareils, le plus récent l'emporte. */
  decidedAt: string;
};

export function parseWeekChoice(value: unknown): WeekChoice | null {
  if (typeof value !== "object" || value === null) return null;
  const { week, mode, decidedAt } = value as Record<string, unknown>;
  if (typeof week !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  if (mode !== "restart" && mode !== "resume") return null;
  if (typeof decidedAt !== "string" || Number.isNaN(Date.parse(decidedAt))) return null;
  return { week, mode, decidedAt };
}

/** Le mode de la semaine en cours : celui choisi pour elle, sinon on repart. */
export function activeMode(choice: WeekChoice | null, now: Date = new Date()): WeekMode {
  return choice && choice.week === weekKey(now) ? choice.mode : "restart";
}

/** Entre deux choix, lequel garder : la semaine la plus récente, puis la décision la plus récente. */
export function newerChoice(a: WeekChoice | null, b: WeekChoice | null): WeekChoice | null {
  if (!a) return b;
  if (!b) return a;
  if (a.week !== b.week) return a.week > b.week ? a : b;
  return a.decidedAt >= b.decidedAt ? a : b;
}

/**
 * Faut-il poser la question ? Seulement en début de semaine — rien de fait
 * encore —, quand rien n'a été décidé pour elle, et quand il y a vraiment
 * quelque chose à reprendre.
 */
export function needsWeekChoice(
  days: Day[],
  history: SessionLog[],
  choice: WeekChoice | null,
  now: Date = new Date()
): boolean {
  if (choice && choice.week === weekKey(now)) return false;
  if (weekStatus(days, history, now).done.size > 0) return false;
  return resumePoint(days, history, now) !== null;
}

export function decide(mode: WeekMode, now: Date = new Date()): WeekChoice {
  return { week: weekKey(now), mode, decidedAt: now.toISOString() };
}
