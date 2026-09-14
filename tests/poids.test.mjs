import { parseWeights, addWeight, removeWeight, latestWeight, weightOn, weightTrend, decideWeightsSync } from "../.tests-build/bodyWeight.mjs";
import { evaluateLadders, derivedUnlocks } from "../.tests-build/achievements.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};
const w = (date, kg) => ({ date, kg });

// --- relecture
eq("pesée valide", parseWeights([w("2026-09-01", 80)]), [w("2026-09-01", 80)]);
eq("triées par date", parseWeights([w("2026-09-05", 79), w("2026-09-01", 80)]).map((e) => e.date), ["2026-09-01", "2026-09-05"]);
eq("doublon de jour : la première relue est gardée", parseWeights([w("2026-09-01", 80), w("2026-09-01", 81)]).length, 1);
eq("date malformée écartée", parseWeights([w("01/09/2026", 80)]), []);
eq("poids absurde écarté", parseWeights([w("2026-09-01", 0), w("2026-09-02", 600), w("2026-09-03", -5)]), []);
eq("arrondi au dixième", parseWeights([w("2026-09-01", 80.26)])[0].kg, 80.3);
eq("non-liste refusée", parseWeights({}), null);

// --- ajout, remplacement, retrait
let l = addWeight([], w("2026-09-01", 80));
l = addWeight(l, w("2026-09-03", 79.5));
eq("deux pesées, dans l'ordre", l.map((e) => e.date), ["2026-09-01", "2026-09-03"]);
l = addWeight(l, w("2026-09-01", 81));
eq("même jour : remplacement", l.find((e) => e.date === "2026-09-01").kg, 81);
eq("sans doublon", l.length, 2);
eq("dernière pesée", latestWeight(l).date, "2026-09-03");
eq("retrait", removeWeight(l, "2026-09-01").length, 1);
eq("liste vide : pas de dernière", latestWeight([]), null);

// --- poids connu à une date
const j = [w("2026-09-01", 80), w("2026-09-10", 78)];
eq("avant toute pesée : inconnu", weightOn(j, "2026-08-31"), null);
eq("le jour même compte", weightOn(j, "2026-09-01"), 80);
eq("entre deux : la précédente", weightOn(j, "2026-09-05"), 80);
eq("après la dernière : la dernière", weightOn(j, "2026-12-01"), 78);

// --- tendance
const t = [w("2026-09-01", 80), w("2026-09-08", 79.4), w("2026-09-15", 78.9)];
const s7 = weightTrend(t, 7);
eq("tendance à 7 jours : −0,5 sur 7 jours", [s7.delta, s7.days], [-0.5, 7]);
eq("compare à la pesée la plus récente d'il y a ≥ 7 jours", s7.from.date, "2026-09-08");
const s30 = weightTrend(t, 30);
eq("pas de pesée assez ancienne pour 30 jours", s30, null);
eq("à 14 jours : depuis le 1er", weightTrend(t, 14).from.date, "2026-09-01");
eq("une seule pesée : pas de tendance", weightTrend([w("2026-09-01", 80)], 7), null);

// --- arbitrage (règle commune)
eq("local plus récent", decideWeightsSync(t, 12, { entries: [], updatedAt: 9 }), { action: "push" });
eq("distant plus récent", decideWeightsSync(t, 5, { entries: j, updatedAt: 9 }).action, "pull");

// --- hauts faits : la part du poids de corps suit le poids de l'époque
const seance = (iso, kg) => ({ id: iso, dayId: "j1", dayCode: "J1", dayTitle: "T", startedAt: iso, finishedAt: iso, durationSeconds: 60,
  exercises: [{ exerciseId: "e", exerciseName: "Squat", sets: [{ setIndex: 0, weight: kg, reps: "5", completed: true }] }] });
const etat = (h, poidsProfil, pesees) => Object.fromEntries(evaluateLadders(h, poidsProfil, {}, [], pesees).map((p) => [p.ladder.id, p]));
// 80 kg soulevés ; profil à 100 kg mais pesée à 80 kg avant la séance → 100 %
eq("le poids de la pesée prime sur celui du profil", etat([seance("2026-09-05T10:00:00.000", 80)], 100, [w("2026-09-01", 80)])["poids-corps"].level, 2);
eq("sans pesée, le profil sert", etat([seance("2026-09-05T10:00:00.000", 80)], 100, [])["poids-corps"].level, 1);
// pesée postérieure à la séance : elle ne change pas le passé
eq("une pesée après la séance ne la réécrit pas", derivedUnlocks([seance("2026-09-05T10:00:00.000", 80)], 100, [], [w("2026-09-20", 40)])["poids-corps:1"] === undefined, true);
eq("et le compteur reste la meilleure part soulevée, pas un rapport à aujourd'hui", etat([seance("2026-09-05T10:00:00.000", 80)], 100, [w("2026-09-20", 40)])["poids-corps"].value, 80);
eq("une séance après la pesée, elle, en profite", etat([seance("2026-09-25T10:00:00.000", 80)], 100, [w("2026-09-20", 40)])["poids-corps"].level, 4);
// pesée le matin même de la séance : elle compte
eq("pesée du matin comptée pour la séance du jour", etat([seance("2026-09-05T10:00:00.000", 80)], 100, [w("2026-09-05", 80)])["poids-corps"].level, 2);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
