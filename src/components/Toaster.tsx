"use client";

import { useEffect } from "react";
import { dismissToast, useToast } from "@/lib/toast";

/** Bandeau de confirmation, effacé de lui-même au bout de quelques secondes. */
export function Toaster() {
  const toast = useToast();
  const id = toast?.id;

  useEffect(() => {
    if (id === undefined) return;
    const minuteur = setTimeout(() => dismissToast(id), 4000);
    return () => clearTimeout(minuteur);
  }, [id]);

  if (!toast) return null;

  return (
    <div
      // `polite` et non `assertive` : c'est une confirmation, elle n'a pas à
      // couper la lecture en cours.
      role="status"
      aria-live="polite"
      className="animate-fade fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
    >
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="max-w-md rounded-full border border-accent/50 bg-surface px-5 py-2.5 text-sm text-text shadow-2xl transition hover:border-accent"
      >
        {toast.text}
      </button>
    </div>
  );
}
