"use client";

import Link from "next/link";
import { ExerciseDemo } from "@/components/ExerciseDemo";
import { ExercisePicker } from "@/components/ExercisePicker";
import type { CatalogExercise } from "@/lib/catalog";
import { activeSessionStore, programStore } from "@/lib/stores";
import { swapExercise } from "@/lib/swapExercise";
import type { Day } from "@/lib/types";

export function DayPanel({ day }: { day: Day }) {
  const activeSession = activeSessionStore.useValue();
  const hasActiveSession = Boolean(
    activeSession && activeSession.dayId === day.id && !activeSession.finishedAt
  );

  // Écrire dans le magasin suffit : la synchronisation observe le programme et
  // remonte le changement d'elle-même.
  const replaceExercise = (exerciseId: string, replacement: CatalogExercise) => {
    programStore.set(swapExercise(programStore.get(), day.id, exerciseId, replacement));
  };

  return (
    <div className="animate-fade">
      <div className="mb-8 flex items-start gap-5">
        <div className="rounded-lg border border-border bg-surface px-4 py-1 font-display text-4xl leading-none text-accent">
          {day.code}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-4xl tracking-[0.01em]">{day.title}</h2>
          <p className="mt-1 text-[0.85rem] text-muted">{day.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {day.muscleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[0.65rem] tracking-[0.08em] text-accent uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <Link
          href={`/session/${day.id}`}
          className="shrink-0 rounded-md bg-accent px-4 py-3 text-center text-sm font-bold text-bg transition hover:opacity-90"
        >
          {hasActiveSession ? "Reprendre la séance ▸" : "Démarrer la séance ▸"}
        </Link>
      </div>

      {day.sections.map((section) => (
        <div key={section.title}>
          <div className="font-display mt-6 mb-3 text-xl tracking-[0.03em] text-accent2">
            {section.title}
          </div>
          <div className="mb-1 hidden grid-cols-[2fr_0.6fr_1fr_1.4fr] gap-2 px-4 sm:grid">
            <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Exercice</div>
            <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Séries</div>
            <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Répétitions</div>
            <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Conseil</div>
          </div>
          <div className="flex flex-col gap-2">
            {section.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="grid grid-cols-1 items-center gap-1 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[2fr_0.6fr_1fr_1.4fr] sm:gap-2"
              >
                <div className="text-[0.9rem] font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {exercise.name}
                    <ExerciseDemo
                      name={exercise.name}
                      images={exercise.images}
                      demo={exercise.demo}
                    />
                    <ExercisePicker
                      current={exercise}
                      muscles={section.muscles}
                      onChoose={(replacement) => replaceExercise(exercise.id, replacement)}
                    />
                  </span>
                  {exercise.sub && <div className="mt-0.5 text-[0.72rem] text-muted">{exercise.sub}</div>}
                </div>
                <div className="font-display text-xl text-accent before:content-['Séries:_'] before:text-[0.7rem] before:text-muted before:font-sans sm:before:content-none">
                  {exercise.series}
                </div>
                <div className="text-[0.9rem] before:content-['Reps:_'] before:text-[0.7rem] before:text-muted before:font-sans sm:before:content-none">
                  {exercise.reps}
                  <span className="mt-0.5 block text-[0.68rem] text-muted">{exercise.restLabel}</span>
                </div>
                <div className="text-[0.78rem] text-[#b8b8b8]">{exercise.tip}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="min-w-[120px] flex-1 rounded-lg border border-border bg-surface2 px-5 py-3 text-center">
          <div className="font-display text-xl text-accent">{day.restInfo.duration}</div>
          <div className="mt-0.5 text-[0.65rem] tracking-[0.06em] text-muted uppercase">Durée estimée</div>
        </div>
        <div className="min-w-[120px] flex-1 rounded-lg border border-border bg-surface2 px-5 py-3 text-center">
          <div className="font-display text-xl text-accent">{day.restInfo.warmup}</div>
          <div className="mt-0.5 text-[0.65rem] tracking-[0.06em] text-muted uppercase">Échauffement</div>
        </div>
        <div className="min-w-[120px] flex-1 rounded-lg border border-border bg-surface2 px-5 py-3 text-center">
          <div className="font-display text-xl text-accent">{day.restInfo.suggestedDay}</div>
          <div className="mt-0.5 text-[0.65rem] tracking-[0.06em] text-muted uppercase">Jour conseillé</div>
        </div>
      </div>

      {day.tips.length > 0 && (
        <div className="mt-6 rounded-lg border border-accent/20 bg-accent/5 p-5">
          <h4 className="font-display mb-2.5 text-base tracking-[0.02em] text-accent">Conseils du jour</h4>
          <ul className="flex flex-col gap-1.5 pl-5">
            {day.tips.map((tip) => (
              <li key={tip} className="list-disc text-[0.82rem] text-[#ccc]">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
