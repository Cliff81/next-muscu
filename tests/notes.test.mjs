import { parseNotes, setNote, noteFor, mergeNotes, sameNotes, decideNotesSync, NOTE_MAX_LENGTH } from "../.tests-build/notes.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};

// --- écriture
let n = setNote({}, "Squat", "  banc cran 4  ", 1000);
eq("texte nettoyé", n.Squat, { text: "banc cran 4", updatedAt: 1000 });
eq("lecture", noteFor(n, "Squat"), "banc cran 4");
eq("autre exercice : rien", noteFor(n, "Curl"), null);
eq("même texte : rien ne bouge", setNote(n, "Squat", "banc cran 4", 2000), n);
eq("vide sur rien : rien", setNote({}, "Squat", "   ", 1000), {});
n = setNote(n, "Squat", "", 3000);
eq("effacer vide la note sans la retirer", n.Squat, { text: "", updatedAt: 3000 });
eq("une note vide se lit comme absente", noteFor(n, "Squat"), null);
eq("longueur bornée", setNote({}, "Squat", "x".repeat(900), 1).Squat.text.length, NOTE_MAX_LENGTH);

// --- relecture
eq("relecture valide", parseNotes({ Squat: { text: "a", updatedAt: 1 } }), { Squat: { text: "a", updatedAt: 1 } });
eq("relecture : entrée mal formée écartée", parseNotes({ Squat: { text: 3, updatedAt: 1 }, Curl: { text: "ok", updatedAt: 2 } }), { Curl: { text: "ok", updatedAt: 2 } });
eq("relecture : liste refusée", parseNotes([]), null);
eq("relecture : texte tronqué", parseNotes({ S: { text: "y".repeat(600), updatedAt: 1 } }).S.text.length, NOTE_MAX_LENGTH);

// --- union
const a = { Squat: { text: "ancien", updatedAt: 1 }, Curl: { text: "ici", updatedAt: 5 } };
const b = { Squat: { text: "récent", updatedAt: 2 }, Rowing: { text: "là", updatedAt: 3 } };
eq("la plus récente l'emporte", mergeNotes(a, b).Squat.text, "récent");
eq("dans l'autre sens aussi", mergeNotes(b, a).Squat.text, "récent");
eq("chaque côté apporte les siennes", Object.keys(mergeNotes(a, b)).sort(), ["Curl", "Rowing", "Squat"]);
eq("à date égale, la base reste", mergeNotes({ S: { text: "base", updatedAt: 1 } }, { S: { text: "autre", updatedAt: 1 } }).S.text, "base");
eq("égalité", sameNotes(a, { ...a }), true);
eq("différence de texte", sameNotes(a, { ...a, Curl: { text: "x", updatedAt: 5 } }), false);
eq("différence de taille", sameNotes(a, { Squat: a.Squat }), false);

// --- arbitrage
let d = decideNotesSync({}, {});
eq("rien nulle part", d, { toStore: null, toPush: null });
d = decideNotesSync(a, {});
eq("rien là-bas : on remonte tout", d, { toStore: null, toPush: a });
d = decideNotesSync({}, b);
eq("rien ici : on descend tout", d, { toStore: b, toPush: null });
d = decideNotesSync(a, b);
eq("mélange : on écrit d'abord ici", d.toStore, { Squat: b.Squat, Rowing: b.Rowing, Curl: a.Curl });
eq("et on ne remonte rien ce tour", d.toPush, null);
d = decideNotesSync(d.toStore, b);
eq("au tour suivant : seule la note plus récente ici remonte", d, { toStore: null, toPush: { Curl: a.Curl } });
d = decideNotesSync({ S: { text: "", updatedAt: 9 } }, { S: { text: "vieux", updatedAt: 1 } });
eq("un effacement voyage comme une note", d, { toStore: null, toPush: { S: { text: "", updatedAt: 9 } } });
d = decideNotesSync({ S: { text: "local", updatedAt: 1 } }, { S: { text: "distant", updatedAt: 1 } });
eq("à date égale, le distant fait foi", d.toStore.S.text, "distant");

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
