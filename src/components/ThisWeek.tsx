"use client";

import Link from "next/link";
import { useMemo } from "react";
import { dayKey, weekSummary, weeklyStreak } from "@/lib/calendar";
import { decimal } from "@/lib/format";
import { outingsStore } from "@/lib/stores";
import type { Day, SessionLog } from "@/lib/types";
import { useMounted } from "@/lib/useMounted";
import type { WeekStatus } from "@/lib/week";

const LETTRES = ["L", "M", "M", "J", "V", "S", "D"];

type Props = {
  days: Day[];
  history: SessionLog[];
  /** Où en est la semaine : journées faites, prochaine à faire. */
  status: WeekStatus;
};

/**
 * La semaine en un coup d'œil, en tête du programme.
 *
 * Les onglets disent quelle journée est faite ; ce bloc dit où l'on en est :
 * combien de séances sur combien, quels jours, ce qu'il reste, et depuis
 * combien de semaines ça tient. C'est la première chose qu'on regarde en
 * ouvrant l'application, avant de choisir une journée.
 *
 * La page d'accueil est pré-rendue : ce qui dépend de la date du jour attend
 * d'être monté — voir `useMounted`.
 */
export function ThisWeek({ days, history, status }: Props) {
  const mounted = useMounted();
  const outings = outingsStore.useValue();
  const resume = useMemo(() => (mounted ? weekSummary(history, outings) : null), [mounted, history, outings]);
  const serie = useMemo(() => (mounted ? weeklyStreak(history) : 0), [mounted, history]);
  const aujourdhui = mounted ? dayKey(new Date()) : null;

  const faites = status.done.size;
  const prevues = days.length;
  const prochaine = days.find((d) => d.id === status.next) ?? null;
  const complete = prevues > 0 && status.next === null;

  return (
    <section className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-border bg-surface px-5 py-4">
      <div className="min-w-[7rem]">
        <div className="text-[0.65rem] tracking-[0.15em] text-muted uppercase">Cette semaine</div>
        <div className="font-display mt-0.5 text-4xl leading-none text-accent">
          {faites}
          <span className="text-2xl text-muted">/{prevues}</span>
        </div>
        <div className="mt-0.5 text-[0.72rem] text-muted">
          {prevues > 1 ? "séances" : "séance"}
          {serie > 1 ? ` · ${serie} semaines d'affilée` : ""}
        </div>
      </div>

      <ol className="flex gap-1.5" aria-label="Jours de la semaine">
        {LETTRES.map((lettre, i) => {
          const jour = resume?.days[i] ?? null;
          const codes = jour ? [...new Set(jour.sessions.map((s) => s.dayCode))] : [];
          const sortie = (jour?.outings.length ?? 0) > 0;
          const estAujourdhui = jour !== null && jour.date === aujourdhui;
          const futur = jour !== null && aujourdhui !== null && jour.date > aujourdhui;
          return (
            <li key={i} className={`flex w-9 flex-col items-center gap-1 ${futur ? "opacity-40" : ""}`}>
              <span className={`text-[0.65rem] ${estAujourdhui ? "font-bold text-text" : "text-muted"}`}>{lettre}</span>
              <span
                title={jour ? codes.join(" + ") || (sortie ? "Sortie" : undefined) : undefined}
                className={`flex h-7 w-9 items-center justify-center rounded-md text-[0.7rem] ${
                  codes.length
                    ? "font-display bg-accent text-accent-fg"
                    : sortie
                      ? "bg-pos-soft text-pos"
                      : "border border-border bg-surface2"
                } ${estAujourdhui ? "ring-2 ring-text/50 ring-offset-1 ring-offset-surface" : ""}`}
              >
                {codes.length ? codes.join("+") : sortie ? "●" : ""}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="ml-auto flex flex-col items-end gap-1 text-right">
        {resume && resume.outings > 0 && (
          <span className="text-[0.72rem] text-muted">
            {resume.outings > 1 ? `${resume.outings} sorties` : "1 sortie"}
            {resume.km > 0 ? ` · ${decimal(resume.km)} km` : ""}
          </span>
        )}
        {complete ? (
          <span className="text-[0.85rem] text-pos">✓ Semaine complète</span>
        ) : prochaine ? (
          <Link
            href={`/session/${prochaine.id}`}
            className="rounded-md border border-accent/60 px-3 py-1.5 text-[0.85rem] text-accent transition hover:bg-accent-soft"
          >
            Prochaine : <span className="font-display">{prochaine.code}</span> · {prochaine.title} ▸
          </Link>
        ) : null}
      </div>
    </section>
  );
}
