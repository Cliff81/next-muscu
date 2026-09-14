"use client";

import Link from "next/link";
import { useMemo } from "react";
import { leJour } from "@/components/Achievements";
import {
  addSession,
  emptyTally,
  evaluateLadders,
  nextGoals,
  quantity,
  tierLabel,
  tiersUnlockedBy,
} from "@/lib/achievements";
import { decimal } from "@/lib/format";
import { profileStore } from "@/lib/profile";
import { formatDuration, sessionProgress } from "@/lib/session";
import { useHistory } from "@/lib/useHistory";
import type { SessionLog } from "@/lib/types";

/**
 * Écran de fin de séance.
 *
 * Il dit trois choses, dans cet ordre : ce que la séance a coûté, ce qu'elle a
 * ouvert, et ce qui vient après. Le dernier point est celui qui ramène — un
 * palier à sept kilos de là se vise mieux qu'un compteur abstrait.
 */
export function SessionRecap({ log }: { log: SessionLog }) {
  const { history } = useHistory();
  const profile = profileStore.useValue();
  const poids = profile?.weightKg ?? null;

  // Le décompte d'une seule séance : le même calcul que pour l'historique,
  // appliqué à un unique journal.
  const seance = useMemo(() => {
    const tally = emptyTally(poids);
    addSession(tally, log);
    return tally;
  }, [log, poids]);

  const etats = useMemo(() => evaluateLadders(history, poids), [history, poids]);
  const nouveaux = useMemo(
    () => (log.finishedAt ? tiersUnlockedBy(etats, log.finishedAt) : []),
    [etats, log.finishedAt]
  );
  const suivants = useMemo(() => nextGoals(etats, 3), [etats]);
  const avancement = sessionProgress(log);

  return (
    <div className="animate-fade mt-6">
      <div className="text-[0.7rem] tracking-[0.25em] text-accent uppercase">
        {log.dayCode} · {log.finishedAt ? leJour(log.finishedAt) : ""}
      </div>
      <h1 className="font-display mt-2 text-5xl">
        Séance <span className="text-accent">terminée</span>
      </h1>
      <p className="mt-1 text-[0.85rem] text-muted">{log.dayTitle}</p>

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3">
        <Chiffre
          valeur={log.durationSeconds !== null ? formatDuration(log.durationSeconds) : "—"}
          label="Durée"
        />
        <Chiffre valeur={`${avancement.done}/${avancement.total}`} label="Séries" />
        <Chiffre valeur={String(seance.repetitions)} label="Répétitions" />
        <Chiffre valeur={`${decimal(seance.tonnage)} kg`} label="Kilos déplacés" />
      </div>

      {nouveaux.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-2xl text-accent2">
            {nouveaux.length > 1 ? "Nouveaux hauts faits" : "Nouveau haut fait"}
          </h2>
          <div className="flex flex-col gap-2">
            {nouveaux.map(({ ladder, tier, index }) => (
              <div
                key={`${ladder.id}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-accent/50 bg-accent-soft px-4 py-3"
              >
                <span className="text-3xl leading-none" aria-hidden>
                  {ladder.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[0.9rem] font-medium">
                    {ladder.name}
                    {ladder.unit && ladder.tiers.length > 1 && (
                      <span className="text-accent"> · {tierLabel(ladder, tier)}</span>
                    )}
                  </div>
                  <div className="text-[0.72rem] text-muted">{ladder.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {suivants.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-2xl text-accent2">
            {nouveaux.length > 0 ? "Et après" : "Prochains objectifs"}
          </h2>
          <div className="flex flex-col gap-2">
            {suivants.map(({ ladder, tier, value, part }) => {
              const reste = tier - value;
              return (
                <div
                  key={ladder.id}
                  className="rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[0.9rem]">
                      <span aria-hidden>{ladder.icon}</span> {ladder.name}
                      <span className="text-accent"> · {tierLabel(ladder, tier)}</span>
                    </span>
                    {ladder.unit && (
                      <span className="text-[0.72rem] text-muted">
                        il te manque {quantity(reste, ladder.unit)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-accent2/70"
                      style={{ width: `${Math.round(part * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/progress"
          className="rounded-md bg-accent px-5 py-3 text-sm font-bold text-bg transition hover:opacity-90"
        >
          Voir ma progression ▸
        </Link>
        <Link
          href="/"
          className="rounded-md border border-border px-5 py-3 text-sm text-muted transition hover:text-text"
        >
          Retour au programme
        </Link>
      </div>
    </div>
  );
}

function Chiffre({ valeur, label }: { valeur: string; label: string }) {
  return (
    <div className="rounded-2xl bg-calm-soft px-4 py-3">
      <div className="font-display text-2xl leading-none text-accent">{valeur}</div>
      <div className="mt-1 text-[0.7rem] tracking-[0.15em] text-muted uppercase">{label}</div>
    </div>
  );
}
