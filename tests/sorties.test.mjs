import { parseOutings, addOuting, removeOuting, totalKm, decideOutingsSync, ON_FOOT, ON_WHEELS } from "../.tests-build/outings.mjs";
import { evaluateLadders, derivedUnlocks, equivalent, emptyTally, addOuting as compteSortie } from "../.tests-build/achievements.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};
const sortie = (id, date, sportId, km, minutes = 40) => ({ id, sportId, date, km, minutes });

// --- relecture
eq("sortie valide", parseOutings([sortie("a", "2026-09-01", "running", 10)]).length, 1);
eq("date malformée écartée", parseOutings([sortie("a", "01/09/2026", "running", 10)]), []);
eq("distance négative ramenée à rien", parseOutings([sortie("a", "2026-09-01", "running", -5)])[0].km, null);
eq("distance absente acceptée", parseOutings([sortie("a", "2026-09-01", "boxing", null)])[0].km, null);
eq("ce qui n'est pas une liste est refusé", parseOutings({}), null);
eq("entrée sans identifiant écartée", parseOutings([{ date: "2026-09-01", sportId: "running" }]), []);

// --- liste
const l1 = addOuting([], sortie("a", "2026-09-05", "running", 10));
const l2 = addOuting(l1, sortie("b", "2026-09-01", "cycling", 30));
eq("triées par date", l2.map((o) => o.id), ["b", "a"]);
eq("même identifiant : remplacement, pas doublon", addOuting(l2, sortie("a", "2026-09-05", "running", 12)).length, 2);
eq("suppression", removeOuting(l2, "a").map((o) => o.id), ["b"]);
eq("suppression d'un inconnu sans effet", removeOuting(l2, "zzz").length, 2);

// --- totaux
eq("kilomètres à pied", totalKm(l2, ON_FOOT), 10);
eq("kilomètres à vélo", totalKm(l2, ON_WHEELS), 30);
eq("tout confondu", totalKm(l2), 40);
eq("une sortie sans distance ne fausse rien", totalKm(addOuting(l2, sortie("c", "2026-09-06", "running", null))), 40);

// --- arbitrage
eq("rien ici, rien là-bas", decideOutingsSync([], 0, null), { action: "none" });
eq("du local jamais remonté", decideOutingsSync(l2, 5, null), { action: "push" });
eq("le distant est plus récent", decideOutingsSync(l2, 5, { outings: l1, updatedAt: 9 }).action, "pull");
eq("le local est plus récent", decideOutingsSync(l2, 12, { outings: l1, updatedAt: 9 }), { action: "push" });
eq("identiques : on se tait", decideOutingsSync(l1, 12, { outings: l1, updatedAt: 9 }), { action: "none" });

// --- hauts faits
const etat = (hist, sorties) => Object.fromEntries(evaluateLadders(hist, 80, {}, sorties).map((p) => [p.ladder.id, p]));
const dix = [sortie("a", "2026-09-01", "running", 10)];
eq("dix kilomètres à pied", etat([], dix)["km-pied"].value, 10);
eq("deux paliers franchis", etat([], dix)["km-pied"].level, 2);
eq("le vélo reste à zéro", etat([], dix)["km-velo"].value, 0);
eq("la marche compte comme du pied", etat([], [sortie("m", "2026-09-01", "walking", 6)])["km-pied"].value, 6);
eq("la natation ne compte ni pied ni vélo", etat([], [sortie("n", "2026-09-01", "swimming", 2)])["km-pied"].value, 0);
eq("mais elle compte comme une sortie", etat([], [sortie("n", "2026-09-01", "swimming", 2)])["sorties"].level, 1);

// --- les sorties prolongent les suites de jours
const troisJours = [
  sortie("a", "2026-09-01", "running", 5),
  sortie("b", "2026-09-02", "running", 5),
  sortie("c", "2026-09-03", "running", 5),
];
eq("trois sorties d'affilée", etat([], troisJours)["suite-jours"].value, 3);

// --- dates de palier prises au bon événement
const marathon = [sortie("a", "2026-09-01", "running", 20), sortie("b", "2026-09-20", "running", 25)];
const ouverts = derivedUnlocks([], 80, marathon);
eq("le palier 42,2 km date de la seconde sortie", ouverts["km-pied:3"].slice(0, 10), "2026-09-20");
eq("le palier 10 km date de la première", ouverts["km-pied:1"].slice(0, 10), "2026-09-01");

// --- le temps cumulé compte aussi les sorties
const t = emptyTally(80);
compteSortie(t, sortie("a", "2026-09-01", "running", 10, 60));
eq("une heure de course dans le temps total", t.tempsTotal, 3600);

// --- équivalences
eq("400 km à pied, c'est Limoges → Paris", equivalent("km-pied", 400), "Limoges → Paris");
eq("42,2 km, c'est un marathon", equivalent("km-pied", 42.2), "un marathon");
eq("on garde le plus grand dépassé", equivalent("km-pied", 399), "Limoges → Nantes");
eq("rien en dessous du premier ancrage", equivalent("km-pied", 3), null);
eq("un Tour de France à vélo", equivalent("km-velo", 3500), "un Tour de France complet");
eq("cinq tonnes, c'est un éléphant", equivalent("tonnage", 5000), "un éléphant d'Afrique");
eq("échelle sans équivalence", equivalent("suite-jours", 99), null);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
