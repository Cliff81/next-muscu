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

export type Objectif = "masse" | "maintien" | "seche";

export const OBJECTIFS: { id: Objectif; nom: string; resume: string }[] = [
  { id: "masse", nom: "Prise de masse", resume: "Léger surplus, pour construire du muscle" },
  { id: "maintien", nom: "Maintien", resume: "Stabiliser le poids actuel" },
  { id: "seche", nom: "Sèche", resume: "Déficit modéré, pour perdre du gras" },
];

export type BesoinsCalcules = {
  metabolismeBase: number;
  depenseTotale: number;
  calories: number;
  proteines: number;
  lipides: number;
  glucides: number;
  approximeSexe: boolean;
};

export type Besoins = BesoinsCalcules | { manquant: string[] };

/** Facteur d'activité déduit du nombre de séances hebdomadaires. */
function facteurActivite(seances: number): number {
  if (seances <= 1) return 1.2;
  if (seances <= 3) return 1.375;
  if (seances <= 5) return 1.55;
  return 1.725;
}

const AJUSTEMENT: Record<Objectif, number> = {
  masse: 1.15,
  maintien: 1,
  seche: 0.8,
};

export function calculerBesoins(
  profil: Profile,
  objectif: Objectif,
  seancesParSemaine: number
): Besoins {
  // Les champs facultatifs le restent : sans eux on le dit, on n'invente pas.
  const manquant: string[] = [];
  if (profil.poidsKg === null) manquant.push("ton poids");
  if (profil.tailleCm === null) manquant.push("ta taille");
  if (profil.age === null) manquant.push("ton âge");
  if (manquant.length) return { manquant };

  const kg = profil.poidsKg!;
  const cm = profil.tailleCm!;
  const age = profil.age!;

  const base = 10 * kg + 6.25 * cm - 5 * age;
  // Sans sexe renseigné, on prend le milieu des deux constantes plutôt que
  // d'en supposer un.
  const constante =
    profil.sexe === "homme" ? 5 : profil.sexe === "femme" ? -161 : (5 - 161) / 2;
  const metabolismeBase = Math.round(base + constante);
  const depenseTotale = Math.round(metabolismeBase * facteurActivite(seancesParSemaine));
  const calories = Math.round(depenseTotale * AJUSTEMENT[objectif]);

  // 1,8 g de protéines par kilo : fourchette haute usuelle en renforcement.
  const proteines = Math.round(kg * 1.8);
  // 25 % des calories en lipides, le reste en glucides.
  const lipides = Math.round((calories * 0.25) / 9);
  const glucides = Math.round((calories - proteines * 4 - lipides * 9) / 4);

  return {
    metabolismeBase,
    depenseTotale,
    calories,
    proteines,
    lipides,
    glucides,
    approximeSexe: profil.sexe === null || profil.sexe === "autre",
  };
}
