"use client";

import { useState } from "react";
import { Assistant } from "@/components/Assistant";
import { APP_NAME_PARTS, APP_TAGLINE } from "@/lib/app";
import { assistantStore } from "@/lib/assistant";
import { monterBoutonGoogle } from "@/lib/googleButton";
import { googleConfigure, profilDepuisJeton, profileStore, profilVide } from "@/lib/profile";

/**
 * Porte d'entrée : connexion, puis assistant, puis l'application.
 *
 * Sans identifiant client Google configuré, on peut entrer sans compte : la
 * connexion se greffe quand elle est configurée, elle ne bloque pas l'usage.
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const profil = profileStore.useValue();
  const assistantFait = assistantStore.useValue();

  if (!profil) return <EcranConnexion />;
  if (!assistantFait) return <Assistant profil={profil} />;
  return <>{children}</>;
}

const PROFIL_LOCAL = { sub: "local", email: "", name: "Moi", picture: "" };

function EcranConnexion() {
  const [erreurJeton, setErreurJeton] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const recevoirJeton = (jwt: string) => {
    const issu = profilDepuisJeton(jwt);
    if ("erreur" in issu) {
      setErreurJeton(issu.erreur);
      return;
    }
    setErreurJeton(null);
    profileStore.set(issu);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7">
        <h1 className="font-display text-5xl leading-none tracking-[0.02em]">
          {APP_NAME_PARTS[0]}
          <span className="text-accent">{APP_NAME_PARTS[1]}</span>
        </h1>
        <p className="mt-2 text-[0.85rem] text-muted">{APP_TAGLINE}</p>

        {googleConfigure() ? (
          <>
            <p className="mt-5 text-sm text-muted">
              Connecte-toi pour retrouver ton profil et ton programme.
            </p>
            <div
              ref={(el) => {
                if (el) void monterBoutonGoogle(el, recevoirJeton).then(setErreur);
              }}
              className="mt-5 flex justify-center"
            />
            {erreur ? <p className="mt-3 text-sm text-accent2">{erreur}</p> : null}
            {erreurJeton ? <p className="mt-3 text-sm text-accent2">{erreurJeton}</p> : null}
            <button
              type="button"
              onClick={() => profileStore.set(profilVide(PROFIL_LOCAL))}
              className="mt-5 w-full text-xs text-muted underline transition hover:text-text"
            >
              Continuer sans compte Google
            </button>
          </>
        ) : (
          <>
            <p className="mt-5 text-sm text-muted">
              Quelques questions et on te construit un programme.
            </p>
            <button
              type="button"
              onClick={() => profileStore.set(profilVide(PROFIL_LOCAL))}
              className="font-display mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-lg text-accent-fg transition hover:opacity-90"
            >
              Commencer
            </button>
            <p className="mt-4 text-xs text-muted">
              La connexion Google n&apos;est pas configurée sur cette installation.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
