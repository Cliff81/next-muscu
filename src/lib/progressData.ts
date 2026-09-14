import type { SessionLog } from "@/lib/types";

export function distinctExerciseNames(history: SessionLog[]): string[] {
  const names = new Set<string>();
  history.forEach((session) => session.exercises.forEach((ex) => names.add(ex.exerciseName)));
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export type WeightPoint = {
  date: string;
  label: string;
  maxWeight: number;
  avgWeight: number;
  /** Maximum estimé sur une répétition, formule d'Epley. */
  oneRepMax: number;
};

/**
 * Maximum estimé sur une répétition, d'après une série : Epley,
 * 1RM = charge × (1 + répétitions / 30).
 *
 * C'est ce qui rend comparables 5 × 100 et 8 × 90 — la charge seule ne le
 * permet pas. Au-delà de douze répétitions, la formule s'égare : on s'arrête là.
 * Une répétition rend la charge elle-même.
 */
export function epley(weight: number, reps: number): number | null {
  if (!(weight > 0) || !Number.isInteger(reps) || reps < 1 || reps > 12) return null;
  // La formule donne 103 % de la charge pour une seule répétition : un 1RM
  // estimé au-dessus de ce qu'on vient de soulever une fois n'a pas de sens.
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export type OneRepMax = { value: number; weight: number; reps: number; date: string };

/** Le meilleur 1RM estimé d'un exercice sur tout l'historique, et la série qui le fonde. */
export function bestOneRepMax(history: SessionLog[], exerciseName: string): OneRepMax | null {
  let meilleur: OneRepMax | null = null;
  for (const seance of history) {
    if (!seance.finishedAt) continue;
    for (const exercice of seance.exercises) {
      if (exercice.exerciseName !== exerciseName) continue;
      for (const serie of exercice.sets) {
        if (!serie.completed || serie.weight === null) continue;
        const reps = Number.parseInt(serie.reps, 10);
        const estime = epley(serie.weight, reps);
        if (estime !== null && (meilleur === null || estime > meilleur.value)) {
          meilleur = { value: estime, weight: serie.weight, reps, date: seance.finishedAt };
        }
      }
    }
  }
  return meilleur;
}

export function weightProgressionFor(history: SessionLog[], exerciseName: string): WeightPoint[] {
  return history
    .filter((s) => s.finishedAt)
    .map((s) => {
      const exercise = s.exercises.find((e) => e.exerciseName === exerciseName);
      if (!exercise) return null;
      const faites = exercise.sets.filter((set) => set.completed && set.weight != null && set.weight > 0);
      const weights = faites.map((set) => set.weight as number);
      if (weights.length === 0) return null;
      const max = Math.max(...weights);
      const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
      // Le meilleur 1RM de la séance ; à défaut de série éligible, la charge max
      // elle-même — la courbe ne doit pas avoir de trou.
      const oneRepMax = faites.reduce((m, set) => {
        const e = epley(set.weight as number, Number.parseInt(set.reps, 10));
        return e !== null && e > m ? e : m;
      }, max);
      const date = s.finishedAt as string;
      return {
        date,
        label: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        maxWeight: max,
        avgWeight: Math.round(avg * 10) / 10,
        oneRepMax,
      };
    })
    .filter((p): p is WeightPoint => p !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export type Plateau = {
  /** Séances consécutives sans progrès, la dernière comprise. */
  sessions: number;
  /** Date de la dernière fois où le meilleur a été battu. */
  since: string;
  best: number;
  hint: string;
};

/**
 * Plateau : le meilleur 1RM estimé n'a plus été battu depuis `minSessions`
 * séances où l'exercice a été fait.
 *
 * On regarde le 1RM et non la charge : passer de 5 × 100 à 8 × 100 est un
 * progrès que la charge seule ne voit pas. Le seuil de quatre séances laisse
 * passer les mauvais jours ; en dessous, on crierait au loup à chaque fatigue.
 */
export function detectPlateau(
  history: SessionLog[],
  exerciseName: string,
  minSessions = 4,
  /** Séances à ne pas compter comme un non-progrès — celles d'une semaine allégée. */
  ignore?: (isoDate: string) => boolean
): Plateau | null {
  const points = weightProgressionFor(history, exerciseName).filter((p) => !ignore?.(p.date));
  if (points.length < minSessions + 1) return null;

  let best = -Infinity;
  let bestAt = points[0].date;
  let sansProgres = 0;
  for (const p of points) {
    if (p.oneRepMax > best) {
      best = p.oneRepMax;
      bestAt = p.date;
      sansProgres = 0;
    } else {
      sansProgres++;
    }
  }
  if (sansProgres < minSessions) return null;

  return {
    sessions: sansProgres,
    since: new Date(bestAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" }),
    best,
    hint:
      "Pistes : une série de moins mais plus lourde, une variante du mouvement, ou une semaine allégée avant de repartir.",
  };
}
