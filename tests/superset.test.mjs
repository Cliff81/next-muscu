import { freshSupersetKey, linkSuperset, splitSupersetBefore, leaveSuperset, supersetLetters } from "../.tests-build/superset.mjs";
import { linkSuperset as linkInProgram, splitSuperset, addExercise, reorderExercises } from "../.tests-build/editProgram.mjs";
import { buildSessionFromDay, sessionPlan, sessionSteps, linkInSession, leaveInSession, addExerciseToSession } from "../.tests-build/session.mjs";
import { workMinutes } from "../.tests-build/sessionDuration.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};

const id = (i) => i.id;
const items = (...keys) => keys.map((k, i) => (k ? { id: `e${i}`, superset: k } : { id: `e${i}` }));
const keys = (list) => list.map((i) => i.superset ?? null);

// --- clés
eq("première clé", freshSupersetKey(items(null, null)), "ss-1");
eq("clé libre", freshSupersetKey(items("ss-1", "ss-1")), "ss-2");

// --- lier
eq("lier deux solitaires", keys(linkSuperset(items(null, null, null), id, "e0", "e1")), ["ss-1", "ss-1", null]);
eq("rejoindre un groupe existant", keys(linkSuperset(items("ss-1", "ss-1", null), id, "e1", "e2")), ["ss-1", "ss-1", "ss-1"]);
eq("fusionner deux groupes", keys(linkSuperset(items("ss-1", "ss-1", "ss-2", "ss-2"), id, "e1", "e2")), ["ss-1", "ss-1", "ss-1", "ss-1"]);
eq("lier un inconnu : rien", keys(linkSuperset(items(null, null), id, "e0", "zz")), [null, null]);
eq("se lier à soi-même : rien", keys(linkSuperset(items(null, null), id, "e0", "e0")), [null, null]);

// --- couper
eq("couper un duo le dissout", keys(splitSupersetBefore(items("ss-1", "ss-1"), id, "e1")), [null, null]);
eq("couper un trio avant le dernier : le duo reste", keys(splitSupersetBefore(items("ss-1", "ss-1", "ss-1"), id, "e2")), ["ss-1", "ss-1", null]);
eq("couper un trio avant le deuxième : le duo d'après reste", keys(splitSupersetBefore(items("ss-1", "ss-1", "ss-1"), id, "e1")), [null, "ss-2", "ss-2"]);
eq("couper un quatuor au milieu : deux duos", keys(splitSupersetBefore(items("ss-1", "ss-1", "ss-1", "ss-1"), id, "e2")), ["ss-1", "ss-1", "ss-2", "ss-2"]);
eq("couper hors groupe : rien", keys(splitSupersetBefore(items(null, "ss-1", "ss-1"), id, "e0")), [null, "ss-1", "ss-1"]);
eq("quitter un trio", keys(leaveSuperset(items("ss-1", "ss-1", "ss-1"), id, "e1")), ["ss-1", null, "ss-1"]);
eq("quitter un duo le dissout", keys(leaveSuperset(items("ss-1", "ss-1"), id, "e0")), [null, null]);

// --- lettres
eq("lettres dans l'ordre d'apparition", [...supersetLetters(items("ss-9", null, "ss-9", "ss-2")).entries()], [["ss-9", "A"], ["ss-2", "B"]]);

