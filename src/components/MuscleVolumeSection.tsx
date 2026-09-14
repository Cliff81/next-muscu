"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCatalog, type CatalogExercise, type Muscle } from "@/lib/catalog";
import { MUSCLE_GROUPS } from "@/lib/generateProgram";
import { weeklySetsByGroup, type MuscleResolver } from "@/lib/muscleVolume";
import { programStore } from "@/lib/stores";
import type { SessionLog } from "@/lib/types";
import { startOfWeek } from "@/lib/week";

/**
 * Séries par groupe musculaire, cette semaine et la précédente.
 *
 * La relecture de l'assistant montre la répartition *prévue* ; ici c'est la
 * répartition *faite*, d'après les séries cochées. Le muscle oublié se voit
 * d'un coup — c'est tout l'objet.
 *
 * Le rattachement exercice → muscles vient du catalogue par le nom, et à
 * défaut du programme en cours par l'identifiant : les exercices écrits à la
 * main ne sont pas dans le catalogue, mais ils sont dans une catégorie.
 */
export function MuscleVolumeSection({ history }: { history: SessionLog[] }) {
  const [catalog, setCatalog] = useState<CatalogExercise[] | null>(null);
  const program = programStore.useValue();

  useEffect(() => {
    let vivant = true;
    void loadCatalog()
      .then((c) => {
        if (vivant) setCatalog(c);
      })
      .catch(() => {
        // Hors ligne : le programme seul servira de rattachement.
        if (vivant) setCatalog([]);
      });
    return () => {
      vivant = false;
    };
  }, []);

  const resolve = useMemo<MuscleResolver>(() => {
    const parNom = new Map((catalog ?? []).map((e) => [e.name, e.muscles]));
    const parId = new Map<string, Muscle[]>();
    for (const day of program.days) {
      for (const section of day.sections) {
        for (const ex of section.exercises) {
          if (section.muscles?.length) parId.set(ex.id, section.muscles as Muscle[]);
        }
      }
    }
    return (name, id) => parNom.get(name) ?? parId.get(id) ?? null;
  }, [catalog, program]);

  const { semaine, precedente } = useMemo(() => {
    const lundi = startOfWeek(new Date());
    const avant = new Date(lundi);
    avant.setDate(avant.getDate() - 7);
    return {
      semaine: weeklySetsByGroup(history, resolve, lundi),
      precedente: weeklySetsByGroup(history, resolve, avant),
    };
  }, [history, resolve]);

  const total = semaine.reduce((n, g) => n + g.sets, 0);
  const max = Math.max(1, ...semaine.map((g) => g.sets));
  const derniers = new Map(precedente.map((g) => [g.id, g.sets]));
  // Les groupes que le programme vise : ce sont eux qu'on attend cette semaine.
  const vises = new Set(
    program.days.flatMap((d) =>
      d.sections.flatMap((s) => (s.muscles ?? []).map((m) => m))
    )
  );
  const oublies = semaine.filter((g) => g.sets === 0 && [...vises].some((m) => resolveGroupe(g.id, m as Muscle)));

  if (catalog === null) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-accent2">Cette semaine, par muscle</h2>
        <span className="text-[0.8rem] text-muted">
          <span className="font-display text-lg text-accent">{total}</span> séries validées
        </span>
      </div>

      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted">
          Aucune série validée depuis lundi. La répartition apparaît avec la première séance de la semaine.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {[...semaine]
            .filter((g) => g.sets > 0)
            .sort((a, b) => b.sets - a.sets)
            .map((g) => {
              const avant = derniers.get(g.id) ?? 0;
              const ecart = g.sets - avant;
              return (
                <li key={g.id} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-[0.8rem]">
                  <span className="truncate">{g.name}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(g.sets / max) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-muted">
                    <span className="text-text">{g.sets}</span>
                    {avant > 0 || ecart !== 0 ? (
                      <span className={`ml-1 text-[0.7rem] ${ecart > 0 ? "text-pos" : ecart < 0 ? "text-accent2" : "text-muted"}`}>
                        {ecart > 0 ? `+${ecart}` : ecart}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
        </ul>
      )}

      {oublies.length > 0 && total > 0 && (
        <p className="mt-3 text-[0.78rem] text-muted">
          Pas encore travaillé cette semaine, alors que ton programme le prévoit :{" "}
          <span className="text-text">{oublies.map((g) => g.name).join(", ")}</span>.
        </p>
      )}
      <p className="mt-2 text-[0.7rem] text-muted">
        Séries cochées, muscles principaux seulement. L&apos;écart est par rapport à la semaine dernière.
      </p>
    </section>
  );
}

function resolveGroupe(groupId: string, muscle: Muscle): boolean {
  return MUSCLE_GROUPS.find((g) => g.id === groupId)?.muscles.includes(muscle) ?? false;
}
