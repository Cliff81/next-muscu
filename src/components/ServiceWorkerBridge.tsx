"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker, sans rien afficher.
 *
 * Seulement en production : en développement, un cache qui s'interpose entre
 * le rechargement à chaud et le navigateur ne produit que des confusions.
 * L'enregistrement attend la fin du chargement de la page pour ne pas disputer
 * la bande passante au premier affichage.
 */
export function ServiceWorkerBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Refusé (mode privé, réglage du navigateur) : l'application marche
        // sans, elle n'est simplement pas installable ni disponible hors ligne.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
