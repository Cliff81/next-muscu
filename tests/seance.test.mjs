import {
  addExerciseToSession,
  buildSessionFromDay,
  freeSessionExerciseId,
  groupBySection,
  removeExerciseFromSession,
  sessionPlan,
  sessionProgress,
} from "../.tests-build/session.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};

const exo = (id, name, series = 3) => ({ id, name, series, reps: "8–10", restLabel: "2 min repos", restSeconds: 120 });
const day = {
  id: "j1", code: "J1", title: "Haut", description: "", muscleTags: [], tips: [],
  restInfo: { duration: "60 min", warmup: "5 min", suggestedDay: "Lundi" },
  sections: [
    { title: "Pectoraux", muscles: ["chest"], exercises: [exo("j1-a", "Barbell Bench Press", 4), exo("j1-b", "Incline Dumbbell Press")] },
    { title: "Dos", muscles: ["lats"], exercises: [exo("j1-c", "Pull-up")] },
  ],
};
const session = buildSessionFromDay(day);

// --- déroulé
eq("la séance suit le programme", session.exercises.map((e) => e.exerciseId), ["j1-a", "j1-b", "j1-c"]);
eq("le déroulé prend ses fiches dans le programme", sessionPlan(day, session).map((p) => [p.sectionTitle, p.exercise.reps]), [["Pectoraux", "8–10"], ["Pectoraux", "8–10"], ["Dos", "8–10"]]);

// --- ajout en séance
const ajout = exo("ajout-1", "Cable Crossover", 3);
const avecAjout = addExerciseToSession(session, "j1-a", "Pectoraux", ajout);
eq("l'ajout entre juste après l'ancre", avecAjout.exercises.map((e) => e.exerciseId), ["j1-a", "ajout-1", "j1-b", "j1-c"]);
eq("l'ajout a ses séries vierges", avecAjout.exercises[1].sets.map((s) => s.completed), [false, false, false]);
eq("l'ajout emporte sa fiche", avecAjout.exercises[1].added, { sectionTitle: "Pectoraux", exercise: ajout });
eq("le déroulé lit la fiche embarquée", sessionPlan(day, avecAjout)[1].exercise.name, "Cable Crossover");
eq("sans ancre : à la fin", addExerciseToSession(session, null, "Dos", ajout).exercises.at(-1).exerciseId, "ajout-1");
eq("ancre inconnue : à la fin", addExerciseToSession(session, "nope", "Dos", ajout).exercises.at(-1).exerciseId, "ajout-1");
eq("identifiant libre", freeSessionExerciseId(avecAjout), "ajout-2");
eq("premier identifiant", freeSessionExerciseId(session), "ajout-1");
eq("la progression compte l'ajout", sessionProgress(avecAjout).total, 13);

// --- regroupement par catégorie, dans l'ordre d'apparition
eq("regroupé par catégorie", groupBySection(sessionPlan(day, avecAjout)).map((g) => [g.title, g.items.length]), [["Pectoraux", 3], ["Dos", 1]]);
const ajoutDos = addExerciseToSession(avecAjout, "j1-c", "Dos", exo("ajout-2", "Face Pull"));
eq("un ajout en fin de section reste avec sa section", groupBySection(sessionPlan(day, ajoutDos)).map((g) => [g.title, g.items.length]), [["Pectoraux", 3], ["Dos", 2]]);

// --- retrait
eq("un ajout se retire", removeExerciseFromSession(avecAjout, "ajout-1").exercises.map((e) => e.exerciseId), ["j1-a", "j1-b", "j1-c"]);
eq("un exercice du programme ne se retire pas", removeExerciseFromSession(avecAjout, "j1-a").exercises.length, 4);

// --- programme modifié pendant la séance
const sansB = { ...day, sections: [{ ...day.sections[0], exercises: [day.sections[0].exercises[0]] }, day.sections[1]] };
const plan = sessionPlan(sansB, session);
eq("un exercice retiré du programme reste à faire", plan.map((p) => p.exercise.name), ["Barbell Bench Press", "Incline Dumbbell Press", "Pull-up"]);
eq("sans fiche, il est hors programme et muet sur la cible", [plan[1].sectionTitle, plan[1].exercise.reps, plan[1].exercise.series], ["Hors programme", "", 3]);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
