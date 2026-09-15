import { mergeEntries, sameEntries, decideEntrySync, live, readStamp } from "../.tests-build/entrySync.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};
const e = (id, v, updatedAt, deletedAt) => ({ id, v, updatedAt, ...(deletedAt ? { deletedAt } : {}) });
const cle = (x) => x.id;
const ids = (l) => l.map((x) => x.id).sort();

// --- union
eq("union simple", ids(mergeEntries([e("a", 1, 1)], [e("b", 1, 1)], cle)), ["a", "b"]);
eq("la plus récente gagne", mergeEntries([e("a", "vieux", 1)], [e("a", "neuf", 2)], cle)[0].v, "neuf");
eq("dans l'autre sens aussi", mergeEntries([e("a", "neuf", 2)], [e("a", "vieux", 1)], cle)[0].v, "neuf");
eq("à date égale, la base reste", mergeEntries([e("a", "base", 1)], [e("a", "autre", 1)], cle)[0].v, "base");
eq("l'ordre de la base est conservé", mergeEntries([e("b", 1, 1), e("a", 1, 1)], [e("c", 1, 1)], cle).map(cle), ["b", "a", "c"]);
eq("une pierre tombale plus récente l'emporte", mergeEntries([e("a", 1, 1)], [e("a", 1, 5, 5)], cle)[0].deletedAt, 5);
eq("une réécriture plus récente fait revivre", mergeEntries([e("a", 1, 5, 5)], [e("a", 2, 9)], cle)[0].deletedAt, undefined);

// --- égalité
eq("mêmes entrées dans un autre ordre", sameEntries([e("a", 1, 1), e("b", 1, 1)], [e("b", 1, 1), e("a", 1, 1)], cle), true);
eq("clés dans un autre ordre : égales", sameEntries([{ id: "a", v: 1, updatedAt: 1 }], [{ updatedAt: 1, v: 1, id: "a" }], cle), true);
eq("valeur différente", sameEntries([e("a", 1, 1)], [e("a", 2, 1)], cle), false);
eq("taille différente", sameEntries([e("a", 1, 1)], [], cle), false);

// --- vivantes
eq("les supprimées ne s'affichent pas", ids(live([e("a", 1, 1), e("b", 1, 2, 2)])), ["a"]);

// --- arbitrage
let d = decideEntrySync([], [], cle);
eq("rien nulle part", d, { toStore: null, toPush: null });
d = decideEntrySync([e("a", 1, 1)], [], cle);
eq("rien là-bas : on remonte", ids(d.toPush), ["a"]);
d = decideEntrySync([], [e("a", 1, 1)], cle);
eq("rien ici : on descend", ids(d.toStore), ["a"]);
d = decideEntrySync([e("a", 1, 1)], [e("b", 1, 1)], cle);
eq("chacun la sienne : on écrit l'union d'abord", ids(d.toStore), ["a", "b"]);
eq("et on ne remonte rien ce tour", d.toPush, null);
d = decideEntrySync(d.toStore, [e("b", 1, 1)], cle);
eq("au tour suivant seule la locale remonte", ids(d.toPush), ["a"]);
d = decideEntrySync([e("a", "local", 1)], [e("a", "distant", 1)], cle);
eq("à date égale, le distant fait foi", d.toStore[0].v, "distant");
d = decideEntrySync([e("a", 2, 9)], [e("a", 1, 1)], cle);
eq("correction locale plus récente : on remonte", d.toPush[0].v, 2);
d = decideEntrySync([e("a", 1, 1, 1)], [e("a", 1, 1)], cle);
eq("une tombale à date égale ne repart pas : le distant fait foi", d.toStore[0].deletedAt, undefined);

// --- anciennes entrées
eq("sans date : zéro", readStamp(undefined), 0);
eq("date négative refusée", readStamp(-3), 0);
eq("date gardée", readStamp(42), 42);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
