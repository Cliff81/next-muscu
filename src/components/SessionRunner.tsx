"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExerciseDemo } from "@/components/ExerciseDemo";
import { LoadGauge } from "@/components/LoadGauge";
import { askNotifications } from "@/lib/notify";
import { frenchName } from "@/lib/exerciseNames";
import { detectPlateau } from "@/lib/progressData";
import { warmupRamp } from "@/lib/warmup";
import { activeDeload, deloadWeight, inDeload } from "@/lib/deload";
import { deloadsStore } from "@/lib/stores";
import { timedSeconds, formatSeconds } from "@/lib/timedSet";
import { HoldTimer } from "@/components/HoldTimer";
import { kilos } from "@/lib/format";
import {
  describePerformance,
  lastPerformance,
  recentPerformances,
  repRange,
  suggestNext,
} from "@/lib/overload";
import { useHistory } from "@/lib/useHistory";
import { keepScreenAwake, releaseWakeLock } from "@/lib/wakeLock";
import { LOAD_LABELS, loadLevel } from "@/lib/loadLevel";
import { RestTimer } from "@/components/RestTimer";
import { formatDuration, sessionProgress } from "@/lib/session";
import type { Day, SessionLog, SetLog } from "@/lib/types";

type RestState = { key: string; label: string; duration: number };

type FlatStep = {
  exerciseId: string;
  exerciseName: string;
  exerciseSub?: string;
  exerciseTip?: string;
  exerciseDemo?: string;
  exerciseImages?: string[];
  sectionTitle: string;
  setIndex: number;
  series: number;
  reps: string;
  restLabel: string;
  restSeconds: number;
};

type FocusPointer = { exerciseId: string; setIndex: number };

type Props = {
  day: Day;
  session: SessionLog;
  elapsedSeconds: number;
  onUpdateSet: (exerciseId: string, setIndex: number, patch: Partial<SetLog>) => void;
  onFinish: () => void;
  onAbandon: () => void;
};

function buildFlatSteps(day: Day): FlatStep[] {
  return day.sections.flatMap((section) =>
    section.exercises.flatMap((ex) =>
      Array.from({ length: ex.series }, (_, i) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        exerciseSub: ex.sub,
        exerciseTip: ex.tip,
        exerciseDemo: ex.demo,
        exerciseImages: ex.images,
        sectionTitle: section.title,
        setIndex: i,
        series: ex.series,
        reps: ex.reps,
        restLabel: ex.restLabel,
        restSeconds: ex.restSeconds,
      }))
    )
  );
}

function getSet(session: SessionLog, exerciseId: string, setIndex: number): SetLog | undefined {
  return session.exercises.find((e) => e.exerciseId === exerciseId)?.sets.find((s) => s.setIndex === setIndex);
}

function firstIncompletePointer(session: SessionLog, steps: FlatStep[]): FocusPointer | null {
  for (const step of steps) {
    const set = getSet(session, step.exerciseId, step.setIndex);
    if (set && !set.completed) return { exerciseId: step.exerciseId, setIndex: step.setIndex };
  }
  return null;
}

