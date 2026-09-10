"use client";

import { mensurations, profileStore, sansMensurations } from "@/lib/profile";
import type { Program } from "@/lib/types";

export function Header({ program }: { program: Program }) {
  const profil = profileStore.useValue();
  // Les mensurations viennent du profil ; le programme ne porte plus que
  // l'objectif, pour ne pas afficher deux tailles contradictoires.
  const ligneProfil = [mensurations(profil), sansMensurations(program.subtitle)]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="mx-auto flex w-full max-w-[900px] flex-col gap-2 px-8 pt-10 pb-8">
      <div className="text-[0.7rem] font-medium tracking-[0.25em] text-accent uppercase">
        {program.tag}
      </div>
      <h1 className="font-display text-[clamp(3.5rem,10vw,6rem)] leading-[0.9] tracking-[0.02em]">
        {program.title} <span className="text-accent">{program.titleAccent}</span>
      </h1>
      <div className="mt-1 text-[0.85rem] text-muted">{ligneProfil}</div>
      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
        {program.statsRow.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-calm-soft px-4 py-3">
            <div className="font-display text-3xl leading-none text-accent">{stat.value}</div>
            <div className="mt-1 text-[0.7rem] tracking-[0.15em] text-muted uppercase">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}
