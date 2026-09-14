import { mergeEngraved, sameEngraved, decideTrophySync, parseEngraved, trophyKey } from "../.tests-build/trophies.mjs";
import { evaluateLadders, derivedUnlocks, LADDERS } from "../.tests-build/achievements.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};

let n = 0;
const seance = (jour, opts = {}) => {
  const { exos = [["Squat", [[100, "10"], [100, "10"]]]] } = opts;
  return {
    id: `s${++n}`, dayId: "j1", dayCode: "J1", dayTitle: "Test",
    startedAt: `${jour}T10:00:00.000`, finishedAt: `${jour}T11:00:00.000`, durationSeconds: 3600,
    exercises: exos.map(([nom, series], i) => ({
      exerciseId: `e${i}`, exerciseName: nom,
      sets: series.map(([poids, reps], j) => ({ setIndex: j, weight: poids, reps, completed: true })),
    })),
  };
};

// --- union
eq("union simple", mergeEngraved({ "a:0": "2026-01-02" }, { "b:1": "2026-01-03" }), { "a:0": "2026-01-02", "b:1": "2026-01-03" });
eq("la date la plus ancienne gagne", mergeEngraved({ "a:0": "2026-05-01" }, { "a:0": "2026-01-01" }), { "a:0": "2026-01-01" });
eq("et dans l'autre sens aussi", mergeEngraved({ "a:0": "2026-01-01" }, { "a:0": "2026-05-01" }), { "a:0": "2026-01-01" });
eq("union vide", mergeEngraved({}, {}), {});
eq("l'union ne retire jamais rien", Object.keys(mergeEngraved({ "a:0": "x" }, {})).length, 1);

// --- égalité
eq("registres identiques", sameEngraved({ "a:0": "x" }, { "a:0": "x" }), true);
eq("dates différentes", sameEngraved({ "a:0": "x" }, { "a:0": "y" }), false);
eq("tailles différentes", sameEngraved({ "a:0": "x" }, { "a:0": "x", "b:0": "y" }), false);
eq("clés différentes, même taille", sameEngraved({ "a:0": "x" }, { "b:0": "x" }), false);

// --- arbitrage
eq("rien à faire", decideTrophySync({ "a:0": "x" }, { "a:0": "x" }), { toStore: null, toPush: null });
eq("le distant apporte du neuf", decideTrophySync({}, { "a:0": "x" }), { toStore: { "a:0": "x" }, toPush: null });
eq("le local apporte du neuf", decideTrophySync({ "a:0": "x" }, {}), { toStore: null, toPush: { "a:0": "x" } });
eq("une seule action par passage", decideTrophySync({ "a:0": "x" }, { "b:0": "y" }).toPush, null);
eq("descente d'abord", decideTrophySync({ "a:0": "x" }, { "b:0": "y" }).toStore, { "a:0": "x", "b:0": "y" });

// --- relecture
eq("registre valide", parseEngraved({ "a:0": "2026-01-01" }), { "a:0": "2026-01-01" });
eq("tableau refusé", parseEngraved([]), null);
eq("date non textuelle refusée", parseEngraved({ "a:0": 3 }), null);
eq("clé sans palier refusée", parseEngraved({ a: "x" }), null);
eq("null refusé", parseEngraved(null), null);

// --- ce que la gravure change
const h = [seance("2026-09-01"), seance("2026-09-02")];
const grave = derivedUnlocks(h, 80);
const cleCharge = trophyKey("charge", 4); // 100 kg
eq("l'historique justifie le palier 100 kg", grave[cleCharge] !== undefined, true);

const etat = (hist, reg) => Object.fromEntries(evaluateLadders(hist, 80, reg).map((p) => [p.ladder.id, p]));
eq("sans gravure, tout disparaît avec l'historique", etat([], {})["charge"].level, 0);
eq("avec gravure, le palier reste", etat([], grave)["charge"].level, 5);
eq("et il garde sa date d'origine", etat([], grave)["charge"].unlockedAt[4], grave[cleCharge]);
eq("le compteur, lui, suit l'historique", etat([], grave)["charge"].value, 0);
eq("le prochain palier tient compte du gravé", etat([], grave)["charge"].next, 120);

// --- une gravure ancienne l'emporte sur un recalcul plus tardif
const ancien = { [trophyKey("seances", 0)]: "2020-01-01T00:00:00.000Z" };
eq("la date gravée prime", etat(h, ancien)["seances"].unlockedAt[0], "2020-01-01T00:00:00.000Z");

// --- un registre inconnu n'invente pas de palier
eq("clé hors échelle ignorée", etat([], { "inconnu:3": "x" }).charge.level, 0);
eq("toutes les échelles restent listées", evaluateLadders([], null, {}).length, LADDERS.length);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
