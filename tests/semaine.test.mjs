import { weekStatus, startOfWeek, weekKey, resumePoint } from "../.tests-build/week.mjs";
import { activeMode, needsWeekChoice, newerChoice, parseWeekChoice, decide } from "../.tests-build/weekChoice.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};
const days = ["j1", "j2", "j3"].map((id) => ({ id }));
const seance = (dayId, iso, finie = true) => ({ id: iso + dayId, dayId, startedAt: iso, finishedAt: finie ? iso : null });
// mercredi 16 septembre 2026, 15 h locale
const maintenant = new Date(2026, 8, 16, 15, 0, 0);
const cle = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// --- début de semaine
eq("un mercredi ramène au lundi", cle(startOfWeek(maintenant)), "2026-9-14");
eq("un lundi reste ce lundi", cle(startOfWeek(new Date(2026, 8, 14, 23, 59))), "2026-9-14");
eq("un dimanche remonte six jours", cle(startOfWeek(new Date(2026, 8, 20, 8))), "2026-9-14");
eq("minuit pile", startOfWeek(maintenant).getHours(), 0);

// --- semaine vide
let s = weekStatus(days, [], maintenant);
eq("rien de fait", s.done.size, 0);
eq("la première journée est la prochaine", s.next, "j1");

// --- une séance cette semaine
s = weekStatus(days, [seance("j1", "2026-09-14T18:00:00.000")], maintenant);
eq("J1 faite", [...s.done.keys()], ["j1"]);
eq("J2 suivante", s.next, "j2");

// --- la semaine dernière ne compte pas
s = weekStatus(days, [seance("j1", "2026-09-13T18:00:00.000")], maintenant);
eq("dimanche dernier : hors semaine", s.done.size, 0);
eq("et J1 redevient la prochaine", s.next, "j1");

// --- une séance en cours ne compte pas
s = weekStatus(days, [seance("j1", "2026-09-15T18:00:00.000", false)], maintenant);
eq("séance non terminée ignorée", s.done.size, 0);

// --- semaine complète
s = weekStatus(days, [seance("j1", "2026-09-14T18:00:00.000"), seance("j2", "2026-09-15T18:00:00.000"), seance("j3", "2026-09-16T10:00:00.000")], maintenant);
eq("tout est fait", s.done.size, 3);
eq("plus de prochaine", s.next, null);

// --- dans le désordre : la prochaine est la première non faite, pas la suivante de la dernière
s = weekStatus(days, [seance("j3", "2026-09-14T18:00:00.000")], maintenant);
eq("J3 faite d'abord : J1 reste la prochaine", s.next, "j1");

// --- deux fois la même journée : la plus récente est retenue
s = weekStatus(days, [seance("j1", "2026-09-14T18:00:00.000"), seance("j1", "2026-09-16T09:00:00.000")], maintenant);
eq("date la plus récente", s.done.get("j1"), "2026-09-16T09:00:00.000");

// --- une journée retirée du programme n'influence pas la prochaine
s = weekStatus(days, [seance("j9", "2026-09-15T18:00:00.000")], maintenant);
eq("journée inconnue : notée mais sans effet sur la suite", s.next, "j1");

// --- la future semaine ne compte pas non plus (horloge décalée)
s = weekStatus(days, [seance("j1", "2026-09-21T09:00:00.000")], maintenant);
eq("lundi prochain : hors semaine", s.done.size, 0);

// --- clé de semaine
eq("clé de la semaine : son lundi", weekKey(maintenant), "2026-09-14");

