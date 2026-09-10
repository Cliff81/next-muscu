import type { Day, ExerciseLog, SessionLog, SetLog } from "@/lib/types";

export function buildSessionFromDay(day: Day): SessionLog {
  const exercises: ExerciseLog[] = day.sections.flatMap((section) =>
    section.exercises.map((exercise) => {
      const sets: SetLog[] = Array.from({ length: exercise.series }, (_, i) => ({
        setIndex: i,
        weight: null,
        reps: "",
        completed: false,
      }));
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets,
      };
    })
  );

  return {
    id: crypto.randomUUID(),
    dayId: day.id,
    dayCode: day.code,
    dayTitle: day.title,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationSeconds: null,
    exercises,
  };
}

export function sessionProgress(session: SessionLog): { done: number; total: number; percent: number } {
  const total = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const done = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
