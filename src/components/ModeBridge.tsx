"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type Mode = "stronger" | "healthier";

function modeFor(path: string): Mode {
  return path.startsWith("/nutrition") ? "healthier" : "stronger";
}

/**
 * Pose le visage courant sur `<html>`, d'après la route.
 *
 * Dans un effet, et non pendant le rendu : écrire dans le DOM pendant le
 * rendu est un effet de bord que le compilateur React refuse, et c'est
 * exactement ce à quoi un effet sert — synchroniser un système extérieur avec
 * l'état de React.
 *
 * Conséquence acceptée : en arrivant directement sur /nutrition, la page
 * s'affiche une image dans les couleurs de Stronger avant de basculer. En
 * navigation interne — le cas courant — le changement est immédiat.
 */
export function ModeBridge() {
  const path = usePathname();

  useEffect(() => {
    document.documentElement.dataset.mode = modeFor(path);
  }, [path]);

  return null;
}

/** Le visage déduit de la route, pour les composants qui doivent s'y adapter. */
export function useMode(): Mode {
  return modeFor(usePathname());
}
