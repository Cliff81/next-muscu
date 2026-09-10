"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Pour les contenus en liste, qui respirent mal dans la largeur par défaut. */
  wide?: boolean;
};

/** Fenêtre modale : voile cliquable, fermeture au clavier, titre et croix. */
export function Modal({ title, onClose, children, wide }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex max-h-[88vh] w-full flex-col rounded-xl border border-border bg-surface p-4 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-tight text-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-accent2 hover:text-accent2"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
