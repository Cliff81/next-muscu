"use client";

import { ActivityEditor } from "@/components/ActivityEditor";
import { NutritionSection } from "@/components/NutritionSection";
import { NEAT_LEVELS, hoursLabel, programMinutes } from "@/lib/activities";
import { computeNeeds, GOALS } from "@/lib/nutrition";
import { nutritionAdvice } from "@/lib/nutritionAdvice";
import { profileStore } from "@/lib/profile";
import { activitiesStore, goalStore, neatStore } from "@/lib/stores";
import { useProgram } from "@/lib/useProgram";

/**
 * Volet Healthier : les besoins estimés, la dépense détaillée poste par poste,
 * les sports déclarés, puis les conseils qui en découlent.
 */
export default function NutritionPage() {
  const profile = profileStore.useValue();
  const activities = activitiesStore.useValue();
  const neat = neatStore.useValue();
  const { program } = useProgram();
  const goal = goalStore.useValue();

  const sessions = program.days.length || 4;
  const minutes = programMinutes(program.days.map((d) => d.restInfo.duration));
  // Chaîne construite en JS et non en JSX : les règles d'espacement de JSX
  // autour d'une expression coupée en fin de ligne mangeaient l'espace avant
  // « par », ce qui donnait « 5 séancespar semaine ».
  const rhythm = `${sessions} séance${sessions > 1 ? "s" : ""} de ${minutes} min par semaine`;

  const needs = profile
    ? computeNeeds(profile, goal, { sessionsPerWeek: sessions, minutesPerSession: minutes }, activities, neat)
    : null;
  const sportMinutes = activities.reduce(
    (sum, a) => sum + a.sessionsPerWeek * a.minutesPerSession,
    0
  );

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

      <div className="mx-auto w-full max-w-[900px] px-8 pb-16">
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => goalStore.set(g.id)}
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

        {!profile ? (
          <p className="mt-5 rounded-2xl bg-surface2 px-4 py-3 text-sm text-muted">
            Connecte-toi pour retrouver ton profil et calculer tes besoins.
          </p>
        ) : !needs ? null : "missing" in needs ? (
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

            <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
              <h2 className="font-display text-xl text-accent2">Dépense estimée</h2>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                <Line label="Vie courante, hors sport" value={needs.base} />
                <Line
                  label={`Renforcement · ${sessions} × ${minutes} min`}
                  value={needs.programBurn}
                />
                <Line
                  label={
                    sportMinutes > 0
                      ? `Autres sports · ${hoursLabel(sportMinutes)}/sem`
                      : "Autres sports · aucun déclaré"
                  }
                  value={needs.sportBurn}
                />
                <li className="mt-1 flex items-baseline justify-between border-t border-border pt-2 font-medium">
                  <span>Total</span>
                  <span className="num">{needs.tdee} kcal/jour</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted">
                Métabolisme de base {needs.bmr} kcal. Les séances sont chiffrées par
                leur équivalent métabolique, dépense de repos déduite pour ne pas la
                compter deux fois.
                {needs.sexApproximated
                  ? " Sexe non renseigné : valeur intermédiaire entre les deux formules."
                  : ""}
              </p>

              <div className="mt-4">
                <div className="mb-1.5 text-[0.7rem] tracking-[0.12em] text-muted uppercase">
                  Tes journées, hors sport
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {NEAT_LEVELS.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => neatStore.set(level.id)}
                      title={level.summary}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        neat === level.id
                          ? "border-accent bg-accent-soft font-medium text-accent"
                          : "border-border2 text-muted hover:text-text"
                      }`}
                    >
                      {level.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ActivityEditor weightKg={profile.weightKg} />

            <NutritionSection
              cards={nutritionAdvice(goal, needs, profile.weightKg ?? 0, sportMinutes)}
            />
          </>
        )}
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-muted">
      <span>{label}</span>
      <span className="num text-text">{value} kcal/jour</span>
    </li>
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
