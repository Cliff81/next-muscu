import type { Outing } from "@/lib/outings";
import type { SessionLog } from "@/lib/types";
import { startOfWeek } from "@/lib/week";

/**
 * Calendrier des séances.
 *
 * La liste des séances passées dit ce qui a été fait ; elle ne dit pas ce qui
 * ne l'a pas été. Un calendrier, si : les trous se voient. Une colonne par
 * semaine, du lundi au dimanche, la semaine en cours à droite ; chaque case
 * porte les séances et les sorties du jour.
 *
 * Rien n'est stocké : tout se relit dans l'historique et le journal des
 * sorties, qui suivent déjà les appareils.
 */

export type DayCell = {
  /** Jour, `AAAA-MM-JJ` en heure locale. */
  date: string;
  sessions: SessionLog[];
  outings: Outing[];
};

/** `AAAA-MM-JJ` d'une date, en heure locale — le jour tel qu'on l'a vécu. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Les `weeks` dernières semaines, la courante incluse, chacune en sept cases.
 *
 * Une séance est rangée au jour où elle a **commencé** : une séance lancée à
 * 23 h 50 appartient à cette soirée-là, pas au lendemain. Les séances non
 * terminées sont ignorées — elles n'ont rien à montrer.
 */
export function calendarWeeks(
  history: SessionLog[],
  outings: Outing[],
  weeks: number,
  now: Date = new Date()
): DayCell[][] {
  const parJour = new Map<string, DayCell>();
  const cellule = (date: string) => {
    let c = parJour.get(date);
    if (!c) {
      c = { date, sessions: [], outings: [] };
      parJour.set(date, c);
    }
    return c;
  };
  for (const seance of history) {
    if (seance.finishedAt === null) continue;
    const debut = new Date(seance.startedAt);
    if (Number.isNaN(debut.getTime())) continue;
    cellule(dayKey(debut)).sessions.push(seance);
  }
  for (const sortie of outings) cellule(sortie.date).outings.push(sortie);

  const lundi = startOfWeek(now);
  lundi.setDate(lundi.getDate() - 7 * (weeks - 1));
  const grille: DayCell[][] = [];
  for (let s = 0; s < weeks; s++) {
    const semaine: DayCell[] = [];
    for (let j = 0; j < 7; j++) {
      const jour = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 7 * s + j);
      const cle = dayKey(jour);
      semaine.push(parJour.get(cle) ?? { date: cle, sessions: [], outings: [] });
    }
    grille.push(semaine);
  }
  return grille;
}

/**
 * Combien de semaines afficher : depuis la première séance, entre un
 * plancher et un plafond. Douze semaines vides ne disent rien ; deux ans de
 * cases non plus.
 */
export function weeksToShow(history: SessionLog[], now: Date = new Date(), min = 12, max = 52): number {
  const debuts = history
    .filter((s) => s.finishedAt !== null)
    .map((s) => new Date(s.startedAt).getTime())
    .filter((t) => !Number.isNaN(t));
  if (!debuts.length) return min;
  const premier = startOfWeek(new Date(Math.min(...debuts))).getTime();
  const courant = startOfWeek(now).getTime();
  const ecart = Math.round((courant - premier) / (7 * 86_400_000)) + 1;
  return Math.max(min, Math.min(max, ecart));
}

/**
 * Semaines d'affilée avec au moins une séance terminée, en remontant depuis
 * la semaine en cours. Une semaine en cours encore vide ne casse rien : on
 * part alors de la précédente — mardi, la semaine n'est pas perdue.
 */
export function weeklyStreak(history: SessionLog[], now: Date = new Date()): number {
  const semaines = new Set<number>();
  for (const seance of history) {
    if (seance.finishedAt === null) continue;
    const debut = new Date(seance.startedAt);
    if (Number.isNaN(debut.getTime())) continue;
    semaines.add(startOfWeek(debut).getTime());
  }
  const courante = startOfWeek(now);
  let curseur = semaines.has(courante.getTime()) ? courante : new Date(courante.getFullYear(), courante.getMonth(), courante.getDate() - 7);
  let n = 0;
  while (semaines.has(curseur.getTime())) {
    n++;
    curseur = new Date(curseur.getFullYear(), curseur.getMonth(), curseur.getDate() - 7);
  }
  return n;
}

export type MonthLabel = { index: number; month: number; year: number };

/**
 * Où poser le nom des mois au-dessus des colonnes : sur la première colonne,
 * puis à chaque colonne dont le lundi change de mois. Une étiquette déborde
 * sur deux colonnes : quand la suivante est trop proche, c'est la première
 * qui s'efface — un mois qui commence vaut mieux qu'un mois qui finit.
 */
export function monthLabels(weeks: DayCell[][]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let precedent = -1;
  weeks.forEach((semaine, index) => {
    const lundi = new Date(`${semaine[0].date}T12:00:00`);
    const mois = lundi.getMonth();
    if (mois !== precedent) {
      labels.push({ index, month: mois, year: lundi.getFullYear() });
      precedent = mois;
    }
  });
  return labels.filter((l, i) => i === labels.length - 1 || labels[i + 1].index - l.index >= 3);
}

export type WeekSummary = {
  /** Les sept jours de la semaine en cours, du lundi au dimanche. */
  days: DayCell[];
  sessions: number;
  outings: number;
  km: number;
};

/** La semaine en cours, résumée pour le bloc « Cette semaine ». */
export function weekSummary(history: SessionLog[], outings: Outing[], now: Date = new Date()): WeekSummary {
  const days = calendarWeeks(history, outings, 1, now)[0];
  const sorties = days.flatMap((d) => d.outings);
  return {
    days,
    sessions: days.reduce((n, d) => n + d.sessions.length, 0),
    outings: sorties.length,
    km: Math.round(sorties.reduce((n, o) => n + (o.km ?? 0), 0) * 10) / 10,
  };
}

export function countSessions(weeks: DayCell[][]): number {
  return weeks.reduce((n, semaine) => n + semaine.reduce((m, jour) => m + jour.sessions.length, 0), 0);
}
