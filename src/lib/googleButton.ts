"use client";

import { GOOGLE_CLIENT_ID, googleConfigure } from "@/lib/profile";

type Credential = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (reponse: Credential) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>
          ) => void;
        };
      };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function chargerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existant = document.querySelector<HTMLScriptElement>('script[data-gis="1"]');
    if (existant) {
      if (existant.dataset.loaded === "1") {
        resolve();
        return;
      }
      existant.addEventListener("load", () => resolve());
      existant.addEventListener("error", () => reject(new Error("script")));
      return;
    }
    const el = document.createElement("script");
    el.src = GIS_SRC;
    el.async = true;
    el.dataset.gis = "1";
    el.addEventListener("load", () => {
      el.dataset.loaded = "1";
      resolve();
    });
    el.addEventListener("error", () => reject(new Error("script")));
    document.head.appendChild(el);
  });
}

/**
 * Rend le bouton officiel « Continuer avec Google » dans `el` et remonte le
 * jeton d'identité reçu. Retourne un message d'erreur, ou `null` si tout va
 * bien.
 *
 * Volontairement écrit comme une fonction et non comme un hook : appelée depuis
 * un *callback ref*, elle évite l'effet et la lecture de `ref.current` que les
 * règles React de Next 16 rejettent.
 */
export async function monterBoutonGoogle(
  el: HTMLElement,
  onJeton: (jwt: string) => void
): Promise<string | null> {
  if (!googleConfigure()) return null;
  // Le ref de rappel peut s'exécuter deux fois en développement : sans cette
  // marque, le bouton Google serait rendu en double.
  if (el.dataset.monte === "1") return null;
  el.dataset.monte = "1";

  try {
    await chargerScript();
    const id = window.google?.accounts?.id;
    if (!id) throw new Error("script");
    id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (reponse) => {
        if (reponse.credential) onJeton(reponse.credential);
      },
    });
    id.renderButton(el, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "pill",
      locale: "fr",
    });
    return null;
  } catch {
    el.dataset.monte = "";
    return "Impossible de joindre Google. Vérifie la connexion Internet.";
  }
}
