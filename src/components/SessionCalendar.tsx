"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sportById } from "@/lib/activities";
import {
  calendarWeeks,
  countSessions,
  dayKey,
  monthLabels,
  weeklyStreak,
  weeksToShow,
  type DayCell,
} from "@/lib/calendar";
import { decimal } from "@/lib/format";
import { formatDuration, sessionProgress } from "@/lib/session";
import { outingsStore } from "@/lib/stores";
import type { SessionLog } from "@/lib/types";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** Étiquettes des lignes : une sur deux suffit à se repérer. */
const JOURS: Record<number, string> = { 0: "lun", 2: "mer", 4: "ven" };

const CASE = 12;
const ECART = 3;

const leJourLong = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

function describe(cell: DayCell): string {
  const parts = [
    ...cell.sessions.map(
      (s) =>
        `${s.dayCode} · ${s.dayTitle}${s.durationSeconds != null ? ` (${formatDuration(s.durationSeconds)})` : ""}`
    ),
    ...cell.outings.map(
      (o) => `${sportById(o.sportId)?.name ?? o.sportId}${o.km !== null ? ` ${decimal(o.km)} km` : ""}`
    ),
  ];
  return parts.length ? parts.join(", ") : "rien";
}

/**
 * Le calendrier des séances : une colonne par semaine, la courante à droite.
 *
 * Une case pleine par séance de musculation, une case verte par sortie, les
 * deux quand la journée a été double. Le geste principal, c'est de voir les
 * trous ; le second, de toucher une case pour se rappeler ce qu'on y a fait.
 */
export function SessionCalendar({ history }: { history: SessionLog[] }) {
  const outings = outingsStore.useValue();
  const [selected, setSelected] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const weeks = useMemo(
    () => calendarWeeks(history, outings, weeksToShow(history)),
    [history, outings]
  );
  const labels = useMemo(() => monthLabels(weeks), [weeks]);
  const total = countSessions(weeks);
  const serie = useMemo(() => weeklyStreak(history), [history]);
  // Le serveur n'a pas d'historique et ne rend jamais cette grille : la date
  // du jour, lue au rendu, n'a rien à faire coïncider avec lui.
  const aujourdhui = dayKey(new Date());

  // La semaine en cours est à droite : c'est là qu'on ouvre.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length]);

  const selection = selected ? weeks.flat().find((c) => c.date === selected) ?? null : null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-accent2">Calendrier</h2>
        <span className="text-[0.8rem] text-muted">
          <span className="font-display text-lg text-accent">{total}</span>{" "}
          {total > 1 ? "séances" : "séance"} sur {weeks.length} semaines
          {serie > 1 && (
            <>
              {" · "}
              <span className="font-display text-lg text-accent">{serie}</span>
              {" semaines d'affilée"}
            </>
          )}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div ref={scroller} className="overflow-x-auto pb-1">
          <div
            className="grid"
            style={{
              gap: ECART,
              gridTemplateColumns: `1.7rem repeat(${weeks.length}, ${CASE}px)`,
              gridAutoRows: `${CASE}px`,
            }}
          >
            {labels.map((l) => (
              <div
                key={`${l.year}-${l.month}`}
                style={{ gridColumn: l.index + 2, gridRow: 1 }}
                className="text-[0.6rem] leading-[12px] whitespace-nowrap text-muted"
              >
                {MOIS[l.month]}
              </div>
            ))}
            {Object.entries(JOURS).map(([ligne, nom]) => (
              <div
                key={nom}
                style={{ gridColumn: 1, gridRow: Number(ligne) + 2 }}
                className="sticky left-0 bg-surface pr-1 text-[0.6rem] leading-[12px] text-muted"
              >
                {nom}
              </div>
            ))}
            {weeks.map((semaine, s) =>
              semaine.map((cell, j) => {
                const seances = cell.sessions.length > 0;
                const sorties = cell.outings.length > 0;
                const futur = cell.date > aujourdhui;
                const couleur = seances
                  ? sorties
                    ? "bg-accent ring-2 ring-pos ring-inset"
                    : "bg-accent"
                  : sorties
                    ? "bg-pos"
                    : "bg-surface2";
                // Un contour pour le jour choisi et pour aujourd'hui seulement :
                // posé sur toutes les cases pleines, il les cernait de blanc.
                const contour =
                  cell.date === selected
                    ? " outline outline-2 outline-accent2"
                    : cell.date === aujourdhui
                      ? " outline outline-1 outline-text/60"
                      : "";
                const classes = `rounded-[3px] outline-offset-1 ${couleur}${contour}${futur ? " opacity-30" : ""}`;
                const style = { gridColumn: s + 2, gridRow: j + 2 };
                const titre = `${leJourLong(cell.date)} : ${describe(cell)}`;
                return seances || sorties ? (
                  <button
                    key={cell.date}
                    type="button"
                    style={style}
                    title={titre}
                    aria-label={titre}
                    aria-pressed={cell.date === selected}
                    onClick={() => setSelected(cell.date === selected ? null : cell.date)}
                    className={`${classes} transition hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
                  />
                ) : (
                  <div key={cell.date} style={style} title={titre} className={classes} />
                );
              })
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-accent" /> musculation
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-pos" /> sortie
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-accent ring-1 ring-pos ring-inset" /> les deux
          </span>
          <span className="ml-auto">Touche une case pour le détail.</span>
        </div>

        {selection && (
          <div className="mt-3 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-[0.8rem]">
            <div className="text-muted capitalize">{leJourLong(selection.date)}</div>
            <ul className="mt-1 flex flex-col gap-0.5">
              {selection.sessions.map((s) => {
                const p = sessionProgress(s);
                return (
                  <li key={s.id}>
                    <span className="text-accent">{s.dayCode}</span> · {s.dayTitle}
                    <span className="text-muted">
                      {" — "}
                      {p.done}/{p.total} séries
                      {s.durationSeconds != null ? ` · ${formatDuration(s.durationSeconds)}` : ""}
                    </span>
                  </li>
                );
              })}
              {selection.outings.map((o) => (
                <li key={o.id}>
                  <span className="text-pos">{sportById(o.sportId)?.name ?? o.sportId}</span>
                  <span className="text-muted">
                    {o.km !== null ? ` · ${decimal(o.km)} km` : ""}
                    {o.minutes > 0 ? ` · ${o.minutes} min` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
