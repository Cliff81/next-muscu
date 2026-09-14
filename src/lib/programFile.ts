"use client";

/** Confirme puis signale s'il faut revenir au programme par défaut. */
export function confirmReset(): boolean {
  return window.confirm(
    "Revenir au programme par défaut ?\n\nLe programme actuel sera remplacé."
  );
}
