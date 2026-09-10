"use client";

/**
 * Entraînement à la maison.
 *
 * Le catalogue décrit le matériel de salle (barre, haltères, poulie, machine)
 * mais ne dit rien du mobilier : un « Bench Dips » y est classé « poids du
 * corps » alors qu'il demande une chaise, et un « Pullups » aussi alors qu'il
 * demande une barre. Ces exigences se lisent dans le nom du mouvement, et
 * c'est ce que fait `requiredSupport` — pour ne pas proposer des tractions à
 * quelqu'un qui n'a qu'un tapis.
 */
import type { Equipment, CatalogExercise } from "@/lib/catalog";

export type Support = "chair" | "bar" | "band";

export const SUPPORTS: { id: Support; name: string; summary: string }[] = [
  {
    id: "chair",
    name: "Une chaise ou un banc",
    summary: "Dips, pompes inclinées ou déclinées, montées de marche",
  },
  {
    id: "bar",
    name: "Une barre de traction, ou une table solide",
    summary: "Tractions et rowing inversé — le seul vrai moyen de travailler le dos",
  },
  {
    id: "band",
    name: "Un élastique",
    summary: "Épaules, mollets, et de la charge sur les jambes",
  },
];

/** Support exigé par un exercice au poids du corps, ou `null` s'il n'en faut aucun. */
export function requiredSupport(name: string): Support | null {
  if (/pull-?up|chin-?up|inverted row/i.test(name)) return "bar";
  if (/bench|incline|decline|elevated|step-?up|\bdip/i.test(name)) return "chair";
  return null;
}

/** Matériel du catalogue disponible à la maison, selon ce qu'on possède. */
export function homeEquipment(supports: Support[]): Equipment[] {
  const list: Equipment[] = ["body only"];
  if (supports.includes("band")) list.push("bands");
  return list;
}

/**
 * Écarte les exercices dont le support manque. Ne s'applique qu'au poids du
 * corps : les exercices à élastique n'ont pas d'exigence de mobilier.
 */
export function availableAtHome(exercise: CatalogExercise, supports: Support[]): boolean {
  if (exercise.equipment === "bands") return supports.includes("band");
  const needed = requiredSupport(exercise.name);
  return needed === null || supports.includes(needed);
}

/**
 * Mouvements fondamentaux du poids du corps, placés en tête des propositions.
 *
 * Choix éditorial assumé : le catalogue ne dit pas quels exercices comptent, et
 * le tri alphabétique faisait ouvrir une séance pectoraux par « Isometric Chest
 * Squeezes » plutôt que par des pompes. Cette liste corrige l'ordre sans rien
 * exclure — le reste du catalogue suit derrière. Les identifiants sont vérifiés
 * contre `exercises.json`.
 */
export const HOME_FUNDAMENTALS: ReadonlySet<string> = new Set([
  // Pousser
  "Pushups",
  "Push-Up_Wide",
  "Pushups_Close_and_Wide_Hand_Positions",
  "Incline_Push-Up",
  "Decline_Push-Up",
  "Push-Ups_With_Feet_Elevated",
  "Single-Arm_Push-Up",
  "Dips_-_Chest_Version",
  "Handstand_Push-Ups",
  // Tirer
  "Pullups",
  "Chin-Up",
  "Wide-Grip_Rear_Pull-Up",
  "Inverted_Row",
  "Band_Pull_Apart",
  "Back_Flyes_-_With_Bands",
  // Triceps
  "Bench_Dips",
  "Dips_-_Triceps_Version",
  "Body_Tricep_Press",
  "Standing_Towel_Triceps_Extension",
  // Jambes
  "Bodyweight_Squat",
  "Bodyweight_Walking_Lunge",
  "Split_Jump",
  "Freehand_Jump_Squat",
  "Step-up_with_Knee_Raise",
  "Natural_Glute_Ham_Raise",
  "Floor_Glute-Ham_Raise",
  "Butt_Lift_Bridge",
  "Single_Leg_Glute_Bridge",
  "Glute_Kickback",
  // Gainage
  "Plank",
  "Crunches",
  "Mountain_Climbers",
  "Air_Bike",
  "Russian_Twist",
  "Flutter_Kicks",
]);
