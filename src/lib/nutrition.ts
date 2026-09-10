"use client";

/**
 * Estimation des besoins énergétiques.
 *
 * Formule de Mifflin-St Jeor pour le métabolisme de base, puis la dépense
 * d'activité **chiffrée poste par poste** : un socle pour la vie courante,
 * plus le programme de renforcement, plus les sports déclarés. Le facteur
 * forfaitaire d'avant (« 5 séances par semaine → ×1,55 ») supposait le sport ;
 * maintenant qu'on connaît les séances, leur durée et leur intensité, autant
 * les compter.
 *
 * Ce sont des **estimations de population** : deux personnes de mêmes mesures
 * peuvent avoir 300 kcal d'écart. À utiliser comme point de départ, à ajuster
 * sur l'évolution réelle du poids.
 */
import {
  STRENGTH_MET,
  neatFactor,
  sessionBurn,
  weeklyActivityBurn,
  type Activity,
  type Intensity,
  type NeatLevel,
} from "@/lib/activities";
import type { Profile } from "@/lib/profile";

export type Goal = "masse" | "maintien" | "seche";

export const GOALS: { id: Goal; name: string; summary: string }[] = [
  { id: "masse", name: "Prise de masse", summary: "Léger surplus, pour construire du muscle" },
  { id: "maintien", name: "Maintien", summary: "Stabiliser le poids actuel" },
  { id: "seche", name: "Sèche", summary: "Déficit modéré, pour perdre du gras" },
];

const ADJUSTMENT: Record<Goal, number> = {
  masse: 1.15,
  maintien: 1,
  seche: 0.8,
};

/** Le programme de renforcement, tel qu'il se présente. */
export type Training = {
  sessionsPerWeek: number;
  minutesPerSession: number;
  intensity?: Intensity;
};

export type ComputedNeeds = {
  bmr: number;
  /** Dépense de vie courante, hors sport, par jour. */
  base: number;
  /** Renforcement, ramené au jour. */
  programBurn: number;
  /** Sports déclarés, ramenés au jour. */
  sportBurn: number;
  tdee: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sexApproximated: boolean;
};

export type Needs = ComputedNeeds | { missing: string[] };

export function computeNeeds(
  profile: Profile,
  goal: Goal,
  training: Training,
  activities: Activity[] = [],
  neat: NeatLevel = "sedentary"
): Needs {
  // Les champs facultatifs le restent : sans eux on le dit, on n'invente pas.
  const missing: string[] = [];
  if (profile.weightKg === null) missing.push("ton poids");
  if (profile.heightCm === null) missing.push("ta taille");
  if (profile.age === null) missing.push("ton âge");
  if (missing.length) return { missing };

  const kg = profile.weightKg!;
  const cm = profile.heightCm!;
  const age = profile.age!;

  const formula = 10 * kg + 6.25 * cm - 5 * age;
  // Sans sexe renseigné, on prend le milieu des deux constantes plutôt que
  // d'en supposer un.
  const constant =
    profile.sex === "homme" ? 5 : profile.sex === "femme" ? -161 : (5 - 161) / 2;
  const bmr = Math.round(formula + constant);

  const base = Math.round(bmr * neatFactor(neat));
  const strengthWeekly =
    sessionBurn(STRENGTH_MET[training.intensity ?? "moderate"], training.minutesPerSession, kg) *
    training.sessionsPerWeek;
  const programBurn = Math.round(strengthWeekly / 7);
  const sportBurn = Math.round(weeklyActivityBurn(activities, kg) / 7);

  const tdee = base + programBurn + sportBurn;
  const calories = Math.round(tdee * ADJUSTMENT[goal]);

  // 1,8 g de protéines par kilo : fourchette haute usuelle en renforcement.
  const protein = Math.round(kg * 1.8);
  // 25 % des calories en lipides, le reste en glucides.
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return {
    bmr,
    base,
    programBurn,
    sportBurn,
    tdee,
    calories,
    protein,
    fat,
    carbs,
    sexApproximated: profile.sex === null || profile.sex === "autre",
  };
}
