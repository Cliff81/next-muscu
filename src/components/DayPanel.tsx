"use client";

import Link from "next/link";
import { AddSectionButton } from "@/components/AddSectionButton";
import { ExerciseDemo } from "@/components/ExerciseDemo";
import { AddExerciseButton, ExercisePicker } from "@/components/ExercisePicker";
import { LoadGauge } from "@/components/LoadGauge";
import type { CatalogExercise } from "@/lib/catalog";
import {
  addExercise,
  addSection,
  removeExercise,
  removeSection,
  renameDay,
  renameSection,
  setSetsAndReps,
} from "@/lib/editProgram";
import { LOAD_LABELS, loadLevel } from "@/lib/loadLevel";
import { activeSessionStore, programStore } from "@/lib/stores";
import { swapExercise } from "@/lib/swapExercise";
import type { Day, Program } from "@/lib/types";

type Props = {
  day: Day;
  editing?: boolean;
  onRemoveDay?: () => void;
};

export function DayPanel({ day, editing = false, onRemoveDay }: Props) {
  const activeSession = activeSessionStore.useValue();
  const hasActiveSession = Boolean(
    activeSession && activeSession.dayId === day.id && !activeSession.finishedAt
  );

  // Écrire dans le magasin suffit : la synchronisation observe le programme et
  // remonte le changement d'elle-même.
  const apply = (change: (program: Program) => Program) => {
    programStore.set(change(programStore.get()));
  };

  const replaceExercise = (exerciseId: string, replacement: CatalogExercise) =>
    apply((p) => swapExercise(p, day.id, exerciseId, replacement));

  return (
    <div className="animate-fade">
      <div className="mb-8 flex items-start gap-5">
        <div className="rounded-lg border border-border bg-surface px-4 py-1 font-display text-4xl leading-none text-accent">
          {day.code}
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={day.title}
                aria-label="Titre de la journée"
                onChange={(e) => apply((p) => renameDay(p, day.id, e.target.value, day.description))}
                className="font-display w-full rounded-md border border-border bg-surface2 px-3 py-1.5 text-3xl tracking-[0.01em] text-text focus:border-accent focus:outline-none"
              />
              <input
                type="text"
                value={day.description}
                aria-label="Description de la journée"
                onChange={(e) => apply((p) => renameDay(p, day.id, day.title, e.target.value))}
                className="w-full rounded-md border border-border bg-surface2 px-3 py-1.5 text-[0.85rem] text-muted focus:border-accent focus:outline-none"
              />
            </div>
          ) : (
            <>
              <h2 className="font-display text-4xl tracking-[0.01em]">{day.title}</h2>
              <p className="mt-1 text-[0.85rem] text-muted">{day.description}</p>
            </>
          )}
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
        {editing ? (
          onRemoveDay && (
            <button
              type="button"
              onClick={onRemoveDay}
              className="shrink-0 rounded-md border border-neg/60 px-4 py-2.5 text-center text-sm text-neg transition hover:bg-neg-soft"
            >
              Supprimer la journée
            </button>
          )
        ) : (
          <Link
            href={`/session/${day.id}`}
            className="shrink-0 rounded-md bg-accent px-4 py-3 text-center text-sm font-bold text-bg transition hover:opacity-90"
          >
            {hasActiveSession ? "Reprendre la séance ▸" : "Démarrer la séance ▸"}
          </Link>
        )}
      </div>

      {/*
        Clé par position et non par titre : une clé qui contient le titre change
        à chaque frappe, React remonte le bloc, et le champ de saisie perd le
        focus au premier caractère. Les catégories ne se réordonnent pas, la
        position est donc stable.
      */}
      {day.sections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          <div className="mt-6 mb-3 flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <input
                  type="text"
                  value={section.title}
                  aria-label="Nom de la catégorie"
                  onChange={(e) =>
                    apply((p) => renameSection(p, day.id, sectionIndex, e.target.value))
                  }
                  className="font-display flex-1 rounded-md border border-border bg-surface2 px-3 py-1 text-xl tracking-[0.03em] text-accent2 focus:border-accent focus:outline-none"
                />
                <AddExerciseButton
                  sectionTitle={section.title}
                  muscles={section.muscles}
                  onChoose={(chosen) =>
                    apply((p) => addExercise(p, day.id, sectionIndex, chosen))
                  }
                />
                <button
                  type="button"
                  onClick={() => apply((p) => removeSection(p, day.id, sectionIndex))}
                  aria-label={`Supprimer la catégorie ${section.title}`}
                  title="Supprimer la catégorie"
                  className="rounded-md border border-border px-2 py-1.5 text-xs text-muted transition hover:border-neg hover:text-neg"
                >
                  ✕
                </button>
              </>
            ) : (
              <div className="font-display text-xl tracking-[0.03em] text-accent2">
                {section.title}
              </div>
            )}
          </div>

          {section.exercises.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted">
              Aucun exercice dans cette catégorie.
              {!editing && " Passe en modification pour en ajouter."}
            </p>
          ) : (
            <>
              <div className="mb-1 hidden grid-cols-[2fr_0.6fr_1fr_1.4fr] gap-2 px-4 sm:grid">
                <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Exercice</div>
                <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Séries</div>
                <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Répétitions</div>
                <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">
                  {editing ? "" : "Conseil"}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {section.exercises.map((exercise) => {
                  const load = loadLevel(exercise.reps);
                  return (
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
                        {exercise.sub && (
                          <div className="mt-0.5 text-[0.72rem] text-muted">{exercise.sub}</div>
                        )}
                      </div>

                      {editing ? (
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={exercise.series}
                          aria-label={`Séries pour ${exercise.name}`}
                          onChange={(e) =>
                            apply((p) =>
                              setSetsAndReps(
                                p,
                                day.id,
                                exercise.id,
                                Math.max(1, Number(e.target.value) || 1),
                                exercise.reps
                              )
                            )
                          }
                          className="w-16 rounded-md border border-border bg-surface2 px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <div className="font-display text-xl text-accent before:content-['Séries:_'] before:text-[0.7rem] before:text-muted before:font-sans sm:before:content-none">
                          {exercise.series}
                        </div>
                      )}

                      {editing ? (
                        <input
                          type="text"
                          value={exercise.reps}
                          aria-label={`Répétitions pour ${exercise.name}`}
                          onChange={(e) =>
                            apply((p) =>
                              setSetsAndReps(p, day.id, exercise.id, exercise.series, e.target.value)
                            )
                          }
                          className="w-24 rounded-md border border-border bg-surface2 px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <div className="text-[0.9rem] before:content-['Reps:_'] before:text-[0.7rem] before:text-muted before:font-sans sm:before:content-none">
                          <span className="inline-flex items-center gap-1.5">
                            {load && <LoadGauge level={load} />}
                            {exercise.reps}
                          </span>
                          <span className="mt-0.5 block text-[0.68rem] text-muted">
                            {load ? `${exercise.restLabel} · ${LOAD_LABELS[load]}` : exercise.restLabel}
                          </span>
                        </div>
                      )}

                      {editing ? (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => apply((p) => removeExercise(p, day.id, exercise.id))}
                            aria-label={`Retirer ${exercise.name}`}
                            title="Retirer cet exercice"
                            className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-neg hover:text-neg"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-[0.78rem] text-[#b8b8b8]">{exercise.tip}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}

      {editing && (
        <AddSectionButton
          onAdd={(title, muscles) => apply((p) => addSection(p, day.id, title, muscles))}
        />
      )}

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
