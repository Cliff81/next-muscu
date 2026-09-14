import { detectPlateau } from "../.tests-build/progressData.mjs";
let ko = 0;
const eq = (nom, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); } else console.log(`✓ ${nom}`); };
const seance = (jour, kg, reps = "5") => ({ id: jour, dayId: "j1", dayCode: "J1", dayTitle: "T", startedAt: `2026-09-${jour}T10:00:00.000`, finishedAt: `2026-09-${jour}T10:00:00.000`, durationSeconds: 60,
  exercises: [{ exerciseId: "e", exerciseName: "Squat", sets: [{ setIndex: 0, weight: kg, reps, completed: true }] }] });

eq("trop peu de séances : rien", detectPlateau([seance("01", 100), seance("02", 100), seance("03", 100), seance("04", 100)], "Squat"), null);
const stagne = ["01","02","03","04","05"].map((j) => seance(j, 100));
eq("cinq séances à 100 : plateau de 4 depuis la première", [detectPlateau(stagne, "Squat").sessions, detectPlateau(stagne, "Squat").best], [4, 116.7]);
eq("date du dernier record", detectPlateau(stagne, "Squat").since.startsWith("01"), true);
const progresse = [seance("01", 100), seance("02", 100), seance("03", 100), seance("04", 100), seance("05", 102.5)];
eq("un record à la dernière séance : pas de plateau", detectPlateau(progresse, "Squat"), null);
const plusDeReps = [seance("01", 100, "5"), seance("02", 100, "5"), seance("03", 100, "5"), seance("04", 100, "5"), seance("05", 100, "8")];
eq("plus de répétitions à même charge = progrès (1RM)", detectPlateau(plusDeReps, "Squat"), null);
const tardif = [seance("01", 100), seance("02", 105), seance("03", 105), seance("04", 105), seance("05", 105), seance("06", 105)];
eq("plateau compté depuis le dernier record, pas depuis le début", detectPlateau(tardif, "Squat").sessions, 4);
eq("exercice absent", detectPlateau(stagne, "Curl"), null);
eq("seuil réglable", detectPlateau(stagne, "Squat", 6), null);
console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
