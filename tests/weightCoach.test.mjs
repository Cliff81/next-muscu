import { coachFromTrend, MIN_SPAN_DAYS } from "../.tests-build/weightCoach.mjs";
let ko = 0;
const eq = (nom, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); } else console.log(`✓ ${nom}`); };
const trend = (delta, days) => ({ delta, days, from: { date: "x", kg: 80 }, to: { date: "y", kg: 80 + delta } });

eq("sans tendance : pas assez", coachFromTrend("masse", null).kind, "pas-assez");
eq("tendance trop courte : pas assez", coachFromTrend("masse", trend(1, MIN_SPAN_DAYS - 1)).kind, "pas-assez");
// --- masse
eq("masse : +0,35/sem est dans la fenêtre", coachFromTrend("masse", trend(1, 20)).kind, "ok");
eq("masse : +0,1/sem est lent → +200", [coachFromTrend("masse", trend(0.3, 21)).kind, coachFromTrend("masse", trend(0.3, 21)).adjustKcal], ["trop-lent", 200]);
eq("masse : +1/sem est vite → −150", [coachFromTrend("masse", trend(2, 14)).kind, coachFromTrend("masse", trend(2, 14)).adjustKcal], ["trop-vite", -150]);
eq("masse : perte = sens inverse → +250", coachFromTrend("masse", trend(-0.6, 14)).kind, "sens-inverse");
// --- sèche
eq("sèche : −0,5/sem est dans la fenêtre", coachFromTrend("seche", trend(-1, 14)).kind, "ok");
eq("sèche : −0,1/sem est lent → −200", coachFromTrend("seche", trend(-0.2, 14)).adjustKcal, -200);
eq("sèche : −1,5/sem est vite → +200", coachFromTrend("seche", trend(-3, 14)).adjustKcal, 200);
eq("sèche : prise = sens inverse", coachFromTrend("seche", trend(0.5, 14)).kind, "sens-inverse");
// --- maintien
eq("maintien : ±0,2 est stable", coachFromTrend("maintien", trend(0.4, 14)).kind, "ok");
eq("maintien : +0,5/sem → −150", coachFromTrend("maintien", trend(1, 14)).adjustKcal, -150);
eq("maintien : −0,5/sem → +150", coachFromTrend("maintien", trend(-1, 14)).adjustKcal, 150);
// --- la vitesse est ramenée à la semaine
eq("vitesse hebdomadaire", coachFromTrend("masse", trend(1, 28)).ratePerWeek, 0.25);
eq("le message porte la vitesse", coachFromTrend("masse", trend(1, 28)).message.includes("+0,3 kg/semaine") || coachFromTrend("masse", trend(1, 28)).message.includes("+0,25 kg/semaine"), true);
console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
