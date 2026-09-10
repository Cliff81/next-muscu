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
};

export function weightProgressionFor(history: SessionLog[], exerciseName: string): WeightPoint[] {
  return history
    .filter((s) => s.finishedAt)
    .map((s) => {
      const exercise = s.exercises.find((e) => e.exerciseName === exerciseName);
      if (!exercise) return null;
      const weights = exercise.sets
        .filter((set) => set.completed)
        .map((set) => set.weight)
        .filter((w): w is number => w != null && w > 0);
      if (weights.length === 0) return null;
      const max = Math.max(...weights);
      const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
      const date = s.finishedAt as string;
      return {
        date,
        label: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        maxWeight: max,
        avgWeight: Math.round(avg * 10) / 10,
      };
    })
    .filter((p): p is WeightPoint => p !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
