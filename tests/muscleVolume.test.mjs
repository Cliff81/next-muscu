import { weeklySetsByGroup } from "../.tests-build/muscleVolume.mjs";
let ko = 0;
const eq = (nom, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); } else console.log(`✓ ${nom}`); };
const lundi = new Date(2026, 8, 14);
const seance = (iso, exos) => ({ id: iso, dayId: "j1", dayCode: "J1", dayTitle: "T", startedAt: iso, finishedAt: iso, durationSeconds: 60,
  exercises: exos.map(([nom, faites, prevues = faites]) => ({ exerciseId: nom, exerciseName: nom, sets: Array.from({ length: prevues }, (_, i) => ({ setIndex: i, weight: 50, reps: "8", completed: i < faites })) })) });
const resolve = (nom) => ({ Bench: ["chest"], Row: ["lats", "middle back"], Squat: ["quadriceps"], Mystere: null, Deadlift: ["hamstrings", "glutes", "lower back"] })[nom] ?? null;
const par = (r) => Object.fromEntries(r.filter((g) => g.sets).map((g) => [g.id, g.sets]));

eq("semaine vide : tous à zéro", weeklySetsByGroup([], resolve, lundi).every((g) => g.sets === 0), true);
eq("tous les groupes listés", weeklySetsByGroup([], resolve, lundi).length, 13);
eq("séries validées par groupe", par(weeklySetsByGroup([seance("2026-09-15T10:00:00", [["Bench", 3], ["Row", 4]])], resolve, lundi)), { chest: 3, back: 4 });
eq("séries non validées exclues", par(weeklySetsByGroup([seance("2026-09-15T10:00:00", [["Bench", 2, 4]])], resolve, lundi)), { chest: 2 });
eq("hors semaine : rien", par(weeklySetsByGroup([seance("2026-09-13T10:00:00", [["Bench", 3]])], resolve, lundi)), {});
eq("borne haute exclue (lundi suivant)", par(weeklySetsByGroup([seance("2026-09-21T00:00:00", [["Bench", 3]])], resolve, lundi)), {});
eq("exercice non résolu ignoré", par(weeklySetsByGroup([seance("2026-09-15T10:00:00", [["Mystere", 3]])], resolve, lundi)), {});
eq("un muscle sur deux groupes du dos ne compte qu'une fois pour Dos", par(weeklySetsByGroup([seance("2026-09-15T10:00:00", [["Row", 2]])], resolve, lundi)), { back: 2 });
eq("un mouvement multi-groupes compte pour chacun", par(weeklySetsByGroup([seance("2026-09-15T10:00:00", [["Deadlift", 2]])], resolve, lundi)), { hamstrings: 2, glutes: 2, lowerback: 2 });
eq("cumul sur plusieurs séances", par(weeklySetsByGroup([seance("2026-09-15T10:00:00", [["Squat", 3]]), seance("2026-09-18T10:00:00", [["Squat", 4]])], resolve, lundi)), { quadriceps: 7 });
console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
