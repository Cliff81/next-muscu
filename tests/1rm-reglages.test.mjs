import { epley, bestOneRepMax, weightProgressionFor } from "../.tests-build/progressData.mjs";
import { parseSettings, sameSettings, DEFAULT_SETTINGS } from "../.tests-build/settings.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};

// --- Epley
eq("une répétition rend la charge", epley(100, 1), 100);
eq("5 × 100 → 116,7", epley(100, 5), 116.7);
eq("8 × 90 → 114", epley(90, 8), 114);
eq("donc 5 × 100 bat 8 × 90", epley(100, 5) > epley(90, 8), true);
eq("au-delà de douze répétitions, rien", epley(60, 15), null);
eq("charge nulle, rien", epley(0, 8), null);
eq("répétitions illisibles, rien", epley(80, NaN), null);
eq("répétitions non entières, rien", epley(80, 7.5), null);

// --- meilleur 1RM sur l'historique
const seance = (iso, sets, nom = "Squat") => ({
  id: iso, dayId: "j1", dayCode: "J1", dayTitle: "T", startedAt: iso, finishedAt: iso, durationSeconds: 60,
  exercises: [{ exerciseId: "e", exerciseName: nom, sets: sets.map(([w, r, c = true], i) => ({ setIndex: i, weight: w, reps: r, completed: c })) }],
});
const h = [
  seance("2026-09-01T10:00:00.000", [[80, "10"], [90, "6"]]),
  seance("2026-09-08T10:00:00.000", [[100, "5"], [100, "3"]]),
  seance("2026-09-10T10:00:00.000", [[110, "2", false]]),
];
const best = bestOneRepMax(h, "Squat");
eq("le meilleur est 5 × 100", [best.value, best.weight, best.reps], [116.7, 100, 5]);
eq("daté de la séance qui le fonde", best.date.slice(0, 10), "2026-09-08");
eq("une série non cochée ne compte pas", bestOneRepMax([seance("2026-09-10T10:00:00.000", [[200, "1", false]])], "Squat"), null);
eq("exercice inconnu", bestOneRepMax(h, "Curl"), null);
eq("historique vide", bestOneRepMax([], "Squat"), null);

// --- la courbe porte le 1RM
const pts = weightProgressionFor(h, "Squat");
eq("un point par séance avec charge", pts.length, 2);
eq("1RM du premier point : le meilleur de la séance", pts[0].oneRepMax, epley(90, 6));
eq("jamais en dessous de la charge max", pts.every((p) => p.oneRepMax >= p.maxWeight), true);
eq("séries hors Epley : la charge max fait foi", weightProgressionFor([seance("2026-09-11T10:00:00.000", [[50, "20"]])], "Squat")[0].oneRepMax, 50);

// --- réglages
eq("valeurs par défaut", parseSettings({}), DEFAULT_SETTINGS);
eq("partiel complété", parseSettings({ preAlert: 10 }), { ...DEFAULT_SETTINGS, preAlert: 10 });
eq("pré-alerte hors liste refusée", parseSettings({ preAlert: 7 }), null);
eq("nuance inconnue refusée", parseSettings({ nutritionTheme: "sepia" }), null);
eq("non-objet refusé", parseSettings("x"), null);
eq("null refusé", parseSettings(null), null);
eq("égalité", sameSettings({ ...DEFAULT_SETTINGS }, DEFAULT_SETTINGS), true);
eq("différence", sameSettings({ ...DEFAULT_SETTINGS, sound: false }, DEFAULT_SETTINGS), false);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
