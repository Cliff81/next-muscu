"use client";

import { useMemo } from "react";
import {
  FAMILY_LABELS,
  evaluateAchievements,
  type Family,
  type Progress,
} from "@/lib/achievements";
import { profileStore } from "@/lib/profile";
import type { SessionLog } from "@/lib/types";

const FAMILIES: Family[] = ["assiduite", "volume", "force", "rigueur"];

const compte = (valeur: number) => Math.round(valeur).toLocaleString("fr-FR");

const leJour = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Hauts faits.
 *
 * Déduits de l'historique à chaque affichage — voir `achievements.ts`. Ceux que
 * la dernière séance vient de débloquer portent une pastille : c'est le seul
 * moment où l'on peut le dire sans rien avoir stocké, puisque la date de
 * déblocage est celle d'une séance connue.
 */
export function Achievements({ history }: { history: SessionLog[] }) {
  const profile = profileStore.useValue();
  const poids = profile?.weightKg ?? null;

  const etats = useMemo(() => evaluateAchievements(history, poids), [history, poids]);
  const derniere = useMemo(() => {
    const finies = history.filter((s) => s.finishedAt !== null).map((s) => s.finishedAt as string);
    return finies.length ? finies.reduce((a, b) => (a > b ? a : b)) : null;
  }, [history]);

  const debloques = etats.filter((e) => e.unlockedAt !== null).length;
  const part = Math.round((debloques / etats.length) * 100);

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-accent2">Hauts faits</h2>
        <span className="text-[0.8rem] text-muted">
          <span className="font-display text-lg text-accent">{debloques}</span> / {etats.length}
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
            {etats
              .filter((e) => e.achievement.family === famille)
              .map((etat) => (
                <Carte
                  key={etat.achievement.id}
                  etat={etat}
                  nouveau={etat.unlockedAt !== null && etat.unlockedAt === derniere}
                  jour={leJour}
                />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Carte({
  etat,
  nouveau,
  jour,
}: {
  etat: Progress;
  nouveau: boolean;
  jour: (iso: string) => string;
}) {
  const { achievement, value, unlockedAt } = etat;
  const debloque = unlockedAt !== null;
  const avancement = Math.min(100, Math.round((value / achievement.target) * 100));
  // Un haut fait sans unité se tient ou ne se tient pas : afficher « 0 / 1 »
  // n'apprendrait rien.
  const chiffre = achievement.unit
    ? `${compte(Math.min(value, achievement.target))} / ${compte(achievement.target)} ${achievement.unit}`
    : null;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition ${
        debloque ? "border-accent/40 bg-surface" : "border-border bg-surface/60"
      }`}
    >
      <span className={`text-2xl leading-none ${debloque ? "" : "opacity-40 grayscale"}`} aria-hidden>
        {achievement.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[0.9rem] font-medium ${debloque ? "" : "text-muted"}`}>
            {achievement.name}
          </span>
          {nouveau && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.08em] text-bg uppercase">
              Nouveau
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[0.72rem] text-muted">{achievement.description}</div>
        {debloque ? (
          <div className="mt-1 text-[0.7rem] text-accent">Débloqué le {jour(unlockedAt)}</div>
        ) : (
          <>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-accent2/70" style={{ width: `${avancement}%` }} />
            </div>
            {chiffre && <div className="mt-1 text-[0.68rem] text-muted">{chiffre}</div>}
          </>
        )}
      </div>
    </div>
  );
}
