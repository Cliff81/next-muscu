"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import {
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  MUSCLE_LABELS,
  loadCatalog,
  type CatalogExercise,
  type Muscle,
} from "@/lib/catalog";
import { exerciseImageUrl } from "@/lib/exerciseImages";
import { usableExercises } from "@/lib/generateProgram";
import type { Exercise } from "@/lib/types";

const label = <T extends string>(dict: Record<T, string>, key: T | null): string =>
  key ? (dict[key] ?? key) : "";

/** Texte sur lequel porte la recherche : le nom est en anglais, le reste en français. */
function searchableText(e: CatalogExercise): string {
  return [
    e.name,
    label(EQUIPMENT_LABELS, e.equipment),
    ...e.muscles.map((m) => MUSCLE_LABELS[m] ?? m),
    ...e.secondary.map((m) => MUSCLE_LABELS[m] ?? m),
    e.mechanic === "compound" ? "polyarticulaire" : "isolation",
  ]
    .join(" ")
    .toLowerCase();
}

type Props = {
  /** L'exercice occupant le créneau aujourd'hui. */
  current: Exercise;
  /** Muscles visés par la section, quand le programme les connaît. */
  muscles?: string[];
  onChoose: (replacement: CatalogExercise) => void;
};

function Candidates({
  catalog,
  current,
  muscles,
  onChoose,
}: {
  catalog: CatalogExercise[];
  current: Exercise;
  muscles?: string[];
  onChoose: (replacement: CatalogExercise) => void;
}) {
  const [query, setQuery] = useState("");

  /** La fiche catalogue de l'exercice en place, quand le programme la connaît. */
  const inPlaceEntry = useMemo(
    () => catalog.find((e) => e.id === current.catalogId) ?? null,
    [catalog, current.catalogId]
  );

  const targets = useMemo(() => {
    if (muscles?.length) return muscles;
    // Programme importé ou d'avant cette version : à défaut des muscles de la
    // section, ceux de l'exercice en place font une portée honnête.
    return inPlaceEntry ? inPlaceEntry.muscles : [];
  }, [inPlaceEntry, muscles]);

  const results = useMemo(() => {
    const usable = usableExercises(catalog);
    const scoped = targets.length
      ? usable.filter((e) => e.muscles.some((m) => targets.includes(m)))
      : usable;
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? scoped.filter((e) => searchableText(e).includes(needle))
      : scoped;
    // La nature du mouvement se lit dans le catalogue, jamais dans le
    // sous-titre affiché : celui du programme par défaut est un conseil de
    // coach, pas une description mécanique.
    const compoundInPlace = inPlaceEntry ? inPlaceEntry.mechanic === "compound" : null;
    return [...matching].sort((a, b) => {
      if (compoundInPlace !== null) {
        // Même nature d'abord : remplacer un polyarticulaire par une isolation
        // change la séance, pas seulement l'exercice.
        const sameKind =
          Number((b.mechanic === "compound") === compoundInPlace) -
          Number((a.mechanic === "compound") === compoundInPlace);
        if (sameKind !== 0) return sameKind;
      }
      return a.name.localeCompare(b.name);
    });
  }, [catalog, inPlaceEntry, query, targets]);

  const scopeLabel = targets.length
    ? targets.map((m) => MUSCLE_LABELS[m as Muscle] ?? m).join(", ")
    : "tout le catalogue";

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher : bench, poulie, biceps…"
        aria-label="Chercher un exercice"
        className="w-full rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <p className="mt-2 mb-1 text-[0.7rem] text-muted">
        {results.length} exercice{results.length > 1 ? "s" : ""} sur {scopeLabel}
      </p>

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Aucun exercice ne correspond.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {results.map((exercise) => {
              const inPlace = exercise.id === current.catalogId;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    disabled={inPlace}
                    onClick={() => onChoose(exercise)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                      inPlace
                        ? "cursor-default border-accent/50 bg-accent/5"
                        : "border-border bg-surface2 hover:border-accent"
                    }`}
                  >
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-surface">
                      {exercise.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element -- source externe, hors optimiseur Next
                        <img
                          src={exerciseImageUrl(exercise.images[0])}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.85rem] font-medium">{exercise.name}</div>
                      <div className="truncate text-[0.7rem] text-muted">
                        {[
                          label(EQUIPMENT_LABELS, exercise.equipment),
                          exercise.mechanic === "compound" ? "polyarticulaire" : "isolation",
                          label(LEVEL_LABELS, exercise.level),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <span className="shrink-0 text-[0.7rem] text-accent">
                      {inPlace ? "en place" : "Choisir ▸"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

/**
 * Bouton ⇄ ouvrant la liste des mouvements qui travaillent la même chose, pour
 * remplacer un exercice du programme. Le catalogue n'est téléchargé qu'à
 * l'ouverture.
 */
export function ExercisePicker({ current, muscles, onChoose }: Props) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogExercise[] | null>(null);
  const [failed, setFailed] = useState(false);

  const openPicker = () => {
    setOpen(true);
    if (!catalog) {
      setFailed(false);
      loadCatalog()
        .then(setCatalog)
        .catch(() => setFailed(true));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openPicker();
        }}
        aria-label={`Remplacer l'exercice : ${current.name}`}
        title="Remplacer cet exercice"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border font-display text-[0.7rem] leading-none text-muted transition hover:border-accent hover:text-accent"
      >
        ⇄
      </button>

      {open && (
        <Modal title={`Remplacer « ${current.name} »`} onClose={() => setOpen(false)} wide>
          {failed ? (
            <p className="py-8 text-center text-sm text-muted">
              Le catalogue n&apos;a pas pu être chargé.
              <br />
              Vérifie ta connexion et réessaie.
            </p>
          ) : catalog ? (
            <Candidates
              catalog={catalog}
              current={current}
              muscles={muscles}
              onChoose={(replacement) => {
                onChoose(replacement);
                setOpen(false);
              }}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted">Chargement du catalogue…</p>
          )}
        </Modal>
      )}
    </>
  );
}