export function SessionRunner({ day, session, elapsedSeconds, onUpdateSet, onFinish, onAbandon }: Props) {
  const flatSteps = useMemo(() => buildFlatSteps(day), [day]);
  const [focus, setFocus] = useState<FocusPointer | null>(() => firstIncompletePointer(session, flatSteps));
  const [started, setStarted] = useState(false);
  const [rest, setRest] = useState<RestState | null>(null);

  const progress = sessionProgress(session);
  const focusPos = focus ? flatSteps.findIndex((s) => s.exerciseId === focus.exerciseId && s.setIndex === focus.setIndex) : -1;
  const currentStep = focusPos >= 0 ? flatSteps[focusPos] : null;
  const currentSet = currentStep ? getSet(session, currentStep.exerciseId, currentStep.setIndex) : undefined;
  const currentLoad = currentStep ? loadLevel(currentStep.reps) : null;

  /*
   * Surcharge progressive. La séance en cours est exclue de la recherche :
   * sinon, dès la première série validée, elle deviendrait sa propre référence
   * et la suggestion tournerait en rond.
   */
  const { history } = useHistory();
  const previous = currentStep
    ? lastPerformance(history, currentStep.exerciseName, session.id)
    : null;
  const suggestion = currentStep ? suggestNext(previous, currentStep.reps) : null;
  const deloads = deloadsStore.useValue();
  const allegement = currentStep ? activeDeload(deloads, currentStep.exerciseName) : null;
  // Pendant la semaine allégée, le plateau se tait : c'est la réponse qu'on
  // lui apporte, et les séances allégées ne comptent pas comme un non-progrès.
  const plateau =
    currentStep && !allegement
      ? detectPlateau(history, currentStep.exerciseName, 4, (iso) =>
          inDeload(deloads, currentStep.exerciseName, iso)
        )
      : null;
  const enTemps = currentStep ? timedSeconds(currentStep.reps) : null;

  // La charge suggérée : celle de la dernière fois réduite pendant l'allègement,
  // quoi qu'en dise la surcharge progressive ; sinon la suggestion.
  const suggestedWeight = allegement
    ? previous?.topWeight != null
      ? deloadWeight(previous.topWeight, allegement.factor)
      : null
    : suggestion && (suggestion.kind === "increase" || suggestion.kind === "hold")
      ? suggestion.weight
      : null;

  /*
   * Le champ de poids part sur la charge proposée plutôt que vide. Écrire dans
   * une série non validée n'enregistre rien : `completed` reste faux, et les
   * courbes ne comptent que les séries validées. C'est une proposition posée
   * d'avance, corrigeable d'un chiffre.
   */
  const prefilled = useRef<string | null>(null);
  useEffect(() => {
    if (!currentStep || !currentSet || suggestedWeight === null) return;
    const cle = `${currentStep.exerciseId}-${currentStep.setIndex}`;
    // Une seule fois par série, et non « dès que le champ est vide » : sinon
    // effacer pour saisir une autre valeur le remplirait aussitôt, et le champ
    // deviendrait impossible à vider.
    if (prefilled.current === cle) return;
    prefilled.current = cle;
    if (currentSet.weight !== null) return;
    onUpdateSet(currentStep.exerciseId, currentStep.setIndex, { weight: suggestedWeight });
  }, [currentStep, currentSet, suggestedWeight, onUpdateSet]);

  /*
   * Écran maintenu allumé pendant la séance : c'est ce qui rend l'alarme de
   * repos fiable, un écran éteint faisant brider les minuteurs. Relâché en
   * quittant la page, pour ne pas vider la batterie une fois la séance finie.
   */
  useEffect(() => {
    keepScreenAwake();
    return releaseWakeLock;
  }, []);
  // Les deux fois d'avant, sous la dernière : une tendance, pas un jour.
  const avant = currentStep ? recentPerformances(history, currentStep.exerciseName, session.id, 3).slice(1) : [];
  /*
   * Échauffement : sur la toute première série de la séance seulement, quand
   * une charge de travail est connue. Coché ici et oublié — ce n'est pas une
   * performance, ça ne va pas dans l'historique.
   */
  const [echauffes, setEchauffes] = useState<number[]>([]);
  const chargeTravail = suggestedWeight ?? currentSet?.weight ?? previous?.topWeight ?? null;
  const montee = focusPos === 0 && !started && currentSet && !currentSet.completed ? warmupRamp(chargeTravail) : [];
  const isFirstStepOfSession = focusPos === 0;

  function handleFinish() {
    if (progress.done < progress.total) {
      const confirmed = window.confirm(
        `${progress.done}/${progress.total} séries terminées. Terminer la séance quand même ?`
      );
      if (!confirmed) return;
    }
    onFinish();
  }

  function handleAbandon() {
    const confirmed = window.confirm("Abandonner la séance ? Rien ne sera enregistré dans l'historique.");
    if (confirmed) onAbandon();
  }

  function handleCompleteSet() {
    if (!currentStep) return;
    onUpdateSet(currentStep.exerciseId, currentStep.setIndex, { completed: true });

    const nextStep = focusPos >= 0 ? flatSteps[focusPos + 1] : undefined;
    if (nextStep) {
      setFocus({ exerciseId: nextStep.exerciseId, setIndex: nextStep.setIndex });
    } else {
      setFocus(null);
    }
    setStarted(false);

    if (nextStep && currentStep.restSeconds > 0) {
      setRest({
        key: `${currentStep.exerciseId}-${currentStep.setIndex}`,
        label: frenchName(currentStep.exerciseName),
        duration: currentStep.restSeconds,
      });
    }
  }

  function handleRestDone() {
    setRest(null);
    setStarted(true);
  }

  return (
    <div className="animate-fade">
      {rest && (
        <RestTimer
          key={rest.key}
          totalSeconds={rest.duration}
          label={rest.label}
          onFinish={handleRestDone}
          onSkip={handleRestDone}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
        <div>
          <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">
            {day.code} · {day.title}
          </div>
          <div className="font-display text-3xl leading-none text-text">
            {formatDuration(elapsedSeconds)}
          </div>
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="mb-1 flex justify-between text-[0.7rem] text-muted">
            <span>Progression</span>
            <span>
              {progress.done}/{progress.total} séries
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAbandon}
            className="rounded-md border border-border px-3 py-2 text-xs text-muted transition hover:border-accent2 hover:text-accent2"
          >
            Abandonner
          </button>
          <button
            onClick={handleFinish}
            className="rounded-md bg-accent px-4 py-2 text-xs font-bold text-bg transition hover:opacity-90"
          >
            Terminer la séance
          </button>
        </div>
      </div>

      {currentStep && currentSet ? (
        <div className="rounded-xl border border-accent/50 bg-surface p-5">
          <div className="mb-1 text-[0.7rem] tracking-[0.1em] text-accent2 uppercase">{currentStep.sectionTitle}</div>
          {plateau && (
            <p className="mb-2 rounded-lg border border-warn/40 bg-surface2 px-3 py-2 text-[0.75rem] text-muted">
              <span className="text-warn">Plateau</span> — pas de progrès depuis {plateau.sessions} séances
              ({plateau.since}). {plateau.hint}
            </p>
          )}
          {allegement && (
            <p className="mb-2 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-[0.75rem] text-muted">
              <span className="text-accent">Semaine allégée</span> jusqu&apos;au{" "}
              {new Date(allegement.until).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })} :
              charge à {Math.round(allegement.factor * 100)} % de la dernière fois
              {suggestedWeight !== null ? `, soit ${kilos(suggestedWeight)}` : ""}. Récupère, la
              progression reprend ensuite.
            </p>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display flex items-center gap-2 text-2xl">
              {frenchName(currentStep.exerciseName)}
              <ExerciseDemo
                name={frenchName(currentStep.exerciseName)}
                images={currentStep.exerciseImages}
                demo={currentStep.exerciseDemo}
              />
            </h3>
            <div className="font-display text-lg text-accent">
              Série {currentStep.setIndex + 1}/{currentStep.series}
            </div>
          </div>
          {currentStep.exerciseSub && <p className="mt-0.5 text-[0.8rem] text-muted">{currentStep.exerciseSub}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.78rem] text-muted">
            {currentLoad && <LoadGauge level={currentLoad} />}
            <span>
              Cible : {currentStep.reps} · {currentStep.restLabel}
              {currentLoad ? ` · ${LOAD_LABELS[currentLoad]}` : ""}
              {currentStep.exerciseTip ? ` · ${currentStep.exerciseTip}` : ""}
            </span>
          </div>

          {previous && (
            <div className="mt-2 rounded-lg border border-border bg-surface2 px-3 py-2 text-[0.78rem]">
              <span className="text-muted">
                La dernière fois,{" "}
                {new Date(previous.date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                })}{" "}
                :{" "}
              </span>
              <span className="text-text">{describePerformance(previous)}</span>
              {suggestion?.kind === "increase" && (
                <div className="mt-1 text-accent">
                  Tu as tenu le haut de la fourchette partout : passe à{" "}
                  <span className="font-medium">{kilos(suggestion.weight)}</span>.
                </div>
              )}
              {suggestion?.kind === "hold" && (
                <div className="mt-1 text-muted">
                  Reste à {kilos(suggestion.weight)} jusqu&apos;à tenir{" "}
                  {repRange(currentStep.reps)?.high} répétitions sur toutes les séries.
                </div>
              )}
              {suggestion?.kind === "reps" && (
                <div className="mt-1 text-accent">
                  Haut de la fourchette tenu partout : ajoute une ou deux
                  répétitions, ou ralentis la descente.
                </div>
              )}
              {avant.length > 0 && (
                <div className="mt-1.5 border-t border-border pt-1.5 text-[0.72rem] text-muted">
                  Avant :{" "}
                  {avant
                    .map(
                      (p) =>
                        `${new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · ${describePerformance(p)}`
                    )
                    .join(" — ")}
                </div>
              )}
            </div>
          )}

          {montee.length > 0 && (
            <div className="mt-2 rounded-lg border border-accent/30 bg-surface2 px-3 py-2 text-[0.78rem]">
              <div className="text-[0.65rem] tracking-[0.1em] text-accent uppercase">
                Échauffement — montée vers {kilos(chargeTravail as number)}
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {montee.map((m, i) => {
                  const fait = echauffes.includes(i);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() =>
                          setEchauffes((l) => (fait ? l.filter((x) => x !== i) : [...l, i]))
                        }
                        aria-pressed={fait}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          fait
                            ? "border-pos/60 bg-pos-soft text-pos line-through"
                            : "border-border text-text hover:border-accent"
                        }`}
                      >
                        {kilos(m.kg)} × {m.reps}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1.5 text-[0.68rem] text-muted">
                Trois minutes qui préparent le geste et les articulations. Repos court entre les paliers.
              </p>
            </div>
          )}

          {!started ? (
            <div className="mt-5">
              <button
                onClick={() => {
                  // Sur le geste, jamais au chargement : une demande surgie
                  // sans raison se fait refuser, et un refus est définitif.
                  void askNotifications();
                  setStarted(true);
                }}
                disabled={Boolean(rest)}
                className="w-full rounded-md bg-accent px-4 py-4 text-base font-bold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted"
              >
                {isFirstStepOfSession ? "Lancer la série ▸" : "Lancer la série suivante ▸"}
              </button>
              {rest && (
                <p className="mt-2 text-center text-[0.75rem] text-muted">
                  Disponible à la fin du repos, ou clique sur « Passer » pour lancer maintenant.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[0.65rem] tracking-[0.1em] text-muted uppercase">Poids (kg)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.5}
                    min={0}
                    placeholder="kg"
                    autoFocus
                    value={currentSet.weight ?? ""}
                    onChange={(e) =>
                      onUpdateSet(currentStep.exerciseId, currentStep.setIndex, {
                        weight: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md border border-border bg-surface2 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] tracking-[0.1em] text-muted uppercase">
                    {enTemps !== null ? "Temps tenu" : "Répétitions"}
                  </label>
                  {enTemps !== null ? (
                    currentSet.reps ? (
                      <div className="flex items-center justify-between gap-2 rounded-md border border-pos/50 bg-pos-soft px-3 py-2.5 text-sm">
                        <span className="text-pos">{currentSet.reps}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSet(currentStep.exerciseId, currentStep.setIndex, { reps: "" })
                          }
                          className="text-xs text-muted underline"
                        >
                          refaire
                        </button>
                      </div>
                    ) : (
                      <HoldTimer
                        key={`${currentStep.exerciseId}-${currentStep.setIndex}`}
                        seconds={enTemps}
                        onDone={(tenu) =>
                          onUpdateSet(currentStep.exerciseId, currentStep.setIndex, {
                            reps: formatSeconds(tenu),
                          })
                        }
                      />
                    )
                  ) : (
                    <input
                      type="text"
                      placeholder={currentStep.reps}
                      value={currentSet.reps}
                      onChange={(e) =>
                        onUpdateSet(currentStep.exerciseId, currentStep.setIndex, { reps: e.target.value })
                      }
                      className="w-full rounded-md border border-border bg-surface2 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
                    />
                  )}
                </div>
              </div>
              <button
                onClick={handleCompleteSet}
                className="w-full rounded-md bg-accent px-4 py-4 text-base font-bold text-bg transition hover:opacity-90"
              >
                Terminer la série ✓
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-accent/50 bg-accent/5 p-6 text-center">
          <h3 className="font-display text-2xl text-accent">Séance terminée !</h3>
          <p className="mt-1 text-sm text-muted">Toutes les séries sont faites — valide la séance en haut.</p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {day.sections.map((section) => (
          <div key={section.title}>
            <div className="font-display mb-2 text-lg tracking-[0.03em] text-accent2">{section.title}</div>
            <div className="flex flex-col gap-2">
              {section.exercises.map((exerciseDef) => {
                const log = session.exercises.find((e) => e.exerciseId === exerciseDef.id);
                if (!log) return null;
                const isCurrentExercise = currentStep?.exerciseId === exerciseDef.id;
                return (
                  <div
                    key={exerciseDef.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 ${
                      isCurrentExercise ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[0.82rem] text-text">
                      {frenchName(exerciseDef.name)}
                      <ExerciseDemo
                        name={frenchName(exerciseDef.name)}
                        images={exerciseDef.images}
                        demo={exerciseDef.demo}
                      />
                    </span>
                    <div className="flex gap-1.5">
                      {log.sets.map((set) => {
                        const isCurrentSet = isCurrentExercise && currentStep?.setIndex === set.setIndex;
                        return (
                          <span
                            key={set.setIndex}
                            title={set.completed && set.weight ? `${set.weight} kg` : undefined}
                            className={`h-2.5 w-2.5 rounded-full ${
                              set.completed
                                ? "bg-accent"
                                : isCurrentSet
                                  ? "border-2 border-accent"
                                  : "border border-border bg-surface2"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
