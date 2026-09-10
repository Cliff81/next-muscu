import type { Program } from "@/lib/types";

export const defaultProgram: Program = {
  tag: "Prise de masse — hypertrophie",
  title: "Split",
  titleAccent: "5 jours",
  subtitle: "Objectif prise de muscle",
  statsRow: [
    { value: "5", label: "Séances/sem" },
    { value: "2", label: "Jours off" },
    { value: "~70'", label: "Durée/séance" },
  ],
  days: [
    {
      id: "j1",
      code: "J1",
      title: "Pectoraux + Triceps",
      description: "Poussé horizontale & verticale — focus sur la contraction pectorale",
      muscleTags: ["Pectoraux", "Triceps", "Deltoïdes ant."],
      restInfo: { duration: "70 min", warmup: "5–10 min", suggestedDay: "Lundi" },
      sections: [
        {
          title: "Pectoraux",
          exercises: [
            { id: "j1-e1", name: "Développé couché barre", sub: "Prise légèrement plus large que les épaules", series: 4, reps: "8–10", restLabel: "2 min repos", restSeconds: 120, tip: "Coudes à 45°, pas à 90°", demo: "developpe-couche-barre.gif" },
            { id: "j1-e2", name: "Développé incliné haltères", sub: "Banc à 30–45°", series: 4, reps: "10–12", restLabel: "90 s repos", restSeconds: 90, tip: "Rotation légère en haut", demo: "developpe-incline-halteres.gif" },
            { id: "j1-e3", name: "Écarté poulie basse", sub: "Croisé en haut du mouvement", series: 3, reps: "12–15", restLabel: "60 s repos", restSeconds: 60, tip: "Cherche la contraction max", demo: "ecarte-poulie-basse.gif" },
            { id: "j1-e4", name: "Dips lestés (ou machine)", sub: "Lester si possible", series: 3, reps: "8–12", restLabel: "90 s repos", restSeconds: 90, tip: "Pencher légèrement en avant", demo: "dips.gif" },
          ],
        },
        {
          title: "Triceps",
          exercises: [
            { id: "j1-e5", name: "Triceps poulie haute (corde)", sub: "Coudes collés au corps", series: 4, reps: "12–15", restLabel: "60 s repos", restSeconds: 60, tip: "Écarte la corde en bas", demo: "triceps-poulie-corde.gif" },
            { id: "j1-e6", name: "Extension couché EZ", sub: "Skull crusher", series: 3, reps: "10–12", restLabel: "75 s repos", restSeconds: 75, tip: "Coudes immobiles", demo: "skull-crusher.gif" },
          ],
        },
      ],
      tips: [
        "Commence par 2 séries légères d'échauffement au développé couché",
        "À 118 kg, sois vigilant sur la stabilité des épaules — pas de prise trop large",
        "Privilégie la technique sur la charge",
      ],
    },
    {
      id: "j2",
      code: "J2",
      title: "Dos + Biceps",
      description: "Tirages vertx & horiz — construire épaisseur et largeur dorsale",
      muscleTags: ["Grand dorsal", "Rhomboïdes", "Trapèzes", "Biceps"],
      restInfo: { duration: "70 min", warmup: "5–10 min", suggestedDay: "Mardi" },
      sections: [
        {
          title: "Dos",
          exercises: [
            { id: "j2-e1", name: "Rowing barre buste penché", sub: "Dos plat, tire vers le nombril", series: 4, reps: "8–10", restLabel: "2 min repos", restSeconds: 120, tip: "Évite d'arrondir le bas du dos", demo: "rowing-barre.gif" },
            { id: "j2-e2", name: "Tirage vertical (lat pulldown)", sub: "Remplace les tractions si besoin", series: 4, reps: "10–12", restLabel: "90 s repos", restSeconds: 90, tip: "Tire avec les coudes, pas les mains", demo: "tirage-vertical.gif" },
            { id: "j2-e3", name: "Tirage horizontal poulie basse", sub: "Prise neutre", series: 3, reps: "10–12", restLabel: "75 s repos", restSeconds: 75, tip: "Pause 1 sec en contraction", demo: "tirage-horizontal.gif" },
            { id: "j2-e4", name: "Face pull", sub: "Poulie haute, corde", series: 3, reps: "15", restLabel: "60 s repos", restSeconds: 60, tip: "Bon pour la santé des épaules", demo: "face-pull.gif" },
          ],
        },
        {
          title: "Biceps",
          exercises: [
            { id: "j2-e5", name: "Curl barre EZ", sub: "Debout, coudes fixes", series: 4, reps: "10–12", restLabel: "75 s repos", restSeconds: 75, tip: "Pas d'élan avec le dos", demo: "curl-barre-ez.gif" },
            { id: "j2-e6", name: "Curl marteau haltères", sub: "Prise neutre", series: 3, reps: "12–15", restLabel: "60 s repos", restSeconds: 60, tip: "Travaille aussi l'avant-bras", demo: "curl-marteau.gif" },
          ],
        },
      ],
      tips: [
        "Si les tractions au poids du corps sont encore difficiles, reste sur le lat pulldown",
        "Serre bien les omoplates avant chaque tirage",
        "Biceps toujours en fin de séance, jamais avant le dos",
      ],
    },
    {
      id: "j3",
      code: "J3",
      title: "Épaules",
      description: "Développement global du deltoïde — antérieur, latéral, postérieur",
      muscleTags: ["Deltoïdes", "Trapèzes"],
      restInfo: { duration: "60 min", warmup: "5–10 min", suggestedDay: "Jeudi" },
      sections: [
        {
          title: "Épaules",
          exercises: [
            { id: "j3-e1", name: "Développé militaire barre", sub: "Assis ou debout", series: 4, reps: "8–10", restLabel: "2 min repos", restSeconds: 120, tip: "Gaine bien la ceinture abdo", demo: "developpe-militaire.gif" },
            { id: "j3-e2", name: "Élévations latérales haltères", sub: "Coudes légèrement fléchis", series: 4, reps: "12–15", restLabel: "60 s repos", restSeconds: 60, tip: "Monte jusqu'à l'horizontale, pas plus", demo: "elevations-laterales.gif" },
            { id: "j3-e3", name: "Oiseau (deltoïde postérieur)", sub: "Buste penché ou machine", series: 3, reps: "15", restLabel: "60 s repos", restSeconds: 60, tip: "Souvent négligé, ne pas sauter", demo: "oiseau.gif" },
            { id: "j3-e4", name: "Élévations frontales poulie", sub: "Un bras à la fois", series: 3, reps: "12", restLabel: "60 s repos", restSeconds: 60, tip: "Contrôle la descente", demo: "elevations-frontales.gif" },
            { id: "j3-e5", name: "Haussements d'épaules (shrugs)", sub: "Barre ou haltères", series: 3, reps: "12–15", restLabel: "60 s repos", restSeconds: 60, tip: "Monte les épaules droit vers le haut", demo: "shrugs.gif" },
          ],
        },
      ],
      tips: [
        "Commence toujours par le mouvement le plus lourd (développé militaire) à froid, sans fatigue",
        "Charges plus légères que sur les pecs/dos — les épaules sont une articulation fragile",
        "Le deltoïde postérieur mérite autant de volume que le latéral",
      ],
    },
    {
      id: "j4",
      code: "J4",
      title: "Jambes",
      description: "Quadriceps, ischios et mollets — la séance la plus exigeante",
      muscleTags: ["Quadriceps", "Ischios", "Mollets"],
      restInfo: { duration: "80 min", warmup: "10 min vélo", suggestedDay: "Vendredi" },
      sections: [
        {
          title: "Jambes",
          exercises: [
            { id: "j4-e1", name: "Squat barre", sub: "Ceinture conseillée sur les séries lourdes", series: 4, reps: "8–10", restLabel: "2–3 min repos", restSeconds: 150, tip: "Descends jusqu'à ce que ce soit confortable pour les genoux", demo: "squat.gif" },
            { id: "j4-e2", name: "Presse à cuisses", sub: "Moins de charge axiale que le squat", series: 4, reps: "10–12", restLabel: "90 s repos", restSeconds: 90, tip: "Ne verrouille pas les genoux en haut", demo: "presse-cuisses.gif" },
            { id: "j4-e3", name: "Leg curl allongé", sub: "Ischios-jambiers", series: 4, reps: "12–15", restLabel: "75 s repos", restSeconds: 75, tip: "Amplitude complète", demo: "leg-curl.gif" },
            { id: "j4-e4", name: "Soulevé de terre jambes tendues", sub: "Romanian deadlift", series: 3, reps: "10–12", restLabel: "90 s repos", restSeconds: 90, tip: "Étirement ischios en bas", demo: "souleve-terre-jambes-tendues.gif" },
            { id: "j4-e5", name: "Mollets debout (unipodal ou machine)", sub: "", series: 4, reps: "15–20", restLabel: "60 s repos", restSeconds: 60, tip: "Pause 2 sec en haut et en bas", demo: "mollets-debout.gif" },
          ],
        },
      ],
      tips: [
        "À 118 kg, bien surveiller les genoux au squat — ceinture conseillée pour les séries lourdes",
        "Commencer par 10 min de vélo elliptique pour chauffer genoux et hanches",
        "C'est la séance la plus fatigante — bien s'alimenter avant",
        "Les mollets nécessitent un volume élevé pour progresser",
      ],
    },
    {
      id: "j5",
      code: "J5",
      title: "Full Body + Cardio HIIT",
      description: "Polyarticulaires fonctionnels + cardio pour la composition corporelle",
      muscleTags: ["Corps entier", "Cardio"],
      restInfo: { duration: "60–70 min", warmup: "5–10 min", suggestedDay: "Samedi" },
      sections: [
        {
          title: "Full Body",
          exercises: [
            { id: "j5-e1", name: "Soulevé de terre conventionnel", sub: "Ceinture conseillée", series: 4, reps: "6–8", restLabel: "2–3 min repos", restSeconds: 150, tip: "Dos plat, pousse avec les jambes", demo: "souleve-terre.gif" },
            { id: "j5-e2", name: "Tirage poitrine TRX ou rowing", sub: "Polyarticulaire tirage", series: 3, reps: "10–12", restLabel: "90 s repos", restSeconds: 90, tip: "Complète le travail du dos de J2", demo: "rowing-trx.gif" },
            { id: "j5-e3", name: "Fentes avant haltères", sub: "Alternées", series: 3, reps: "10/jambe", restLabel: "75 s repos", restSeconds: 75, tip: "Genou avant aligné avec le pied", demo: "fentes.gif" },
            { id: "j5-e4", name: "Gainage (planche + variantes)", sub: "Face, latéral", series: 3, reps: "30–45 s", restLabel: "45 s repos", restSeconds: 45, tip: "Bassin aligné, pas de cambrure", demo: "gainage.gif" },
            { id: "j5-e5", name: "Cardio HIIT", sub: "Vélo, rameur ou tapis", series: 8, reps: "30 s effort / 90 s récup", restLabel: "90 s repos", restSeconds: 90, tip: "Effort à ~85% de la fréquence max" },
          ],
        },
      ],
      tips: [
        "Le HIIT vient toujours après la muscu, jamais avant",
        "Adapte l'intensité du HIIT à ta récupération de la semaine — ce n'est pas une compétition",
        "Séance idéale pour finir la semaine sur du volume modéré et du cardio",
      ],
    },
  ],
  nutrition: [
    { icon: "🥩", title: "Protéines — la brique de base", text: "Vise ~200–220 g/jour, répartis sur 4–5 repas, pour soutenir la prise de masse musculaire." },
    { icon: "🍚", title: "Glucides — timing autour de l'effort", text: "Concentre-les avant et après l'entraînement. Réduis le soir les jours off." },
    { icon: "😴", title: "Sommeil — Muscle se construit là", text: "7 à 9h minimum. La GH est sécrétée la nuit. C'est non-négociable pour la prise de masse." },
    { icon: "🗓️", title: "Planning conseillé", text: "Lun / Mar / Jeu / Ven / Sam. Repos mer & dim. Jambes en fin de semaine pour récupérer le WE." },
  ],
};
