"use client";

import { useState } from "react";
import { onboardingStore } from "@/lib/onboarding";
import { profileStore, type Profile } from "@/lib/profile";
import { archiveProgram, libraryStore } from "@/lib/programLibrary";
import { LibraryPanel } from "@/components/LibraryPanel";
import { SharePanel } from "@/components/SharePanel";
import { notify } from "@/lib/toast";
import { tokenStore } from "@/lib/googleToken";
import { SyncStatus } from "@/components/SyncStatus";
import { useProgram } from "@/lib/useProgram";

/** Pastille de profil : programme, assistant et déconnexion. */
export function ProfileMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState(false);
  const [share, setShare] = useState(false);
  const { program } = useProgram();
  const gardes = libraryStore.useValue();
  // Un programme déjà rangé n'a pas à être proposé une seconde fois : le garder
  // ne ferait rien, et l'entrée laisserait croire le contraire.
  const dejaGarde = gardes.some((s) => JSON.stringify(s.program) === JSON.stringify(program));

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
            <span className="font-display grid size-6 place-items-center rounded-full bg-accent text-sm text-accent-fg">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          {profile.name}
        </button>

        {open ? (
          <div className="absolute right-0 z-40 mt-1 w-60 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-xl">
            <Section>Programme</Section>
            <Item
              onClick={() => {
                setOpen(false);
                setShare(true);
              }}
            >
              Partager ce programme
            </Item>
            {!dejaGarde && (
              <Item
                onClick={() => {
                  setOpen(false);
                  archiveProgram(program);
                  notify(
                    `« ${program.title} » est gardé de côté. Tu le retrouveras dans « Mes programmes ».`
                  );
                }}
              >
                Garder ce programme de côté
              </Item>
            )}
            <Item
              onClick={() => {
                setOpen(false);
                setLibrary(true);
              }}
            >
              Mes programmes{gardes.length ? ` (${gardes.length})` : ""}
            </Item>

            <Separator />
            <SyncStatus profile={profile} />
            <Separator />
            <Item
              onClick={() => {
                setOpen(false);
                // Rejouer l'assistant permet de corriger ses informations, de
                // reconstruire un programme, ou de passer au volet alimentation.
                onboardingStore.set(false);
              }}
            >
              Relancer l&apos;assistant
            </Item>
            <Item
              danger
              onClick={() => {
                setOpen(false);
                tokenStore.clear();
                profileStore.clear();
              }}
            >
              Se déconnecter
            </Item>
          </div>
        ) : null}
      </div>

      {library ? <LibraryPanel onClose={() => setLibrary(false)} /> : null}
      {share ? <SharePanel program={program} onClose={() => setShare(false)} /> : null}
    </>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-1 pb-1 text-[0.7rem] tracking-[0.15em] text-muted uppercase">
      {children}
    </div>
  );
}

function Separator() {
  return <div className="my-1 h-px bg-border" />;
}

function Item({
  danger = false,
  children,
  onClick,
}: {
  danger?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left transition hover:bg-bg ${
        danger ? "text-accent2" : "text-text"
      }`}
    >
      {children}
    </button>
  );
}
