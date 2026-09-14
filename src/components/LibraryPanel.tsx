"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import {
  archiveProgram,
  libraryStore,
  removeSaved,
  renameSaved,
  type SavedProgram,
} from "@/lib/programLibrary";
import { programStore } from "@/lib/stores";
import { notify } from "@/lib/toast";

const leJour = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const compteExercices = (saved: SavedProgram) =>
  saved.program.days.reduce(
    (n, d) => n + d.sections.reduce((m, s) => m + s.exercises.length, 0),
    0
  );

/**
 * Bibliothèque de programmes.
 *
 * Le même contenu que l'étape de l'assistant, accessible sans le relancer :
 * choisir un programme gardé n'a pas à passer par sept questions. Celui qui est
 * en cours est mis de côté à son tour — on échange, on ne perd rien.
 */
export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const library = libraryStore.useValue();
  const courant = programStore.useValue();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  // Le programme en cours se reconnaît à son contenu, et non à son nom : deux
  // entrées peuvent porter le même nom sans être le même programme.
  const signatureCourante = JSON.stringify(courant);

  const utiliser = (saved: SavedProgram) => {
    const garde = archiveProgram(programStore.get());
    programStore.set(saved.program);
    notify(
      garde
        ? `« ${saved.name} » chargé. Ton programme précédent est gardé de côté.`
        : `« ${saved.name} » chargé.`
    );
    onClose();
  };

  return (
    <Modal title="Mes programmes" onClose={onClose} wide>
      <p className="mb-3 text-[0.8rem] text-muted">
        Les programmes que tu as gardés de côté. En choisir un remplace le
        programme actuel, qui est gardé à son tour.
      </p>

      {library.length === 0 ? (
        <p className="rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          Aucun programme gardé pour l&apos;instant. « Garder ce programme de
          côté » en ajoute un, et l&apos;assistant met l&apos;ancien de côté
          chaque fois qu&apos;il en construit un nouveau.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {library.map((saved) => {
            const enCours = JSON.stringify(saved.program) === signatureCourante;
            return (
            <li
              key={saved.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${
                enCours ? "border-accent/50 bg-accent-soft" : "border-border bg-surface2"
              }`}
            >
              <div className="min-w-0 flex-1">
                {renaming === saved.id ? (
                  <input
                    type="text"
                    value={draftName}
                    autoFocus
                    aria-label="Nom du programme gardé"
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameSaved(saved.id, draftName);
                        setRenaming(null);
                      }
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onBlur={() => {
                      renameSaved(saved.id, draftName);
                      setRenaming(null);
                    }}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 text-[0.9rem] text-text focus:border-accent focus:outline-none"
                  />
                ) : (
                  <div className="truncate text-[0.9rem] font-medium">{saved.name}</div>
                )}
                <div className="text-[0.72rem] text-muted">
                  {saved.program.days.length} jour{saved.program.days.length > 1 ? "s" : ""} ·{" "}
                  {compteExercices(saved)} exercices · gardé le {leJour(saved.savedAt)}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(saved.id);
                    setDraftName(saved.name);
                  }}
                  aria-label={`Renommer ${saved.name}`}
                  title="Renommer"
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer « ${saved.name} » de la bibliothèque ?`)) {
                      removeSaved(saved.id);
                      notify("Programme retiré de la bibliothèque.");
                    }
                  }}
                  aria-label={`Supprimer ${saved.name}`}
                  title="Supprimer de la bibliothèque"
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-neg hover:text-neg"
                >
                  ✕
                </button>
                {enCours ? (
                  <span className="rounded-md border border-accent/60 px-3 py-1.5 text-xs text-accent">
                    En cours
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => utiliser(saved)}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition hover:opacity-90"
                  >
                    Utiliser
                  </button>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
