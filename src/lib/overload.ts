import { decimal } from "@/lib/format";
import type { SessionLog } from "@/lib/types";

/**
 * Surcharge progressive : que soulever aujourd'hui, au vu de la dernière fois.
 *
 * L'application enregistrait les charges sans jamais s'en resservir — devant la
 * barre, il fallait se souvenir de tête. Ces fonctions relisent l'historique
 * pour dire ce qui a été fait et ce qu'il est raisonnable de tenter.
 *
 * Le rapprochement se fait par **nom de mouvement** et non par identifiant de
 * créneau : un créneau garde son identifiant quand on y remplace l'exercice, et
 * l'historique d'un développé couché n'a rien à dire sur les écartés qui l'ont
 * remplacé.
 */

export type RepRange = { low: number; high: number };

/**
 * Fourchette de répétitions visée. `null` quand l'exercice se compte en durée
 * — gainage, cardio : il n'y a pas de charge à faire progresser ainsi.
 */
export function repRange(reps: string): RepRange | null {
  if (/\d\s*(s|sec|secondes?|min|minutes?)\b/i.test(reps)) return null;
  const numbers = reps.match(/\d+/g)?.map(Number);
  if (!numbers?.length) return null;
  return { low: Math.min(...numbers), high: Math.max(...numbers) };
}

export type PerformedSet = { weight: number | null; reps: string };

export type LastPerformance = {
  /** Date de fin de la séance, en ISO. */
  date: string;
  /** Séries effectivement validées, dans l'ordre. */
  sets: PerformedSet[];
  /** Charge la plus lourde validée, ou `null` au poids du corps. */
  topWeight: number | null;
};

/**
 * Dernière fois que ce mouvement a été fait, séance en cours exclue.
 *
 * Seules les séries **validées** comptent : une série préparée mais non faite
 * est une intention, pas un résultat.
 */
export function lastPerformance(
  history: SessionLog[],
  exerciseName: string,
  excludeSessionId?: string
): LastPerformance | null {
  const candidates = history
    .filter((s) => s.finishedAt && s.id !== excludeSessionId)
    .sort((a, b) => (b.finishedAt as string).localeCompare(a.finishedAt as string));

  for (const session of candidates) {
    const exercise = session.exercises.find((e) => e.exerciseName === exerciseName);
    if (!exercise) continue;
    const sets = exercise.sets
      .filter((s) => s.completed)
      .map((s) => ({ weight: s.weight, reps: s.reps }));
    if (!sets.length) continue;
    const weights = sets.map((s) => s.weight).filter((w): w is number => w !== null && w > 0);
    return {
      date: session.finishedAt as string,
      sets,
      topWeight: weights.length ? Math.max(...weights) : null,
    };
  }
  return null;
}

/**
 * Palier d'augmentation. Deux valeurs plutôt qu'un pourcentage : ce sont les
 * disques qui décident, et 1,25 kg par côté est le plus petit saut courant.
 * Au-delà de 100 kg, le mouvement supporte 5 kg sans changer de difficulté
 * perçue.
 */
export function increment(weight: number): number {
  return weight >= 100 ? 5 : 2.5;
}

export type Suggestion =
  | { kind: "increase"; weight: number; from: number }
  | { kind: "hold"; weight: number }
  | { kind: "reps" }
  | null;

/**
 * Que tenter aujourd'hui.
 *
 * La règle est celle de la double progression : on ne monte la charge qu'une
 * fois le haut de la fourchette tenu sur **toutes** les séries. Monter avant
 * cela fait perdre les répétitions gagnées.
 */
export function suggestNext(last: LastPerformance | null, targetReps: string): Suggestion {
  if (!last) return null;
  const range = repRange(targetReps);
  if (!range) return null;

  const done = last.sets.map((s) => {
    const n = s.reps.match(/\d+/);
    return n ? Number(n[0]) : 0;
  });
  const allAtTop = done.length > 0 && done.every((r) => r >= range.high);

  if (last.topWeight === null) {
    return allAtTop ? { kind: "reps" } : null;
  }
  if (allAtTop) {
    return {
      kind: "increase",
      from: last.topWeight,
      weight: last.topWeight + increment(last.topWeight),
    };
  }
  return { kind: "hold", weight: last.topWeight };
}

/** « 80 kg × 10, 10, 8 », ou « 12, 12, 10 répétitions » au poids du corps. */
export function describePerformance(last: LastPerformance): string {
  const reps = last.sets.map((s) => s.reps.match(/\d+/)?.[0] ?? s.reps).join(", ");
  if (last.topWeight === null) return `${reps} répétitions`;
  const charges = new Set(last.sets.map((s) => s.weight));
  // Charge constante : on l'annonce une fois. Sinon, série par série.
  if (charges.size === 1) return `${decimal(last.topWeight)} kg × ${reps}`;
  return last.sets
    .map((s) => `${s.weight === null ? "—" : decimal(s.weight)} kg × ${s.reps.match(/\d+/)?.[0] ?? s.reps}`)
    .join(", ");
}