// --- reprise : où l'on s'était arrêté
const cinq = ["j1", "j2", "j3", "j4", "j5"].map((id) => ({ id }));
const avant = [seance("j1", "2026-09-07T18:00:00.000"), seance("j2", "2026-09-09T18:00:00.000"), seance("j3", "2026-09-11T18:00:00.000")];
eq("reprise : après J3, J4", resumePoint(cinq, avant, maintenant), { lastDayId: "j3", nextDayId: "j4" });
eq("rien avant cette semaine : rien à reprendre", resumePoint(cinq, [seance("j2", "2026-09-15T18:00:00.000")], maintenant), null);
eq("cycle fini : rien à reprendre", resumePoint(cinq, [seance("j5", "2026-09-12T18:00:00.000")], maintenant), null);
eq("une seule journée : rien à reprendre", resumePoint([{ id: "j1" }], avant, maintenant), null);
eq("c'est la plus récente qui compte, pas la plus avancée", resumePoint(cinq, [seance("j4", "2026-09-08T18:00:00.000"), seance("j1", "2026-09-10T18:00:00.000")], maintenant).nextDayId, "j2");

// --- mode reprise
s = weekStatus(cinq, avant, maintenant, "resume");
eq("reprise : la prochaine est J4", s.next, "j4");
s = weekStatus(cinq, [...avant, seance("j4", "2026-09-14T18:00:00.000")], maintenant, "resume");
eq("reprise : J4 faite, puis J5", [[...s.done.keys()], s.next], [["j4"], "j5"]);
s = weekStatus(cinq, [...avant, seance("j4", "2026-09-14T18:00:00.000"), seance("j5", "2026-09-15T18:00:00.000")], maintenant, "resume");
eq("reprise : après J5, on tourne vers J1", s.next, "j1");
s = weekStatus(cinq, [...avant, seance("j4", "2026-09-14T18:00:00.000"), seance("j1", "2026-09-15T18:00:00.000")], maintenant, "resume");
eq("reprise : J1 déjà faite cette semaine est sautée", s.next, "j2");
eq("reprise sans historique : J1", weekStatus(cinq, [], maintenant, "resume").next, "j1");
eq("reprise, semaine complète : plus de prochaine", weekStatus(days, [seance("j1", "2026-09-14T18:00:00.000"), seance("j2", "2026-09-15T18:00:00.000"), seance("j3", "2026-09-16T10:00:00.000")], maintenant, "resume").next, null);
eq("repartir : inchangé, J1", weekStatus(cinq, avant, maintenant, "restart").next, "j1");

// --- le choix de la semaine
const choix = decide("resume", maintenant);
eq("le choix porte la semaine", choix.week, "2026-09-14");
eq("valide pour sa semaine", activeMode(choix, maintenant), "resume");
eq("périmé la semaine suivante", activeMode(choix, new Date(2026, 8, 22)), "restart");
eq("sans choix : on repart", activeMode(null, maintenant), "restart");
eq("relecture", parseWeekChoice(JSON.parse(JSON.stringify(choix))), choix);
eq("relecture d'un mode inconnu : rien", parseWeekChoice({ week: "2026-09-14", mode: "x", decidedAt: choix.decidedAt }), null);
eq("question posée : rien fait, rien décidé, de quoi reprendre", needsWeekChoice(cinq, avant, null, maintenant), true);
eq("déjà décidé : plus de question", needsWeekChoice(cinq, avant, choix, maintenant), false);
eq("décidé la semaine d'avant : question", needsWeekChoice(cinq, avant, decide("restart", new Date(2026, 8, 9)), maintenant), true);
eq("une séance déjà faite : plus de question", needsWeekChoice(cinq, [...avant, seance("j1", "2026-09-14T18:00:00.000")], null, maintenant), false);
eq("rien à reprendre : pas de question", needsWeekChoice(cinq, [], null, maintenant), false);
const ancien = { week: "2026-09-07", mode: "resume", decidedAt: "2026-09-07T08:00:00.000Z" };
const recent = { week: "2026-09-14", mode: "restart", decidedAt: "2026-09-14T08:00:00.000Z" };
eq("entre deux choix : la semaine la plus récente", newerChoice(ancien, recent), recent);
eq("même semaine : la décision la plus récente", newerChoice(recent, { ...recent, mode: "resume", decidedAt: "2026-09-14T09:00:00.000Z" }).mode, "resume");
eq("un seul choix", newerChoice(null, recent), recent);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
