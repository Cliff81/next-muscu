"use client";

/**
 * Zones douloureuses déclarées, et exercices à écarter.
 *
 * Ce n'est pas un avis médical et l'application le dit à l'écran : c'est un
 * filtre de bon sens, qui met de côté les mouvements connus pour solliciter
 * fortement une articulation. Une douleur qui dure demande un médecin, pas un
 * générateur de programme.
 *
 * Le catalogue décrit les muscles travaillés, jamais les articulations
 * chargées : un « Overhead Press » n'est pas étiqueté « épaule en fin de
 * course ». Les règles portent donc sur les **noms de mouvements**, complétées
 * par les muscles quand ils font sens — les lombaires, par exemple, sont un
 * muscle du catalogue autant qu'une zone de douleur.
 */
import type { CatalogExercise } from "@/lib/catalog";

export type PainArea =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "lowerBack"
  | "knee"
  | "hip"
  | "neck"
  | "ankle";

export const PAIN_AREAS: { id: PainArea; name: string; summary: string }[] = [
  { id: "shoulder", name: "Épaule", summary: "On écarte le travail au-dessus de la tête et les dips" },
  { id: "elbow", name: "Coude", summary: "On écarte les extensions lourdes de triceps et les dips" },
  { id: "wrist", name: "Poignet", summary: "On écarte les appuis mains au sol et les barres en pronation forcée" },
  { id: "lowerBack", name: "Bas du dos", summary: "On écarte soulevés de terre, bonjours et rowings buste penché" },
  { id: "knee", name: "Genou", summary: "On écarte fentes, sauts et flexions profondes" },
  { id: "hip", name: "Hanche", summary: "On écarte les flexions profondes et les mouvements d'amplitude" },
  { id: "neck", name: "Nuque", summary: "On écarte haussements d'épaules et tirages menton" },
  { id: "ankle", name: "Cheville", summary: "On écarte sauts, montées de mollets et fentes" },
];

/** Mouvements écartés pour chaque zone, reconnus par leur nom. */
const NAME_RULES: Record<PainArea, RegExp> = {
  shoulder:
    /overhead|military|behind the neck|upright row|handstand|\bdip|snatch|jerk|push press|shoulder press|arnold/i,
  elbow: /skull|close-grip|\bdip|triceps extension|overhead triceps|french|pushdown|kickback/i,
  wrist: /push-?up|front squat|handstand|clean|wrist|plank|burpee|mountain climber/i,
  lowerBack:
    /deadlift|good morning|bent over|bent-over|hyperextension|clean|snatch|back extension|romanian|stiff/i,
  knee: /squat|lunge|leg extension|jump|plyo|bound|sprint|step-?up|skater|burpee|pistol/i,
  hip: /squat|lunge|deadlift|hip|adduction|abduction|good morning|step-?up/i,
  neck: /shrug|upright row|behind the neck|\bneck\b/i,
  ankle: /calf|jump|bound|skip|sprint|lunge|plyo|burpee/i,
};

/** Muscles dont le travail direct est écarté pour une zone. */
const MUSCLE_RULES: Partial<Record<PainArea, string[]>> = {
  lowerBack: ["lower back"],
  neck: ["neck", "traps"],
  ankle: ["calves"],
};

/** Un exercice est-il à écarter au vu des zones déclarées ? */
export function hurtsFor(exercise: CatalogExercise, areas: PainArea[]): boolean {
  return areas.some((area) => {
    if (NAME_RULES[area].test(exercise.name)) return true;
    const muscles = MUSCLE_RULES[area];
    return muscles ? exercise.muscles.some((m) => muscles.includes(m)) : false;
  });
}
