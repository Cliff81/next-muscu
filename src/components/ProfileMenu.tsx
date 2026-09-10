"use client";

import { useState } from "react";
import { onboardingStore } from "@/lib/onboarding";
import { profileStore, type Profile } from "@/lib/profile";

/** Pastille de profil : mensurations modifiables et déconnexion. */
export function ProfileMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={profile.email || profile.name}
          className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1 text-xs font-medium text-text transition hover:border-accent"
        >
          {profile.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar Google distant, hors domaine configuré
            <img
              src={profile.picture}
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-full"
            />
          ) : (
            <span className="font-display grid size-6 place-items-center rounded-full bg-accent text-sm text-bg">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          {profile.name}
        </button>

        {open ? (
          <div className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 text-sm shadow-xl">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                // Rejouer l'assistant permet de corriger ses informations et de
                // reconstruire un programme, ou de passer au volet alimentation.
                onboardingStore.set(false);
              }}
              className="block w-full px-3 py-2 text-left text-text transition hover:bg-bg"
            >
              Relancer l&apos;assistant
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                profileStore.clear();
              }}
              className="block w-full px-3 py-2 text-left text-accent2 transition hover:bg-bg"
            >
              Se déconnecter
            </button>
          </div>
        ) : null}
      </div>

    </>
  );
}
