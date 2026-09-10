"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type Mode = "stronger" | "healthier" | "better";

function modeFor(path: string): Mode {
  if (path.startsWith("/nutrition")) return "healthier";
  if (path.startsWith("/progress")) return "better";
  return "stronger";
}

/**
 * Couleur de la barre d'état en application installée. Le manifeste n'en porte
 * qu'une : c'est ici que le second visage prend la sienne.
 */
const THEME_COLORS: Record<Mode, string> = {
  stronger: "#0e0f13",
  healthier: "#f6f8f4",
  better: "#0c1020",
};

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
    const mode = modeFor(path);
    document.documentElement.dataset.mode = mode;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[mode]);
  }, [path]);

  return null;
}

/** Le visage déduit de la route, pour les composants qui doivent s'y adapter. */
export function useMode(): Mode {
  return modeFor(usePathname());
}
