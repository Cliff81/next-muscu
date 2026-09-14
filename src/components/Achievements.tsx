"use client";

import { useMemo } from "react";
import {
  FAMILY_LABELS,
  LADDERS,
  TIER_COUNT,
  equivalent,
  evaluateLadders,
  quantity,
  tierLabel,
  type Family,
  type LadderProgress,
} from "@/lib/achievements";
import { profileStore } from "@/lib/profile";
import { outingsStore, trophyStore } from "@/lib/stores";
import type { SessionLog } from "@/lib/types";

const FAMILIES: Family[] = ["assiduite", "volume", "force", "endurance", "rigueur"];

export const leJour = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Hauts faits.
 *
 * Déduits de l'historique à chaque affichage — voir `achievements.ts`. Les
 * paliers ouverts par la dernière séance portent une pastille : c'est possible
 * sans rien avoir stocké, la date d'un palier étant celle d'une séance connue.
 */
export function Achievements({ history }: { history: SessionLog[] }) {
  const profile = profileStore.useValue();
  const poids = profile?.weightKg ?? null;
  const graves = trophyStore.useValue();
  const sorties = outingsStore.useValue();

  const etats = useMemo(
    () => evaluateLadders(history, poids, graves, sorties),
    [history, poids, graves, sorties]
  );
  const derniere = useMemo(() => {
    const finies = history.filter((s) => s.finishedAt !== null).map((s) => s.finishedAt as string);
    return finies.length ? finies.reduce((a, b) => (a > b ? a : b)) : null;
  }, [history]);

  const franchis = etats.reduce((n, e) => n + e.level, 0);
  const part = Math.round((franchis / TIER_COUNT) * 100);

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-accent2">Hauts faits</h2>
        <span className="text-[0.8rem] text-muted">
          <span className="font-display text-lg text-accent">{franchis}</span> / {TIER_COUNT} paliers
          {" · "}
          {LADDERS.length} hauts faits
        </span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${part}%` }} />
      </div>

      {FAMILIES.map((famille) => (
        <div key={famille} className="mb-6">
          <h3 className="mb-2 text-[0.7rem] tracking-[0.15em] text-muted uppercase">
            {FAMILY_LABELS[famille]}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-2">
            {etats
              .filter((e) => e.ladder.family === famille)
              .map((etat) => (
                <Carte
                  key={etat.ladder.id}
                  etat={etat}
                  nouveau={derniere !== null && etat.unlockedAt.includes(derniere)}
                />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Carte({ etat, nouveau }: { etat: LadderProgress; nouveau: boolean }) {
  const { ladder, value, level, unlockedAt, next } = etat;
  const comme = equivalent(ladder.id, value);
  const commence = level > 0;
  const avancement = next === null ? 100 : Math.min(100, Math.round((value / next) * 100));
  const dernier = commence ? unlockedAt[level - 1] : null;
  const echelons = ladder.tiers.length;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition ${
        commence ? "border-accent/40 bg-surface" : "border-border bg-surface/60"
      }`}
    >
      <span className={`text-2xl leading-none ${commence ? "" : "opacity-40 grayscale"}`} aria-hidden>
        {ladder.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[0.9rem] font-medium ${commence ? "" : "text-muted"}`}>
            {ladder.name}
          </span>
          {echelons > 1 && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[0.6rem] text-muted">
              {level} / {echelons}
            </span>
          )}
          {nouveau && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.08em] text-bg uppercase">
              Nouveau
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[0.72rem] text-muted">{ladder.description}</div>

        {next !== null ? (
          <>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-accent2/70" style={{ width: `${avancement}%` }} />
            </div>
            <div className="mt-1 text-[0.68rem] text-muted">
              {ladder.unit ? `${quantity(value)} / ${tierLabel(ladder, next)}` : "Pas encore fait"}
            </div>
          </>
        ) : (
          <div className="mt-1 text-[0.7rem] text-accent">Échelle terminée 🏆</div>
        )}
        {comme && <div className="mt-1 text-[0.66rem] text-muted italic">soit à peu près {comme}</div>}

        {dernier && (
          <div className="mt-1 text-[0.68rem] text-accent/80">
            {tierLabel(ladder, ladder.tiers[level - 1])} · le {leJour(dernier)}
          </div>
        )}
      </div>
    </div>
  );
}
