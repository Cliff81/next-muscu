"use client";

import { renameProgram } from "@/lib/editProgram";
import { measurementsLine, profileStore, withoutMeasurements } from "@/lib/profile";
import { programStore } from "@/lib/stores";
import type { Program } from "@/lib/types";

export function Header({ program, editing = false }: { program: Program; editing?: boolean }) {
  const profile = profileStore.useValue();
  // Les mensurations viennent du profil ; le programme ne porte plus que
  // l'objectif, pour ne pas afficher deux tailles contradictoires.
  const ligneProfil = [measurementsLine(profile), withoutMeasurements(program.subtitle)]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="mx-auto flex w-full max-w-[900px] flex-col gap-2 px-8 pt-10 pb-8">
      <div className="text-[0.7rem] font-medium tracking-[0.25em] text-accent uppercase">
        {program.tag}
      </div>
      {editing ? (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={program.title}
            aria-label="Nom du programme"
            placeholder="Nom du programme"
            onChange={(e) => programStore.set(renameProgram(programStore.get(), e.target.value))}
            className="font-display w-full rounded-md border border-border bg-surface2 px-3 py-2 text-[clamp(2rem,6vw,3.5rem)] leading-tight tracking-[0.02em] text-text focus:border-accent focus:outline-none"
          />
          <span className="text-[0.75rem] text-muted">
            Ce nom suit le programme, et sert d&apos;étiquette quand tu le mets de côté.
            {" "}
            <span className="text-accent">{program.titleAccent}</span> se met à jour tout seul.
          </span>
        </div>
      ) : (
        <h1 className="font-display text-[clamp(3.5rem,10vw,6rem)] leading-[0.9] tracking-[0.02em]">
          {program.title} <span className="text-accent">{program.titleAccent}</span>
        </h1>
      )}
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
