"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { APP_NAME_PARTS } from "@/lib/app";
import { profileStore } from "@/lib/profile";

const LIENS = [
  { href: "/", label: "Programme" },
  { href: "/progress", label: "Progression" },
] as const;

/** Bandeau : marque à gauche, navigation en pilules au centre, profil à droite. */
export function TopBar() {
  const profil = profileStore.useValue();
  const chemin = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center gap-x-4 gap-y-2 px-8 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display grid size-8 place-items-center rounded-xl bg-accent text-lg leading-none text-accent-fg">
            S
          </span>
          <span className="font-display text-xl leading-none tracking-[0.02em]">
            {APP_NAME_PARTS[0]}
            <span className="text-accent">{APP_NAME_PARTS[1]}</span>
          </span>
        </Link>

        <nav className="order-last flex w-full items-center justify-center gap-1 border-t border-border/70 pt-2 sm:order-none sm:mx-auto sm:w-auto sm:border-0 sm:pt-0">
          {LIENS.map((l) => {
            const actif = chemin === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  actif
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-surface2 hover:text-text"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto sm:ml-0">
          {profil ? <ProfileMenu profil={profil} /> : null}
        </div>
      </div>
    </header>
  );
}