// --- programme
const exo = (id, name, series = 3, restSeconds = 60) => ({ id, name, series, reps: "10–12", restLabel: `${restSeconds} s repos`, restSeconds });
const day = {
  id: "j1", code: "J1", title: "Haut", description: "", muscleTags: [], tips: [],
  restInfo: { duration: "60 min", warmup: "5 min", suggestedDay: "Lundi" },
  sections: [
    { title: "Pectoraux", muscles: ["chest"], exercises: [exo("a", "Bench", 4, 120), exo("b", "Flyes", 3, 60), exo("c", "Dips", 3, 90)] },
    { title: "Dos", muscles: ["lats"], exercises: [exo("d", "Pull-up")] },
  ],
};
const program = { tag: "", title: "P", titleAccent: "1 jour", subtitle: "", statsRow: [], days: [day], nutrition: [] };
const pecs = (p) => p.days[0].sections[0].exercises.map((e) => e.superset ?? null);
const lie = linkInProgram(program, "j1", "a", "b");
eq("programme : lier a et b", pecs(lie), ["ss-1", "ss-1", null]);
eq("programme : deux catégories ne se lient pas", pecs(linkInProgram(program, "j1", "a", "d")), [null, null, null]);
eq("programme : couper", pecs(splitSuperset(lie, "j1", "b")), [null, null, null]);
eq("programme : réordonner garde les clés", keys(reorderExercises(lie, "j1", 0, ["c", "b", "a"]).days[0].sections[0].exercises), [null, "ss-1", "ss-1"]);

// --- durée : le repos compte par tour
const seuls = [exo("a", "Bench", 3, 120), exo("b", "Flyes", 3, 120)];
const ensemble = seuls.map((e) => ({ ...e, superset: "ss-1" }));
eq("durée : le repos d'un super-set compte une fois par tour", Math.round((workMinutes(seuls) - workMinutes(ensemble)) * 60 / 1.1), 3 * 120);

// --- séance : tours alternés
const session = buildSessionFromDay(lie.days[0]);
eq("la séance copie le super-set du programme", session.exercises.map((e) => e.superset ?? null), ["ss-1", "ss-1", null, null]);
const steps = sessionSteps(sessionPlan(lie.days[0], session));
eq("tours alternés, le plus long finit seul", steps.map((s) => `${s.exerciseId}${s.setIndex + 1}`), ["a1", "b1", "a2", "b2", "a3", "b3", "a4", "c1", "c2", "c3", "d1", "d2", "d3"]);
eq("enchaîné au milieu du tour, repos à la fin", steps.slice(0, 4).map((s) => [s.chained, s.restSeconds]), [[true, 0], [false, 120], [true, 0], [false, 120]]);
eq("le repos du tour est le plus long des membres", steps[1].restLabel, "120 s repos");
eq("le dernier tour du plus long n'enchaîne rien", [steps[6].chained, steps[6].restSeconds], [false, 120]);
eq("les partenaires sont nommés", steps[0].superset.partners, ["Flyes"]);
eq("hors super-set : rien", [steps[7].superset, steps[7].chained], [null, false]);

// --- séance : nouer en cours de route
const ajout = exo("ajout-1", "Cable Crossover", 3, 60);
const nouee = linkInSession(addExerciseToSession(session, "c", "Pectoraux", ajout), "c", "ajout-1");
eq("nouer en séance", nouee.exercises.map((e) => e.superset ?? null), ["ss-1", "ss-1", "ss-2", "ss-2", null]);
eq("le déroulé alterne le nouveau duo", sessionSteps(sessionPlan(lie.days[0], nouee)).map((s) => s.exerciseId).slice(7, 13), ["c", "ajout-1", "c", "ajout-1", "c", "ajout-1"]);

// --- séance : dénouer
eq("sortir d'un duo le dissout", leaveInSession(session, "a").exercises.map((e) => e.superset ?? null), [null, null, null, null]);
const trio = linkInSession(session, "a", "c");
eq("rejoindre un duo en séance", trio.exercises.map((e) => e.superset ?? null), ["ss-1", "ss-1", "ss-1", null]);
eq("sortir d'un trio laisse le duo", leaveInSession(trio, "b").exercises.map((e) => e.superset ?? null), ["ss-1", null, "ss-1", null]);
eq("le déroulé suit : a et c alternent, b seul", sessionSteps(sessionPlan(lie.days[0], leaveInSession(trio, "b"))).map((s) => s.exerciseId).slice(0, 6), ["a", "c", "a", "c", "a", "c"]);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
