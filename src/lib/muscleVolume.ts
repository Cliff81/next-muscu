import type { Muscle } from "@/lib/catalog";
import { MUSCLE_GROUPS } from "@/lib/generateProgram";
import type { SessionLog } from "@/lib/types";

/**
 * Séries validées par groupe musculaire sur une semaine.
 *
 * L'historique ne porte que des noms d'exercices : à qui les rattacher est
 * l'affaire de l'appelant, par le catalogue ou par le programme — d'où le
 * `resolve`. Une série compte une fois par groupe touché en muscle principal ;
 * les muscles secondaires ne comptent pas, sinon tout serait « épaules ».
 */
export type MuscleResolver = (exerciseName: string, exerciseId: string) => Muscle[] | null;

export type GroupVolume = { id: string; name: string; sets: number };

export function weeklySetsByGroup(
  history: SessionLog[],
  resolve: MuscleResolver,
  weekStart: Date
): GroupVolume[] {
  const debut = weekStart.getTime();
  const fin = debut + 7 * 86_400_000;
  const compte = new Map<string, number>(MUSCLE_GROUPS.map((g) => [g.id, 0]));

  for (const seance of history) {
    if (!seance.finishedAt) continue;
    const quand = new Date(seance.finishedAt).getTime();
    if (Number.isNaN(quand) || quand < debut || quand >= fin) continue;
    for (const exercice of seance.exercises) {
      const faites = exercice.sets.filter((s) => s.completed).length;
      if (!faites) continue;
      const muscles = resolve(exercice.exerciseName, exercice.exerciseId);
      if (!muscles?.length) continue;
      const groupes = new Set(
        MUSCLE_GROUPS.filter((g) => g.muscles.some((m) => muscles.includes(m))).map((g) => g.id)
      );
      for (const id of groupes) compte.set(id, (compte.get(id) ?? 0) + faites);
    }
  }

  return MUSCLE_GROUPS.map((g) => ({ id: g.id, name: g.name, sets: compte.get(g.id) ?? 0 }));
}
