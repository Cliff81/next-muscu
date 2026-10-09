import type { Day, Exercise, ExerciseLog, SessionLog, SetLog } from "@/lib/types";

function emptySets(count: number): SetLog[] {
  return Array.from({ length: count }, (_, i) => ({
    setIndex: i,
    weight: null,
    reps: "",
    completed: false,
  }));
}

export function buildSessionFromDay(day: Day): SessionLog {
  const exercises: ExerciseLog[] = day.sections.flatMap((section) =>
    section.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: emptySets(exercise.series),
    }))
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

/** Un exercice de la séance, avec de quoi le dérouler : sa fiche et sa catégorie. */
export type PlannedExercise = {
  sectionTitle: string;
  exercise: Exercise;
  log: ExerciseLog;
};

/**
 * Le déroulé de la séance, dans l'ordre du journal.
 *
 * C'est le journal qui fait foi, pas le programme : un exercice ajouté en
 * séance n'est que là, et un exercice retiré du programme pendant la séance
 * reste à faire. La fiche vient du programme quand il la connaît, du journal
 * sinon ; à défaut des deux, on en reconstitue une, muette sur les cibles.
 */
export function sessionPlan(day: Day, session: SessionLog): PlannedExercise[] {
  const fromDay = new Map<string, { sectionTitle: string; exercise: Exercise }>();
  for (const section of day.sections) {
    for (const exercise of section.exercises) {
      fromDay.set(exercise.id, { sectionTitle: section.title, exercise });
    }
  }
  return session.exercises.map((log) => {
    const known = log.added ?? fromDay.get(log.exerciseId);
    if (known) return { ...known, log };
    return {
      sectionTitle: "Hors programme",
      exercise: {
        id: log.exerciseId,
        name: log.exerciseName,
        series: log.sets.length,
        reps: "",
        restLabel: "",
        restSeconds: 0,
      },
      log,
    };
  });
}

/** Les exercices de la séance regroupés par catégorie, dans l'ordre d'apparition. */
export function groupBySection(plan: PlannedExercise[]): { title: string; items: PlannedExercise[] }[] {
  const groups: { title: string; items: PlannedExercise[] }[] = [];
  for (const item of plan) {
    const last = groups[groups.length - 1];
    if (last && last.title === item.sectionTitle) last.items.push(item);
    else groups.push({ title: item.sectionTitle, items: [item] });
  }
  return groups;
}

/** Un identifiant d'exercice encore libre dans la séance. */
export function freeSessionExerciseId(session: SessionLog): string {
  const used = new Set(session.exercises.map((e) => e.exerciseId));
  for (let n = 1; n < 1000; n++) {
    if (!used.has(`ajout-${n}`)) return `ajout-${n}`;
  }
  return `ajout-${Date.now().toString(36)}`;
}

/**
 * Ajoute un exercice à la séance en cours, juste après `afterExerciseId` — ou
 * à la fin si l'ancre est absente. Il est rangé dans la catégorie indiquée,
 * pour s'afficher avec ses voisins ; la fiche voyage avec le journal.
 */
export function addExerciseToSession(
  session: SessionLog,
  afterExerciseId: string | null,
  sectionTitle: string,
  exercise: Exercise
): SessionLog {
  const log: ExerciseLog = {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: emptySets(exercise.series),
    added: { sectionTitle, exercise },
  };
  const at = session.exercises.findIndex((e) => e.exerciseId === afterExerciseId);
  const exercises =
    at === -1
      ? [...session.exercises, log]
      : [...session.exercises.slice(0, at + 1), log, ...session.exercises.slice(at + 1)];
  return { ...session, exercises };
}

/**
 * Retire un exercice ajouté en séance. Ceux du programme restent : on peut ne
 * pas les faire, pas les effacer — ils comptent dans la progression annoncée.
 */
export function removeExerciseFromSession(session: SessionLog, exerciseId: string): SessionLog {
  return {
    ...session,
    exercises: session.exercises.filter((e) => e.exerciseId !== exerciseId || !e.added),
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
