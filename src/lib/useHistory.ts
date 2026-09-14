"use client";

import { deletedWorkoutsStore, historyStore } from "@/lib/stores";
import type { SessionLog } from "@/lib/types";

export function useHistory() {
  const history = historyStore.useValue();
  return { history, removeSession, updateSession };
}

/**
 * Remplace une séance corrigée à la main, datée de l'instant : c'est cette
 * date que le rapprochement compare pour faire voyager la correction.
 */
export function updateSession(log: SessionLog): void {
  const corrigee: SessionLog = { ...log, editedAt: new Date().toISOString() };
  historyStore.set(historyStore.get().map((s) => (s.id === log.id ? corrigee : s)));
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
