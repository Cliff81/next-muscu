"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { parseProgram } from "@/lib/programSchema";
import { archiveProgram } from "@/lib/programLibrary";
import { programStore } from "@/lib/stores";
import { notify } from "@/lib/toast";

/**
 * Programme reçu par lien.
 *
 * Le contenu vient d'ailleurs : il est relu par le schéma avant d'être
 * proposé. Un programme mal formé — format plus ancien, ligne trafiquée — doit
 * s'annoncer ici plutôt que de casser la page du programme.
 */
export default function SharedProgramPage() {
  const params = useParams<{ code: string }>();
  const shared = useQuery(api.shares.get, { code: params.code });

  if (shared === undefined) {
    return <Cadre>Chargement du programme partagé…</Cadre>;
  }
  if (shared === null) {
    return (
      <Cadre>
        Ce lien ne mène à rien. Il a peut-être été retiré par la personne qui te
        l&apos;a envoyé.
      </Cadre>
    );
  }

  const lu = parseProgram(shared.program);
  if (!lu) {
    return <Cadre>Ce programme est illisible — il vient sans doute d&apos;une version plus ancienne.</Cadre>;
  }

  const jours = lu.days.length;
  const exercices = lu.days.reduce(
    (n, d) => n + d.sections.reduce((m, s) => m + s.exercises.length, 0),
    0
  );

  return (
    <div className="mx-auto w-full max-w-lg px-8 pt-10 pb-16">
      <Link href="/" className="text-[0.8rem] text-muted transition hover:text-accent">
        ← Mon programme
      </Link>
      <div className="mt-4 text-[0.7rem] tracking-[0.25em] text-accent uppercase">
        Programme partagé
      </div>
      <h1 className="font-display mt-2 text-4xl leading-none">
        {lu.title} <span className="text-accent">{lu.titleAccent}</span>
      </h1>
      <p className="mt-2 text-[0.85rem] text-muted">
        {jours} journée{jours > 1 ? "s" : ""} · {exercices} exercices
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {lu.days.map((day) => (
          <li key={day.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="text-[0.9rem] font-medium">
              <span className="text-accent">{day.code}</span> {day.title}
            </div>
            <div className="mt-0.5 text-[0.72rem] text-muted">
              {day.sections.map((s) => `${s.title} (${s.exercises.length})`).join(" · ")}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            notify(
              archiveProgram(lu, shared.title)
                ? `« ${shared.title} » ajouté à tes programmes.`
                : `« ${shared.title} » est déjà dans ta bibliothèque.`
            );
          }}
          className="rounded-md border border-accent/60 px-4 py-2.5 text-sm text-accent transition hover:bg-accent-soft"
        >
          Garder dans mes programmes
        </button>
        <button
          type="button"
          onClick={() => {
            const garde = archiveProgram(programStore.get());
            programStore.set(lu);
            notify(
              garde
                ? "Programme adopté. Le tien est gardé de côté."
                : "Programme adopté."
            );
          }}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg transition hover:opacity-90"
        >
          L&apos;utiliser tout de suite
        </button>
      </div>
      <p className="mt-3 text-[0.75rem] text-muted">
        Adopter ce programme remplace le tien, qui est gardé de côté — tu le
        retrouveras dans « Mes programmes ».
      </p>
    </div>
  );
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg px-8 pt-16">
      <p className="rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">{children}</p>
      <Link href="/" className="mt-4 inline-block text-sm text-accent">
        ← Revenir à mon programme
      </Link>
    </div>
  );
}
