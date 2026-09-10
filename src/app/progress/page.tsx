"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WeightChart } from "@/components/WeightChart";
import { distinctExerciseNames, weightProgressionFor } from "@/lib/progressData";
import { formatDuration, sessionProgress } from "@/lib/session";
import { useHistory } from "@/lib/useHistory";

export default function ProgressPage() {
  const { history } = useHistory();
  const exerciseNames = useMemo(() => distinctExerciseNames(history), [history]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const activeExercise = selectedExercise ?? exerciseNames[0] ?? null;
  const points = useMemo(
    () => (activeExercise ? weightProgressionFor(history, activeExercise) : []),
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
      ) : (
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
                        {new Date(session.startedAt).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[0.8rem] text-muted">
                      <span>{progress.done}/{progress.total} séries</span>
                      {session.durationSeconds != null && (
                        <span className="font-display text-lg text-accent">
                          {formatDuration(session.durationSeconds)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
