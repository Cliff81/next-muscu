"use client";

import { useState } from "react";
import { ExerciseChooser } from "@/components/ExercisePicker";
import { Modal } from "@/components/Modal";
import type { CatalogExercise } from "@/lib/catalog";

/**
 * Ajout d'un exercice en cours de séance — la machine prévue est prise, il
 * reste du jus pour un mouvement de plus. L'exercice entre dans la séance
 * seulement ; la case le pose aussi dans le programme, pour les fois suivantes.
 */
export function SessionAddExercise({
  sectionTitle,
  muscles,
  supersetWith,
  onChoose,
}: {
  /** Catégorie dans laquelle l'exercice sera rangé. */
  sectionTitle: string;
  muscles?: string[];
  /** Nom affiché de l'exercice en cours, avec lequel proposer un super-set. */
  supersetWith: string | null;
  onChoose: (chosen: CatalogExercise, alsoInProgram: boolean, asSuperset: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [alsoInProgram, setAlsoInProgram] = useState(false);
  const [asSuperset, setAsSuperset] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-accent/50 px-3 py-1.5 text-xs text-accent transition hover:bg-accent-soft"
      >
        + Ajouter un exercice
      </button>

      {open && (
        <Modal title={`Ajouter à « ${sectionTitle} »`} onClose={() => setOpen(false)} wide>
          <label className="mb-2 flex items-center gap-2 text-[0.78rem] text-muted">
            <input
              type="checkbox"
              checked={alsoInProgram}
              onChange={(e) => setAlsoInProgram(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            L&apos;ajouter aussi au programme, pour les prochaines séances
          </label>
          {supersetWith && (
            <label className="mb-2 flex items-center gap-2 text-[0.78rem] text-muted">
              <input
                type="checkbox"
                checked={asSuperset}
                onChange={(e) => setAsSuperset(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              En super-set avec « {supersetWith} » : les séries s&apos;enchaînent sans repos
            </label>
          )}
          <ExerciseChooser
            current={null}
            muscles={muscles}
            onChoose={(chosen) => {
              onChoose(chosen, alsoInProgram, asSuperset && supersetWith !== null);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
