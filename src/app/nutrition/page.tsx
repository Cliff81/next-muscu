"use client";

import { NutritionSection } from "@/components/NutritionSection";
import { computeNeeds, GOALS, type Goal } from "@/lib/nutrition";
import { profileStore } from "@/lib/profile";
import { useProgram } from "@/lib/useProgram";
import { useState } from "react";

/**
 * Volet Healthier : les besoins estimés d'après le profil, puis les conseils
 * du programme.
 */
export default function NutritionPage() {
  const profile = profileStore.useValue();
  const { program } = useProgram();
  const [goal, setGoal] = useState<Goal>("masse");

  const sessions = program.days.length || 4;
  // Chaîne construite en JS et non en JSX : les règles d'espacement de JSX
  // autour d'une expression coupée en fin de ligne mangeaient l'espace avant
  // « par », ce qui donnait « 5 séancespar semaine ».
  const rhythm = `${sessions} séance${sessions > 1 ? "s" : ""} par semaine`;
  const needs = profile ? computeNeeds(profile, goal, sessions) : null;

  return (
    <>
      <header className="mx-auto flex w-full max-w-[900px] flex-col gap-2 px-8 pt-10 pb-8">
        <div className="text-[0.7rem] font-medium tracking-[0.25em] text-accent uppercase">
          Nutrition &amp; récupération
        </div>
        <h1 className="font-display text-[clamp(3rem,8vw,5rem)] leading-[0.9] tracking-[0.02em]">
          Tes <span className="text-accent">besoins</span>
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          Estimation par la formule de Mifflin-St Jeor, sur {rhythm}. Ce sont des
          ordres de grandeur : ajuste-les sur l&apos;évolution réelle de ton poids.
        </p>
      </header>

      <div className="mx-auto w-full max-w-[900px] px-8 pb-8">
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoal(g.id)}
              title={g.summary}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                goal === g.id
                  ? "border-accent bg-accent-soft font-medium text-accent"
                  : "border-border2 text-muted hover:text-text"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {!needs ? null : "missing" in needs ? (
          <p className="mt-5 rounded-2xl bg-surface2 px-4 py-3 text-sm text-muted">
            Il manque {needs.missing.join(", ")} pour ce calcul. Renseigne-les en
            relançant l&apos;assistant depuis ton profil.
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
              <Tile value={needs.calories} unit="kcal/jour" label="Objectif" strong />
              <Tile value={needs.protein} unit="g" label="Protéines" />
              <Tile value={needs.carbs} unit="g" label="Glucides" />
              <Tile value={needs.fat} unit="g" label="Lipides" />
            </div>
            <p className="mt-3 text-xs text-muted">
              Métabolisme de base {needs.bmr} kcal · dépense estimée {needs.tdee} kcal
              {needs.sexApproximated
                ? " · sexe non renseigné : valeur intermédiaire entre les deux formules"
                : ""}
            </p>
          </>
        )}
      </div>

      <NutritionSection cards={program.nutrition} />
    </>
  );
}

function Tile({
  value,
  unit,
  label,
  strong,
}: {
  value: number;
  unit: string;
  label: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${strong ? "bg-accent-soft" : "bg-calm-soft"}`}>
      <div
        className={`font-display text-3xl leading-none ${strong ? "text-accent" : "text-text"}`}
      >
        {value}
        <span className="ml-1 text-xs text-muted">{unit}</span>
      </div>
      <div className="mt-1 text-[0.7rem] tracking-[0.15em] text-muted uppercase">
        {label}
      </div>
    </div>
  );
}
