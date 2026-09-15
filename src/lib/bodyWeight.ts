import { decideEntrySync, live, readStamp, type EntrySync, type Stamped } from "@/lib/entrySync";

/**
 * Journal du poids de corps.
 *
 * Le profil ne portait qu'un poids, saisi une fois dans l'assistant. Pour un
 * objectif de masse ou de sèche, c'est pourtant *la* mesure qui compte, et une
 * mesure sans historique ne dit rien. Une pesée par jour au plus : deux le même
 * jour, c'est la seconde qui vaut — on se pèse le matin, on corrige.
 *
 * Le jour est la clé. Chaque pesée porte sa date de modification et se
 * synchronise pour son compte — voir `entrySync` ; une pesée retirée reste,
 * marquée, pour que le retrait suive les appareils.
 */

export type WeightEntry = Stamped & {
  /** Jour de la pesée, `AAAA-MM-JJ`. */
  date: string;
  kg: number;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const parDate = (a: WeightEntry, b: WeightEntry) => a.date.localeCompare(b.date);

export function sortWeights(list: WeightEntry[]): WeightEntry[] {
  return [...list].sort(parDate);
}

export function parseWeights(valeur: unknown): WeightEntry[] | null {
  if (!Array.isArray(valeur)) return null;
  const vues = new Set<string>();
  const gardees: WeightEntry[] = [];
  for (const e of valeur) {
    if (typeof e !== "object" || e === null) continue;
    const { date, kg, updatedAt, deletedAt } = e as Record<string, unknown>;
    if (typeof date !== "string" || !DATE.test(date)) continue;
    if (typeof kg !== "number" || !Number.isFinite(kg) || kg <= 0 || kg > 500) continue;
    if (vues.has(date)) continue;
    vues.add(date);
    const pesee: WeightEntry = { date, kg: Math.round(kg * 10) / 10, updatedAt: readStamp(updatedAt) };
    if (typeof deletedAt === "number" && Number.isFinite(deletedAt)) pesee.deletedAt = deletedAt;
    gardees.push(pesee);
  }
  return sortWeights(gardees);
}

/** Les pesées à montrer : sans les retirées. */
export const liveWeights: (list: WeightEntry[]) => WeightEntry[] = live;

/** Ajoute ou remplace la pesée d'un jour, datée de l'instant. */
export function addWeight(
  list: WeightEntry[],
  entry: { date: string; kg: number },
  now: number = Date.now()
): WeightEntry[] {
  return sortWeights([
    ...list.filter((e) => e.date !== entry.date),
    { date: entry.date, kg: Math.round(entry.kg * 10) / 10, updatedAt: now },
  ]);
}

/** Marque la pesée d'un jour retirée ; sans effet sur un jour inconnu. */
export function removeWeight(list: WeightEntry[], date: string, now: number = Date.now()): WeightEntry[] {
  return list.map((e) => (e.date === date && e.deletedAt === undefined ? { ...e, deletedAt: now, updatedAt: now } : e));
}

export function latestWeight(list: WeightEntry[]): WeightEntry | null {
  const vivantes = live(list);
  return vivantes.length ? vivantes[vivantes.length - 1] : null;
}

/** Le poids connu à une date : la dernière pesée ce jour-là ou avant. */
export function weightOn(list: WeightEntry[], date: string): number | null {
  let connu: number | null = null;
  for (const e of live(list)) {
    if (e.date > date) break;
    connu = e.kg;
  }
  return connu;
}

export type Trend = { delta: number; days: number; from: WeightEntry; to: WeightEntry };

/**
 * Variation sur les derniers jours : la dernière pesée comparée à la plus
 * récente d'il y a au moins `days` jours. Sans pesée assez ancienne, pas de
 * tendance — une variation sur deux jours n'en est pas une.
 */
export function weightTrend(list: WeightEntry[], days: number): Trend | null {
  const vivantes = live(list);
  const to = latestWeight(vivantes);
  if (!to) return null;
  const limite = new Date(`${to.date}T12:00:00`);
  limite.setDate(limite.getDate() - days);
  const cle = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;
  const anciennes = vivantes.filter((e) => e.date <= cle);
  if (!anciennes.length) return null;
  const from = anciennes[anciennes.length - 1];
  const ecart = Math.round((new Date(`${to.date}T12:00:00`).getTime() - new Date(`${from.date}T12:00:00`).getTime()) / 86_400_000);
  return { delta: Math.round((to.kg - from.kg) * 10) / 10, days: ecart, from, to };
}

/** Fusion pesée par pesée avec le journal distant — voir `entrySync`. */
export function decideWeightsSync(local: WeightEntry[], remote: WeightEntry[]): EntrySync<WeightEntry> {
  const { toStore, toPush } = decideEntrySync(local, remote, (e) => e.date);
  return { toStore: toStore ? sortWeights(toStore) : null, toPush };
}
