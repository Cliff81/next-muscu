import {
  LADDERS, TIER_COUNT, evaluateLadders, tiersUnlockedBy, nextGoals, tierLabel, quantity,
  emptyTally, addSession,
} from "../.tests-build/achievements.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};

let n = 0;
const seance = (jour, opts = {}) => {
  const { heure = 10, exos = [["Développé couché", [[40, "10"], [40, "10"]]]], duree = 3600, partielle = false } = opts;
  const h = String(heure).padStart(2, "0");
  return {
    id: `s${++n}`, dayId: "j1", dayCode: "J1", dayTitle: "Test",
    startedAt: `${jour}T${h}:00:00.000`, finishedAt: `${jour}T${h}:59:00.000`,
    durationSeconds: duree,
    exercises: exos.map(([nom, series], i) => ({
      exerciseId: `e${i}`, exerciseName: nom,
      sets: series.map(([poids, reps], j) => ({ setIndex: j, weight: poids, reps, completed: !(partielle && j === 0) })),
    })),
  };
};
const etat = (h, poids = null) => Object.fromEntries(evaluateLadders(h, poids).map((p) => [p.ladder.id, p]));

// --- forme des définitions
eq("identifiants uniques", new Set(LADDERS.map((l) => l.id)).size, LADDERS.length);
eq("noms uniques", new Set(LADDERS.map((l) => l.name)).size, LADDERS.length);
eq("paliers croissants", LADDERS.every((l) => l.tiers.every((t, i) => i === 0 || t > l.tiers[i - 1])), true);
eq("paliers positifs", LADDERS.every((l) => l.tiers.length > 0 && l.tiers[0] > 0), true);
eq("total des paliers", TIER_COUNT, LADDERS.reduce((n, l) => n + l.tiers.length, 0));

// --- historique vide
const vide = evaluateLadders([]);
eq("aucun palier sans séance", vide.reduce((n, p) => n + p.level, 0), 0);
eq("le premier palier est le prochain", vide.every((p) => p.next === p.ladder.tiers[0]), true);

// --- une séance
const une = etat([seance("2026-09-01")]);
eq("une séance franchit le premier palier", une["seances"].level, 1);
eq("prochain palier = 10 séances", une["seances"].next, 10);
eq("date du palier", une["seances"].unlockedAt[0].slice(0, 10), "2026-09-01");
eq("paliers suivants sans date", une["seances"].unlockedAt.slice(1).every((d) => d === null), true);

// --- une échelle gravie d'un coup
const lourde = seance("2026-09-01", { exos: [["Squat", [[100, "5"]]]] });
const charge = etat([lourde])["charge"];
eq("100 kg franchit cinq paliers", charge.level, 5);
eq("prochain palier après 100 kg", charge.next, 120);
eq("un seul palier annoncé par échelle", tiersUnlockedBy(evaluateLadders([lourde]), lourde.finishedAt).filter((t) => t.ladder.id === "charge").length, 1);
eq("et c'est le plus haut", tiersUnlockedBy(evaluateLadders([lourde]), lourde.finishedAt).find((t) => t.ladder.id === "charge").tier, 100);

// --- ce que la dernière séance ouvre
const dix = Array.from({ length: 10 }, (_, i) => seance(`2026-09-${String(i + 1).padStart(2, "0")}`));
const ouverts = tiersUnlockedBy(evaluateLadders(dix), dix[9].finishedAt).map((t) => `${t.ladder.id}:${t.tier}`);
eq("le dixième jour ouvre les dix séances", ouverts.includes("seances:10"), true);
eq("il n'ouvre pas le premier palier", ouverts.includes("seances:1"), false);
eq("rien d'ouvert à une date sans séance", tiersUnlockedBy(evaluateLadders(dix), "2030-01-01T00:00:00.000Z"), []);

// --- échelle terminée
const enorme = seance("2026-09-01", { exos: [["Squat", [[250, "5"]]]] });
eq("au-delà du dernier palier, plus de prochain", etat([enorme])["charge"].next, null);
eq("tous les paliers datés", etat([enorme])["charge"].level, 8);

// --- prochains objectifs
const buts = nextGoals(evaluateLadders(dix), 3);
eq("trois objectifs proposés", buts.length, 3);
eq("classés du plus proche au plus lointain", buts.map((b) => b.part).every((p, i) => i === 0 || p <= buts[i - 1].part), true);
eq("aucun objectif déjà atteint", buts.every((b) => b.value < b.tier), true);
eq("plus d'objectif quand tout est fini", nextGoals([{ ladder: LADDERS[0], value: 1, level: LADDERS[0].tiers.length, unlockedAt: [], next: null }]), []);

// --- libellés
eq("libellé avec unité", tierLabel(LADDERS.find((l) => l.id === "charge"), 100), "100 kg");
eq("libellé sans unité = nom", tierLabel(LADDERS.find((l) => l.id === "express"), 1), "Express");

// --- accords
eq("singulier accordé", quantity(1, "séances"), "1 séance");
eq("pluriel conservé", quantity(2, "séances"), "2 séances");
eq("un jour", quantity(1, "jours"), "1 jour");
eq("les unités invariables ne bougent pas", [quantity(1, "kg"), quantity(1, "%"), quantity(1, "min")], ["1 kg", "1 %", "1 min"]);
eq("séparateur de milliers français", quantity(100000, "kg"), `${(100000).toLocaleString("fr-FR")} kg`);
eq("et ce séparateur est insécable", /\s/u.test(quantity(100000)) && !quantity(100000).includes(" "), true);
eq("une décimale au plus", quantity(7.55, "kg"), "7,6 kg");
eq("sans unité", quantity(3), "3");
eq("libellé de palier au singulier", tierLabel(LADDERS.find((l) => l.id === "seances"), 1), "1 séance");

// --- le décompte d'une seule séance sert au bilan
const t = emptyTally(80);
addSession(t, seance("2026-09-01", { exos: [["Squat", [[100, "10"], [100, "10"]]]] }));
eq("tonnage d'une séance", t.tonnage, 2000);
eq("répétitions d'une séance", t.repetitions, 20);

// --- régressions gardées de la version précédente
eq("suite cassée par un jour manqué", etat(["2026-09-01", "2026-09-02", "2026-09-04"].map((j) => seance(j)))["suite-jours"].value, 2);
eq("deux séances le même jour = un jour", etat([seance("2026-09-01", { heure: 8 }), seance("2026-09-01", { heure: 18 })])["suite-jours"].value, 1);
eq("séance en cours ignorée", evaluateLadders([{ ...seance("2026-09-01"), finishedAt: null }]).reduce((n, p) => n + p.level, 0), 0);
eq("série non cochée hors tonnage", etat([seance("2026-09-01", { exos: [["Squat", [[100, "10"], [100, "10"]]]], partielle: true })])["tonnage"].value, 1000);
eq("égaler n'est pas battre", etat([seance("2026-09-01", { exos: [["Squat", [[80, "5"]]]] }), seance("2026-09-02", { exos: [["Squat", [[80, "5"]]]] })])["records"].value, 0);
eq("sans poids de corps connu, rien", etat([seance("2026-09-01", { exos: [["Squat", [[80, "5"]]]] })], null)["poids-corps"].level, 0);
eq("le double pour 40 kg de corps", etat([seance("2026-09-01", { exos: [["Squat", [[80, "5"]]]] })], 40)["poids-corps"].level, 4);

console.log(ko ? `\n${ko} échec(s)` : `\nTout passe — ${LADDERS.length} hauts faits, ${TIER_COUNT} paliers`);
process.exit(ko ? 1 : 0);
