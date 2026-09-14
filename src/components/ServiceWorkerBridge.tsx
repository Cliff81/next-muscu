"use client";

import { useEffect } from "react";
import { activeSessionStore } from "@/lib/stores";

/**
 * Enregistre le service worker et amène les nouvelles versions jusqu'à l'écran.
 *
 * Seulement en production : en développement, un cache qui s'interpose entre
 * le rechargement à chaud et le navigateur ne produit que des confusions.
 *
 * L'enregistrement ne suffit pas. Une application installée reste ouverte des
 * jours dans le sélecteur de tâches : le service worker se met à jour en
 * arrière-plan, mais la page déjà chargée garde son ancien JavaScript. C'est
 * ainsi qu'un correctif livré depuis plusieurs jours ne parvenait pas sur le
 * téléphone. On vérifie donc à chaque retour au premier plan, et on recharge
 * quand une nouvelle version a pris la main.
 *
 * Jamais pendant une séance : interrompre un entraînement pour recharger serait
 * pire que le défaut corrigé. Le rechargement attend la fin.
 */
export function ServiceWorkerBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let updateReady = false;
    // Un premier enregistrement prend aussi la main : ce n'est pas une mise à
    // jour, et recharger là n'aurait aucun sens.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let registration: ServiceWorkerRegistration | null = null;

    const sessionEnCours = () => {
      const s = activeSessionStore.get();
      return Boolean(s && !s.finishedAt);
    };

    const rechargerSiPossible = () => {
      if (!updateReady || sessionEnCours()) return;
      window.location.reload();
    };

    const onControllerChange = () => {
      if (!hadController) return;
      updateReady = true;
      if (document.visibilityState === "visible") rechargerSiPossible();
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Une version peut être sortie pendant l'absence.
      void registration?.update().catch(() => {});
      rechargerSiPossible();
    };

    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((r) => {
          registration = r;
          void r.update().catch(() => {});
        })
        .catch(() => {
          // Refusé (mode privé, réglage du navigateur) : l'application marche
          // sans, elle n'est simplement pas installable ni disponible hors ligne.
        });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
