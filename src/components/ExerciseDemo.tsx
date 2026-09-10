"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string;
  demo?: string;
  className?: string;
};

/**
 * Bouton (i) qui ouvre une modale avec le GIF/vidéo de démonstration de l'exercice.
 * Le fichier est servi depuis /public/exos/<demo>. Ne rend rien si `demo` est absent.
 */
export function ExerciseDemo({ name, demo, className }: Props) {
  const [open, setOpen] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!demo) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setErrored(false);
          setOpen(true);
        }}
        aria-label={`Voir la démonstration : ${name}`}
        title="Voir la démonstration"
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/50 font-display text-[0.7rem] leading-none text-accent transition hover:bg-accent hover:text-bg ${className ?? ""}`}
      >
        i
      </button>

      {open && (
        <div
          className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Démonstration : ${name}`}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-display text-lg leading-tight text-text">{name}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-accent2 hover:text-accent2"
              >
                ✕
              </button>
            </div>
            {errored ? (
              <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface2 text-center text-sm text-muted">
                <span className="text-4xl">🎬</span>
                <p className="mt-3 px-6">
                  Démo à venir.
                  <br />
                  Ajoute le fichier{" "}
                  <code className="text-accent">public/exos/{demo}</code>.
                </p>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- GIF animé : next/image figerait l'animation
              <img
                src={`/exos/${demo}`}
                alt={`Démonstration de l'exercice ${name}`}
                onError={() => setErrored(true)}
                className="w-full rounded-lg bg-surface2"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
