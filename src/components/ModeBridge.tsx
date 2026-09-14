"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

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
 * Sur le serveur, il n'y a pas de mise en page à mesurer : l'effet de
 * disposition n'y tourne pas, et React le signale. On choisit donc une fois
 * pour toutes, au chargement du module.
 */
const useAvantPeinture = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Pose le visage courant sur `<html>`, d'après la route.
 *
 * **Avant la peinture**, et non après : `usePathname` a déjà la nouvelle route
 * quand la nouvelle page se rend, si bien qu'un effet ordinaire arrivait une
 * image trop tard — on voyait la page Nutrition peinte dans les couleurs de
 * Stronger, puis le basculement. L'effet de disposition les fait tenir dans la
 * même image.
 *
 * Le tout premier affichage, lui, est réglé par le script du gabarit : à
 * l'ouverture directe de /nutrition, React n'a pas encore repris la main.
 */
export function ModeBridge() {
  const path = usePathname();

  useAvantPeinture(() => {
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
