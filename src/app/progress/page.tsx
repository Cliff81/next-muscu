"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Achievements } from "@/components/Achievements";
import { BodyWeightSection } from "@/components/BodyWeightSection";
import { WeightChart } from "@/components/WeightChart";
import { bestOneRepMax, distinctExerciseNames, weightProgressionFor } from "@/lib/progressData";
import { kilos } from "@/lib/format";
import { formatDuration, sessionProgress } from "@/lib/session";
import { useHistory } from "@/lib/useHistory";

const dateLongue: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
};

export default function ProgressPage() {
  const { history, removeSession } = useHistory();
  const exerciseNames = useMemo(() => distinctExerciseNames(history), [history]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Supprimer une séance peut faire disparaître le dernier exercice choisi :
  // sans ce repli, le graphique resterait vide sur un nom qui n'existe plus.
  const activeExercise =
    selectedExercise && exerciseNames.includes(selectedExercise)
      ? selectedExercise
      : (exerciseNames[0] ?? null);
  const points = useMemo(
    () => (activeExercise ? weightProgressionFor(history, activeExercise) : []),
    [history, activeExercise]
  );
  const record = useMemo(
    () => (activeExercise ? bestOneRepMax(history, activeExercise) : null),
    [history, activeExercise]
  );

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <div className="mx-auto w-full max-w-[900px] px-8 pt-10 pb-16">
      <Link href="/" className="text-[0.8rem] text-muted transition hover:text-accent">
        ← Retour au programme
      </Link>
      <h1 className="font-display mt-4 text-5xl">
        Historique &amp; <span className="text-accent">progression</span>
      </h1>

      {history.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Aucune séance enregistrée pour l&apos;instant. Termine une séance pour voir apparaître ta progression ici.
        </p>
      ) : null}

      {history.length > 0 && (
        <>
          <section className="mt-8">
            <h2 className="font-display mb-3 text-2xl text-accent2">Progression des charges</h2>
            {exerciseNames.length > 0 && (
              <select
                value={activeExercise ?? ""}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="mb-4 w-full max-w-sm rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
              >
                {exerciseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <WeightChart points={points} />
            {record && (
              <p className="mt-3 text-[0.8rem] text-muted">
                <span className="font-display text-lg text-accent">1RM estimé {kilos(record.value)}</span>
                {" "}— d&apos;après {record.reps} × {kilos(record.weight)} le{" "}
                {new Date(record.date).toLocaleDateString("fr-FR", dateLongue)}. Formule
                d&apos;Epley : une estimation, pas une charge à tenter à froid.
              </p>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-display mb-3 text-2xl text-accent2">Séances passées</h2>
            <div className="flex flex-col gap-2">
              {sortedHistory.map((session) => {
                const progress = sessionProgress(session);
                return (
                  <div
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {session.dayCode} · {session.dayTitle}
                      </div>
                      <div className="text-[0.75rem] text-muted">
                        {new Date(session.startedAt).toLocaleDateString("fr-FR", dateLongue)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[0.8rem] text-muted">
                      <span>{progress.done}/{progress.total} séries</span>
                      {session.durationSeconds != null && (
                        <span className="font-display text-lg text-accent">
                          {formatDuration(session.durationSeconds)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const jour = new Date(session.startedAt).toLocaleDateString(
                            "fr-FR",
                            dateLongue
                          );
                          const sur = window.confirm(
                            `Supprimer la séance ${session.dayCode} du ${jour} ?\n\n` +
                              "Elle disparaîtra de l'historique et de la progression, " +
                              "sur tous tes appareils. C'est définitif."
                          );
                          if (sur) removeSession(session.id);
                        }}
                        aria-label={`Supprimer la séance ${session.dayCode} du ${new Date(
                          session.startedAt
                        ).toLocaleDateString("fr-FR", dateLongue)}`}
                        className="rounded-md border border-border px-2 py-1 text-[0.75rem] text-muted transition hover:border-neg hover:text-neg"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <BodyWeightSection />

      <Achievements history={history} />
    </div>
  );
}
