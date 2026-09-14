"use client";

import { deletedWorkoutsStore, historyStore } from "@/lib/stores";

export function useHistory() {
  const history = historyStore.useValue();
  return { history, removeSession };
}

/**
 * Supprime une séance de l'historique.
 *
 * Le registre des suppressions est écrit **avant** l'historique : c'est lui qui
 * empêche la séance de redescendre de Convex, et une synchronisation peut se
 * glisser entre les deux écritures.
 */
export function removeSession(id: string): void {
  const registre = deletedWorkoutsStore.get();
  if (!registre.includes(id)) deletedWorkoutsStore.set([...registre, id]);
  historyStore.set(historyStore.get().filter((seance) => seance.id !== id));
}
