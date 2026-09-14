import { weekStatus, startOfWeek } from "../.tests-build/week.mjs";

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

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
