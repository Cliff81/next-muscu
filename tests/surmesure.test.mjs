import { defaultCount, emptyDrafts, draftTitle, toTemplate, draftReady, draftsReady, sharedGroups, droppedGroups, groupNames, weeklyVolume, MIN_EXERCISES, MAX_EXERCISES } from "../.tests-build/customProgram.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};
const d = (groups, count = 5, title = "") => ({ title, groups, count });

// --- volume proposé
eq("30 min → trois exercices", defaultCount(30), 3);
eq("60 min → cinq exercices", defaultCount(60), 5);
eq("90 min → huit exercices", defaultCount(90), MAX_EXERCISES);
eq("jamais moins que le minimum", defaultCount(5), MIN_EXERCISES);
eq("jamais plus que le maximum", defaultCount(600), MAX_EXERCISES);

// --- brouillons
eq("un brouillon par journée", emptyDrafts(4, 60).length, 4);
eq("aucun groupe au départ", emptyDrafts(4, 60).every((x) => x.groups.length === 0), true);
eq("volume repris du temps disponible", emptyDrafts(2, 45)[0].count, 4);

// --- noms
eq("nom voulu conservé", draftTitle(d(["chest"], 5, "  Ma journée  "), 0), "Ma journée");
eq("nom composé des groupes", draftTitle(d(["chest", "triceps"]), 0), "Pectoraux + Triceps");
eq("trois groupes tiennent encore", draftTitle(d(["chest", "triceps", "abs"]), 0), "Pectoraux + Triceps + Abdominaux");
eq("au-delà, on abrège", draftTitle(d(["chest", "triceps", "abs", "back"]), 0), "Pectoraux + Triceps +2");
eq("sans groupe, le rang", draftTitle(d([]), 2), "Journée 3");
eq("groupe inconnu ignoré", draftTitle(d(["zzz"]), 0), "Journée 1");

// --- modèle produit
const t = toTemplate(d(["chest", "triceps"], 5), 0);
eq("une section par groupe", t.sections.map((s) => s.title), ["Pectoraux", "Triceps"]);
eq("le premier groupe prend le reste", t.sections.map((s) => s.count), [3, 2]);
eq("total conservé", t.sections.reduce((n, s) => n + s.count, 0), 5);
eq("muscles du catalogue", toTemplate(d(["back"], 4), 0).sections[0].muscles, ["lats", "middle back"]);
eq("description = les groupes", t.description, "Pectoraux, Triceps");
eq("titre repris", t.title, "Pectoraux + Triceps");

const t3 = toTemplate(d(["chest", "back", "abs"], 4), 0);
eq("quatre exercices sur trois groupes", t3.sections.map((s) => s.count), [2, 1, 1]);
const t4 = toTemplate(d(["chest", "back", "abs", "biceps", "triceps"], 3), 0);
eq("moins d'exercices que de groupes : les derniers sautent", t4.sections.map((s) => s.title), ["Pectoraux", "Dos", "Abdominaux"]);
eq("et aucune section vide", t4.sections.every((s) => s.count > 0), true);
eq("sans groupe, aucune section", toTemplate(d([], 5), 0).sections, []);

// --- complétude
eq("journée sans groupe : pas prête", draftReady(d([])), false);
eq("journée avec groupe : prête", draftReady(d(["chest"])), true);
eq("toutes prêtes", draftsReady([d(["chest"]), d(["back"])]), true);
eq("une seule manquante suffit", draftsReady([d(["chest"]), d([])]), false);
eq("liste vide : rien à construire", draftsReady([]), false);

// --- avertissements
eq("groupe repris de la veille", sharedGroups(d(["chest", "back"]), d(["back", "abs"])), ["back"]);
eq("aucun recoupement", sharedGroups(d(["chest"]), d(["back"])), []);
eq("pas de veille pour la première journée", sharedGroups(d(["chest"]), undefined), []);
eq("plusieurs groupes repris", sharedGroups(d(["chest", "back"]), d(["chest", "back"])), ["chest", "back"]);

eq("aucun groupe laissé de côté", droppedGroups(d(["chest", "back"], 5)), []);
eq("autant de groupes que d'exercices", droppedGroups(d(["chest", "back", "abs"], 3)), []);
eq("un groupe de trop", droppedGroups(d(["chest", "back", "abs", "biceps"], 3)), ["biceps"]);
eq("deux groupes de trop, dans l'ordre", droppedGroups(d(["chest", "back", "abs", "biceps", "triceps"], 3)), ["biceps", "triceps"]);
eq("et ce sont bien ceux que le modèle abandonne", toTemplate(d(["chest", "back", "abs", "biceps"], 3), 0).sections.length, 3);

eq("noms des groupes", groupNames(["chest", "back"]), ["Pectoraux", "Dos"]);
eq("identifiant inconnu ignoré", groupNames(["chest", "zzz"]), ["Pectoraux"]);

// --- répartition de la semaine
const prog = { days: [
  { sections: [{ title: "Pectoraux", exercises: [1, 2, 3] }, { title: "Triceps", exercises: [1, 2] }] },
  { sections: [{ title: "Dos", exercises: [1, 2, 3] }, { title: "Pectoraux", exercises: [1] }] },
] };
eq("cumul par catégorie", weeklyVolume(prog), [
  { title: "Dos", count: 3 },
  { title: "Pectoraux", count: 4 },
  { title: "Triceps", count: 2 },
].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)));
eq("du plus fourni au moins", weeklyVolume(prog).map((v) => v.count), [4, 3, 2]);
eq("programme vide", weeklyVolume({ days: [] }), []);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
