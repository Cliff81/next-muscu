/**
 * Semaine allégée.
 *
 * Quand un exercice plafonne, s'acharner n'aide pas : une semaine à charge
 * réduite laisse récupérer, puis on repart — c'est ce qu'un coach ferait. Le
 * programme lui-même ne change pas ; seule la charge **suggérée** baisse, sur
 * cet exercice, jusqu'à une date. Passé la date, tout redevient normal sans
 * qu'on ait rien à remettre.
 *
 * Décidé sur un appareil, appliqué sur l'autre : le registre suit le profil.
 */

export type Deload = {
  exerciseName: string;
  /** Début et fin, en ISO. Actif quand `from ≤ maintenant < until`. */
  from: string;
  until: string;
  /** Part de la charge de travail conservée. */
  factor: number;
};

export const DELOAD_DAYS = 7;
export const DELOAD_FACTOR = 0.9;

export function parseDeloads(valeur: unknown): Deload[] | null {
  if (!Array.isArray(valeur)) return null;
  return valeur.flatMap((e) => {
    if (typeof e !== "object" || e === null) return [];
    const { exerciseName, from, until, factor } = e as Record<string, unknown>;
    if (typeof exerciseName !== "string" || !exerciseName) return [];
    if (typeof from !== "string" || typeof until !== "string") return [];
    if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(until))) return [];
    const f = typeof factor === "number" && factor > 0 && factor < 1 ? factor : DELOAD_FACTOR;
    return [{ exerciseName, from, until, factor: f }];
  });
}

/** Lance une semaine allégée ; en relancer une remplace la précédente. */
export function startDeload(list: Deload[], exerciseName: string, now: Date = new Date()): Deload[] {
  const until = new Date(now);
  until.setDate(until.getDate() + DELOAD_DAYS);
  return [
    ...list.filter((d) => d.exerciseName !== exerciseName),
    { exerciseName, from: now.toISOString(), until: until.toISOString(), factor: DELOAD_FACTOR },
  ];
}

export function stopDeload(list: Deload[], exerciseName: string): Deload[] {
  return list.filter((d) => d.exerciseName !== exerciseName);
}

export function activeDeload(list: Deload[], exerciseName: string, now: Date = new Date()): Deload | null {
  const t = now.getTime();
  return (
    list.find(
      (d) => d.exerciseName === exerciseName && Date.parse(d.from) <= t && t < Date.parse(d.until)
    ) ?? null
  );
}

/** Une semaine finie n'a plus rien à dire : on l'oublie. */
export function purgeExpired(list: Deload[], now: Date = new Date()): Deload[] {
  const t = now.getTime();
  return list.filter((d) => Date.parse(d.until) > t);
}

/** La charge allégée, aux disques. */
export function deloadWeight(weight: number, factor: number = DELOAD_FACTOR): number {
  return Math.max(0, Math.round((weight * factor) / 2.5) * 2.5);
}

/** Une séance faite pendant l'allègement ne compte pas comme un non-progrès. */
export function inDeload(list: Deload[], exerciseName: string, iso: string): boolean {
  const t = Date.parse(iso);
  return list.some(
    (d) => d.exerciseName === exerciseName && Date.parse(d.from) <= t && t < Date.parse(d.until)
  );
}
