"use client";

import { useSyncExternalStore } from "react";

const rien = () => () => {};

/**
 * `false` au rendu serveur et pendant l'hydratation, `true` ensuite.
 *
 * La page d'accueil est pré-rendue à la construction : tout ce qui dépend de
 * la date du jour y serait figé à la date du déploiement, et React garderait
 * les attributs du serveur au lieu de les corriger. Ce qui dépend du jour
 * attend donc d'être monté pour s'afficher.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    rien,
    () => true,
    () => false
  );
}
