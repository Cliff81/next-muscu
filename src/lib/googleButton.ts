"use client";

import { GOOGLE_CLIENT_ID, googleConfigured } from "@/lib/profile";

type Credential = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: Credential) => void;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>
          ) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gis="1"]');
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script")));
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
export async function mountGoogleButton(
  el: HTMLElement,
  onToken: (jwt: string) => void
): Promise<string | null> {
  if (!googleConfigured()) return null;
  // Le ref de rappel peut s'exécuter deux fois en développement : sans cette
  // marque, le bouton Google serait rendu en double.
  if (el.dataset.monte === "1") return null;
  el.dataset.monte = "1";

  try {
    await loadScript();
    const id = window.google?.accounts?.id;
    if (!id) throw new Error("script");
    id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) onToken(response.credential);
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

/**
 * Renouvelle le jeton d'identité sans rien demander.
 *
 * Le jeton Google vit une heure et le flux navigateur n'en délivre aucun de
 * rafraîchissement : sans ce rappel, la synchronisation s'arrêtait une heure
 * après la connexion et tout restait sur l'appareil. `auto_select` rend un
 * nouveau jeton sans interaction quand la personne est déjà connectée à Google
 * et a déjà consenti — c'est-à-dire dans le cas courant.
 *
 * En cas d'échec — session Google fermée, consentement révoqué, navigateur qui
 * bloque — on ne force rien : l'encart du menu de profil propose de se
 * reconnecter d'un clic.
 */
export async function renewGoogleToken(onToken: (jwt: string) => void): Promise<boolean> {
  if (!googleConfigured()) return false;
  try {
    await loadScript();
    const id = window.google?.accounts?.id;
    if (!id) return false;
    return await new Promise<boolean>((resolve) => {
      let rendu = false;
      id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: true,
        callback: (response) => {
          rendu = true;
          if (response.credential) onToken(response.credential);
          resolve(Boolean(response.credential));
        },
      });
      id.prompt();
      // Google ne signale pas toujours un refus : au-delà du délai, on
      // considère que le renouvellement n'a pas eu lieu plutôt que d'attendre.
      window.setTimeout(() => {
        if (!rendu) resolve(false);
      }, 8000);
    });
  } catch {
    return false;
  }
}
