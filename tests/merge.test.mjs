import { mergeWorkouts } from "../.tests-build/mergeWorkouts.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};
const s = (id, startedAt, finishedAt = "2026-09-10T12:00:00Z") => ({ id, startedAt, finishedAt });
const A = s("a", "2026-09-01T10:00:00Z");
const B = s("b", "2026-09-02T10:00:00Z");
const C = s("c", "2026-09-03T10:00:00Z");
const enCours = s("z", "2026-09-04T10:00:00Z", null);

// --- comportement d'origine, inchangé
let r = mergeWorkouts([A], [A]);
eq("rien à faire", r, { toStore: null, toPush: [], toRemove: [], toForget: [] });

r = mergeWorkouts([A], [A, B]);
eq("descend ce qui manque ici", r.toStore.map((x) => x.id), ["a", "b"]);
eq("et ne remonte rien dans le même passage", r.toPush, []);

r = mergeWorkouts([A, B], [A]);
eq("remonte ce qui manque là-bas", r.toPush.map((x) => x.id), ["b"]);

r = mergeWorkouts([A, enCours], [A]);
eq("ne remonte pas une séance en cours", r.toPush, []);

r = mergeWorkouts([B, A], [C]);
eq("trie par date de début", r.toStore.map((x) => x.id), ["a", "b", "c"]);

// --- suppressions
r = mergeWorkouts([A, B], [A, B], ["b"]);
eq("retire la séance supprimée de l'historique", r.toStore.map((x) => x.id), ["a"]);
eq("sans rien envoyer dans le même passage", [r.toPush, r.toRemove], [[], []]);

r = mergeWorkouts([A], [A, B], ["b"]);
eq("ne redescend pas une séance supprimée", r.toStore, null);
eq("et demande sa suppression là-bas", r.toRemove, ["b"]);

r = mergeWorkouts([A], [A], ["b"]);
eq("ordre déjà exécuté : plus rien à supprimer", r.toRemove, []);

r = mergeWorkouts([A, B], [A], ["b"]);
eq("une séance supprimée ne remonte jamais", r.toPush, []);

r = mergeWorkouts([A, B], [A, B], [], ["b"]);
eq("suppression venue d'ailleurs : on l'inscrit d'abord", r.toForget, ["b"]);
eq("et on ne touche pas encore à l'historique", r.toStore, null);
r = mergeWorkouts([A, B], [A, B], ["b"], ["b"]);
eq("puis elle quitte l'historique au passage suivant", r.toStore.map((x) => x.id), ["a"]);

r = mergeWorkouts([A], [A], ["b"], ["b"]);
eq("registre déjà à jour : rien à refaire", r, { toStore: null, toPush: [], toRemove: [], toForget: [] });

r = mergeWorkouts([], [], ["b"], []);
eq("suppression hors ligne, séance absente des deux côtés", r, { toStore: null, toPush: [], toRemove: [], toForget: [] });

// --- corrections
const A1 = { ...A, editedAt: "2026-09-10T10:00:00Z", note: "ici" };
const A2 = { ...A, editedAt: "2026-09-11T10:00:00Z", note: "là-bas" };
r = mergeWorkouts([A1], [A2]);
eq("corrigée plus récemment là-bas : elle descend", r.toStore.map((x) => x.note), ["là-bas"]);
eq("et rien ne remonte dans le même passage", r.toPush, []);
r = mergeWorkouts([A2], [A1]);
eq("corrigée plus récemment ici : elle remonte", r.toPush.map((x) => x.note), ["là-bas"]);
eq("sans rien réécrire ici", r.toStore, null);
r = mergeWorkouts([A1], [A]);
eq("corrigée ici, jamais là-bas : elle remonte", r.toPush.map((x) => x.id), ["a"]);
r = mergeWorkouts([A], [A1]);
eq("corrigée là-bas, jamais ici : elle descend", r.toStore.map((x) => x.editedAt), ["2026-09-10T10:00:00Z"]);
r = mergeWorkouts([A1], [A1]);
eq("même correction des deux côtés : rien", r, { toStore: null, toPush: [], toRemove: [], toForget: [] });
r = mergeWorkouts([A1, B], [A2, B], ["b"]);
eq("la suppression passe avant la correction", r.toStore.map((x) => x.id), ["a"]);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
