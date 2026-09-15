import { calendarWeeks, dayKey, weeklyStreak, weeksToShow, monthLabels, countSessions } from "../.tests-build/calendar.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};
let n = 0;
const seance = (iso, finie = true) => ({ id: `s${++n}`, dayId: "j1", dayCode: "J1", dayTitle: "T", startedAt: iso, finishedAt: finie ? iso : null, durationSeconds: 60, exercises: [] });
const sortie = (date) => ({ id: `o${++n}`, sportId: "running", date, km: 5, minutes: 30 });
// mercredi 16 septembre 2026, 15 h locale
const maintenant = new Date(2026, 8, 16, 15, 0, 0);

// --- clé du jour
eq("clé locale", dayKey(new Date(2026, 8, 16, 23, 59)), "2026-09-16");
eq("zéros", dayKey(new Date(2026, 0, 5)), "2026-01-05");

// --- grille
let g = calendarWeeks([], [], 4, maintenant);
eq("quatre colonnes", g.length, 4);
eq("sept cases par colonne", g.every((s) => s.length === 7), true);
eq("dernière colonne : la semaine en cours, du lundi", g[3][0].date, "2026-09-14");
eq("au dimanche", g[3][6].date, "2026-09-20");
eq("première colonne trois semaines plus tôt", g[0][0].date, "2026-08-24");

// --- rangement
g = calendarWeeks([seance("2026-09-14T23:50:00"), seance("2026-09-15T10:00:00", false)], [sortie("2026-09-16")], 1, maintenant);
eq("séance rangée au jour où elle commence", g[0][0].sessions.length, 1);
eq("séance non terminée ignorée", g[0][1].sessions.length, 0);
eq("sortie au bon jour", g[0][2].outings.length, 1);
eq("compte des séances", countSessions(g), 1);
g = calendarWeeks([seance("2026-09-14T10:00:00"), seance("2026-09-14T18:00:00")], [], 1, maintenant);
eq("deux séances le même jour", g[0][0].sessions.length, 2);
g = calendarWeeks([seance("2026-06-01T10:00:00")], [], 2, maintenant);
eq("hors fenêtre : absente", countSessions(g), 0);

// --- semaines à afficher
eq("sans séance : le plancher", weeksToShow([], maintenant), 12);
eq("séance récente : le plancher aussi", weeksToShow([seance("2026-09-10T10:00:00")], maintenant), 12);
eq("première séance il y a vingt semaines : vingt-et-une colonnes", weeksToShow([seance("2026-04-29T10:00:00")], maintenant), 21);
eq("plafond", weeksToShow([seance("2020-01-01T10:00:00")], maintenant), 52);
eq("séance non terminée ignorée", weeksToShow([seance("2020-01-01T10:00:00", false)], maintenant), 12);

// --- série de semaines
eq("rien : zéro", weeklyStreak([], maintenant), 0);
eq("une séance cette semaine : une", weeklyStreak([seance("2026-09-15T10:00:00")], maintenant), 1);
eq("cette semaine encore vide, la dernière faite : la série tient", weeklyStreak([seance("2026-09-10T10:00:00")], maintenant), 1);
eq("trois semaines d'affilée", weeklyStreak([seance("2026-09-15T10:00:00"), seance("2026-09-08T10:00:00"), seance("2026-09-01T10:00:00")], maintenant), 3);
eq("un trou casse la série", weeklyStreak([seance("2026-09-15T10:00:00"), seance("2026-09-01T10:00:00")], maintenant), 1);
eq("il y a deux semaines, rien depuis : zéro", weeklyStreak([seance("2026-09-01T10:00:00")], maintenant), 0);
eq("deux séances la même semaine comptent une", weeklyStreak([seance("2026-09-14T10:00:00"), seance("2026-09-16T10:00:00")], maintenant), 1);

// --- mois
g = calendarWeeks([], [], 6, maintenant);
eq("étiquettes des mois : première colonne puis changement", monthLabels(g), [
  { index: 0, month: 7, year: 2026 },
  { index: 4, month: 8, year: 2026 },
]);

g = calendarWeeks([], [], 12, maintenant);
eq("deux mois collés : le premier s'efface", monthLabels(g), [
  { index: 1, month: 6, year: 2026 },
  { index: 5, month: 7, year: 2026 },
  { index: 10, month: 8, year: 2026 },
]);

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
