"use client";

import { useEffect } from "react";
import { renewGoogleToken } from "@/lib/googleButton";
import { tokenStore, tokenValide } from "@/lib/googleToken";
import { profileStore } from "@/lib/profile";

/** Marge avant expiration : on renouvelle sans attendre la panne. */
const MARGIN_MS = 10 * 60 * 1000;
const CHECK_MS = 5 * 60 * 1000;

/** Combien de temps il reste au jeton, en millisecondes. */
function remaining(jwt: string | null): number {
  if (!jwt) return 0;
  try {
    const payload = jwt.split(".")[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return claims.exp ? claims.exp * 1000 - Date.now() : 0;
  } catch {
    return 0;
  }
}

/**
 * Maintient la session Google vivante, sans rien afficher.
 *
 * Le jeton d'identité vit une heure. Sans renouvellement, la synchronisation
 * s'arrêtait une heure après la connexion et les modifications restaient sur
 * l'appareil — c'est ce qui faisait qu'un programme modifié sur un poste
 * n'apparaissait jamais sur le téléphone.
 *
 * Sans effet pour un compte local, qui n'a rien à synchroniser.
 */
export function TokenRenewal() {
  const profile = profileStore.useValue();
  const local = !profile || profile.subject === "local";

  useEffect(() => {
    if (local) return;

    const renouveler = () => {
      const jwt = tokenStore.get();
      if (tokenValide(jwt) && remaining(jwt) > MARGIN_MS) return;
      void renewGoogleToken((neuf) => tokenStore.set(neuf));
    };

    renouveler();
    const timer = window.setInterval(renouveler, CHECK_MS);
    // Au retour dans l'application, le jeton a pu expirer pendant l'absence.
    const onVisible = () => {
      if (document.visibilityState === "visible") renouveler();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [local]);

  return null;
}
