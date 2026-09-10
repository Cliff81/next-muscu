"use client";

import { createLocalStore } from "@/lib/createLocalStore";

/**
 * Jeton d'identité Google, conservé tel quel pour être présenté à Convex.
 *
 * Compromis assumé : le garder dans le `localStorage` permet de retrouver sa
 * session après un rechargement, mais une faille XSS pourrait le lire. Il est
 * de courte durée — une heure — et ne donne accès qu'aux données de son
 * porteur. L'alternative, le garder en mémoire, obligerait à recliquer sur le
 * bouton Google à chaque rechargement de page.
 */
export const tokenStore = createLocalStore<string | null>("muscu:token", null);

/** Un jeton expiré ne sert à rien : autant le traiter comme absent. */
export function tokenValide(jwt: string | null): boolean {
  if (!jwt) return false;
  const payload = jwt.split(".")[1];
  if (!payload) return false;
  try {
    const claims = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    return !!claims.exp && claims.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
