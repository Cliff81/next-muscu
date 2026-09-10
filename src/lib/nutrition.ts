"use client";

/**
 * Estimation des besoins énergétiques.
 *
 * Formule de Mifflin-St Jeor pour le métabolisme de base, puis un facteur
 * d'activité. Ce sont des **estimations de population** : deux personnes de
 * mêmes mesures peuvent avoir 300 kcal d'écart. À utiliser comme point de
 * départ, à ajuster sur l'évolution réelle du poids.
 */
import type { Profile } from "@/lib/profile";

export type Goal = "masse" | "maintien" | "seche";

export const GOALS: { id: Goal; name: string; summary: string }[] = [
  { id: "masse", name: "Prise de masse", summary: "Léger surplus, pour construire du muscle" },
  { id: "maintien", name: "Maintien", summary: "Stabiliser le poids actuel" },
  { id: "seche", name: "Sèche", summary: "Déficit modéré, pour perdre du gras" },
];

export type ComputedNeeds = {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sexApproximated: boolean;
};

export type Needs = ComputedNeeds | { missing: string[] };

/** Facteur d'activité déduit du nombre de séances hebdomadaires. */
function activityFactor(sessions: number): number {
  if (sessions <= 1) return 1.2;
  if (sessions <= 3) return 1.375;
  if (sessions <= 5) return 1.55;
  return 1.725;
}

const ADJUSTMENT: Record<Goal, number> = {
  masse: 1.15,
  maintien: 1,
  seche: 0.8,
};

export function computeNeeds(
  profile: Profile,
  goal: Goal,
  sessionsPerWeek: number
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

  const base = 10 * kg + 6.25 * cm - 5 * age;
  // Sans sex renseigné, on prend le milieu des deux constantes plutôt que
  // d'en supposer un.
  const constant =
    profile.sex === "homme" ? 5 : profile.sex === "femme" ? -161 : (5 - 161) / 2;
  const bmr = Math.round(base + constant);
  const tdee = Math.round(bmr * activityFactor(sessionsPerWeek));
  const calories = Math.round(tdee * ADJUSTMENT[goal]);

  // 1,8 g de protéines par kilo : fourchette haute usuelle en renforcement.
  const protein = Math.round(kg * 1.8);
  // 25 % des calories en lipides, le reste en glucides.
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return {
    bmr,
    tdee,
    calories,
    protein,
    fat,
    carbs,
    sexApproximated: profile.sex === null || profile.sex === "autre",
  };
}
