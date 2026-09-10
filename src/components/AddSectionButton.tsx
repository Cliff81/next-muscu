"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { MUSCLE_LABELS, type Muscle } from "@/lib/catalog";

const MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[];

/**
 * Création d'une catégorie. Les muscles choisis ne servent pas qu'à l'affichage :
 * c'est sur eux que le sélecteur d'exercices filtrera ensuite.
 */
export function AddSectionButton({
  onAdd,
}: {
  onAdd: (title: string, muscles: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Muscle[]>([]);
  const [title, setTitle] = useState("");

  const suggested = chosen.map((m) => MUSCLE_LABELS[m]).join(" & ");
  const finalTitle = title.trim() || suggested;

  const close = () => {
    setOpen(false);
    setChosen([]);
    setTitle("");
  };

  const toggle = (muscle: Muscle) =>
    setChosen((current) =>
      current.includes(muscle) ? current.filter((m) => m !== muscle) : [...current, muscle]
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 rounded-md border border-dashed border-border2 px-4 py-2.5 text-sm text-muted transition hover:border-accent hover:text-accent"
      >
        + Ajouter une catégorie
      </button>

      {open && (
        <Modal title="Nouvelle catégorie" onClose={close}>
          <div>
            <div className="mb-1.5 text-[0.7rem] tracking-[0.12em] text-muted uppercase">
              Muscles travaillés
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map((muscle) => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => toggle(muscle)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    chosen.includes(muscle)
                      ? "border-accent bg-accent-soft font-medium text-accent"
                      : "border-border2 text-muted hover:text-text"
                  }`}
                >
                  {MUSCLE_LABELS[muscle]}
                </button>
              ))}
            </div>

            <label className="mt-4 flex flex-col gap-1">
              <span className="text-[0.7rem] tracking-[0.12em] text-muted uppercase">
                Nom de la catégorie
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={suggested || "Pectoraux"}
                className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </label>
            <p className="mt-1.5 text-[0.72rem] text-muted">
              Les muscles choisis servent à proposer les bons exercices ensuite.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={chosen.length === 0}
                onClick={() => {
                  onAdd(finalTitle, chosen);
                  close();
                }}
                className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:text-text"
              >
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
