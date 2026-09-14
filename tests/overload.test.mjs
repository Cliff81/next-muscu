import { recentPerformances, lastPerformance, suggestNext, describePerformance, increment, repRange } from "../.tests-build/overload.mjs";
let ko = 0;
const eq = (nom, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); } else console.log(`✓ ${nom}`); };
const seance = (id, iso, kg, reps = "8", fait = true) => ({ id, dayId: "j1", dayCode: "J1", dayTitle: "T", startedAt: iso, finishedAt: iso, durationSeconds: 60,
  exercises: [{ exerciseId: "e", exerciseName: "Squat", sets: [{ setIndex: 0, weight: kg, reps, completed: fait }, { setIndex: 1, weight: kg, reps, completed: fait }] }] });
const h = [seance("a", "2026-09-01T10:00:00Z", 60), seance("b", "2026-09-04T10:00:00Z", 62.5), seance("c", "2026-09-08T10:00:00Z", 65), seance("d", "2026-09-11T10:00:00Z", 65, "8", false), seance("e", "2026-09-14T10:00:00Z", 67.5)];

eq("trois dernières, de la plus récente", recentPerformances(h, "Squat").map((p) => p.topWeight), [67.5, 65, 62.5]);
eq("la séance en cours est exclue", recentPerformances(h, "Squat", "e").map((p) => p.topWeight), [65, 62.5, 60]);
eq("une séance sans série validée ne compte pas", recentPerformances(h, "Squat").some((p) => p.date.startsWith("2026-09-11")), false);
eq("nombre réglable", recentPerformances(h, "Squat", undefined, 1).length, 1);
eq("exercice inconnu", recentPerformances(h, "Curl"), []);
eq("lastPerformance = la première des récentes", lastPerformance(h, "Squat").topWeight, 67.5);
eq("lastPerformance sans rien", lastPerformance([], "Squat"), null);
// --- suggestion, inchangée
eq("haut de fourchette partout : augmente", suggestNext({ date: "x", sets: [{ weight: 60, reps: "10" }, { weight: 60, reps: "10" }], topWeight: 60 }, "8–10"), { kind: "increase", from: 60, weight: 62.5 });
eq("pas au haut : tiens", suggestNext({ date: "x", sets: [{ weight: 60, reps: "8" }], topWeight: 60 }, "8–10"), { kind: "hold", weight: 60 });
eq("palier 5 kg au-delà de 100", increment(100), 5);
eq("fourchette lue", repRange("8–10"), { low: 8, high: 10 });
eq("description charge constante", describePerformance({ date: "x", sets: [{ weight: 60, reps: "10" }, { weight: 60, reps: "8" }], topWeight: 60 }), "60 kg × 10, 8");
console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
