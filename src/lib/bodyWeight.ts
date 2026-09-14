import { decideByTimestamp } from "@/lib/lastWrite";

/**
 * Journal du poids de corps.
 *
 * Le profil ne portait qu'un poids, saisi une fois dans l'assistant. Pour un
 * objectif de masse ou de sèche, c'est pourtant *la* mesure qui compte, et une
 * mesure sans historique ne dit rien. Une pesée par jour au plus : deux le même
 * jour, c'est la seconde qui vaut — on se pèse le matin, on corrige.
 */

export type WeightEntry = {
  /** Jour de la pesée, `AAAA-MM-JJ`. */
  date: string;
  kg: number;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseWeights(valeur: unknown): WeightEntry[] | null {
  if (!Array.isArray(valeur)) return null;
  const vues = new Set<string>();
  const gardees: WeightEntry[] = [];
  for (const e of valeur) {
    if (typeof e !== "object" || e === null) continue;
    const { date, kg } = e as Record<string, unknown>;
    if (typeof date !== "string" || !DATE.test(date)) continue;
    if (typeof kg !== "number" || !Number.isFinite(kg) || kg <= 0 || kg > 500) continue;
    if (vues.has(date)) continue;
    vues.add(date);
    gardees.push({ date, kg: Math.round(kg * 10) / 10 });
  }
  return gardees.sort((a, b) => a.date.localeCompare(b.date));
}

export function addWeight(list: WeightEntry[], entry: WeightEntry): WeightEntry[] {
  return [...list.filter((e) => e.date !== entry.date), { ...entry, kg: Math.round(entry.kg * 10) / 10 }].sort(
    (a, b) => a.date.localeCompare(b.date)
  );
}

export function removeWeight(list: WeightEntry[], date: string): WeightEntry[] {
  return list.filter((e) => e.date !== date);
}

export function latestWeight(list: WeightEntry[]): WeightEntry | null {
  return list.length ? list[list.length - 1] : null;
}

/** Le poids connu à une date : la dernière pesée ce jour-là ou avant. */
export function weightOn(list: WeightEntry[], date: string): number | null {
  let connu: number | null = null;
  for (const e of list) {
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
  const to = latestWeight(list);
  if (!to) return null;
  const limite = new Date(`${to.date}T12:00:00`);
  limite.setDate(limite.getDate() - days);
  const cle = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;
  const anciennes = list.filter((e) => e.date <= cle);
  if (!anciennes.length) return null;
  const from = anciennes[anciennes.length - 1];
  const ecart = Math.round((new Date(`${to.date}T12:00:00`).getTime() - new Date(`${from.date}T12:00:00`).getTime()) / 86_400_000);
  return { delta: Math.round((to.kg - from.kg) * 10) / 10, days: ecart, from, to };
}

export type RemoteWeights = { entries: unknown; updatedAt: number } | null;

export type WeightsSyncDecision =
  | { action: "pull"; entries: unknown; updatedAt: number }
  | { action: "push" }
  | { action: "none" };

/** Même règle que le programme : une pesée se corrige et se supprime. */
export function decideWeightsSync(
  local: WeightEntry[],
  touchedAt: number,
  remote: RemoteWeights
): WeightsSyncDecision {
  const decision = decideByTimestamp(
    local,
    touchedAt,
    remote === null ? null : { value: remote.entries, updatedAt: remote.updatedAt }
  );
  return decision.action === "pull"
    ? { action: "pull", entries: decision.value, updatedAt: decision.updatedAt }
    : decision;
}
