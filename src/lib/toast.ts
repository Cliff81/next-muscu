"use client";

import { useSyncExternalStore } from "react";

/**
 * Messages brefs, affichés puis oubliés.
 *
 * Une action qui réussit sans rien dire laisse croire qu'elle n'a pas eu lieu :
 * mettre un programme de côté ne changeait rien à l'écran. Un `alert` bloquant
 * serait disproportionné pour une confirmation — d'où ce bandeau, qui informe
 * sans interrompre.
 *
 * Hors du `localStorage` volontairement : un message est vrai l'instant où il
 * s'affiche, pas au rechargement suivant.
 */

export type Toast = { id: number; text: string };

let courant: Toast | null = null;
const listeners = new Set<() => void>();

function emettre(): void {
  listeners.forEach((l) => l());
}

export function notify(text: string): void {
  courant = { id: Date.now() + Math.random(), text };
  emettre();
}

export function dismissToast(id: number): void {
  if (courant?.id === id) {
    courant = null;
    emettre();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    subscribe,
    () => courant,
    () => null
  );
}
