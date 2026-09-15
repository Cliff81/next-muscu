"use client";

import { useState } from "react";
import { NOTE_MAX_LENGTH, noteFor, setNote } from "@/lib/notes";
import { notesStore } from "@/lib/stores";
import { notify } from "@/lib/toast";

type Props = {
  /** Nom de l'exercice tel qu'il est dans le programme : c'est la clé. */
  name: string;
  /** Nom affiché, en français. */
  label: string;
};

/**
 * La note personnelle d'un exercice : lue d'un coup d'œil, modifiée sur
 * place. Le composant se remonte par exercice (clé sur le nom) : le brouillon
 * d'un exercice ne suit pas le suivant.
 */
export function ExerciseNote({ name, label }: Props) {
  const notes = notesStore.useValue();
  const texte = noteFor(notes, name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const ouvrir = () => {
    setDraft(texte ?? "");
    setEditing(true);
  };

  const enregistrer = (valeur: string) => {
    notesStore.set(setNote(notesStore.get(), name, valeur));
    setEditing(false);
    notify(valeur.trim() ? "Note enregistrée." : "Note effacée.");
  };

  if (editing) {
    return (
      <div className="mt-2 rounded-lg border border-accent/40 bg-surface2 p-3">
        <label
          htmlFor={`note-${name}`}
          className="mb-1 block text-[0.65rem] tracking-[0.1em] text-muted uppercase"
        >
          Note perso · {label}
        </label>
        <textarea
          id={`note-${name}`}
          autoFocus
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          value={draft}
          placeholder="Siège cran 4, prise large, ne pas cambrer…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enregistrer(draft);
          }}
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => enregistrer(draft)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition hover:opacity-90"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:text-text"
          >
            Annuler
          </button>
          {texte && (
            <button
              type="button"
              onClick={() => enregistrer("")}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:border-neg hover:text-neg"
            >
              Effacer
            </button>
          )}
          <span className="ml-auto text-[0.65rem] text-muted">
            {draft.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>
      </div>
    );
  }

  if (texte) {
    return (
      <div className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-warn/30 bg-surface2 px-3 py-2 text-[0.78rem]">
        <p className="whitespace-pre-wrap text-text">
          <span aria-hidden>📝 </span>
          {texte}
        </p>
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Modifier la note de ${label}`}
          className="shrink-0 text-xs text-muted underline transition hover:text-accent"
        >
          modifier
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={ouvrir}
      className="mt-2 text-[0.75rem] text-muted transition hover:text-accent"
    >
      + Ajouter une note perso (réglages, repères…)
    </button>
  );
}
