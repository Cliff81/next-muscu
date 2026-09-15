"use client";

import { useState } from "react";
import { SPORTS, sportById } from "@/lib/activities";
import { ON_FOOT, ON_WHEELS, addOuting, removeOuting, totalKm, type NewOuting } from "@/lib/outings";
import { decimal } from "@/lib/format";
import { outingsStore } from "@/lib/stores";

const SOLO = SPORTS.filter((s) => s.kind === "solo");

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function newId(): string {
  return `out-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const leJour = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  });

/**
 * Journal de sorties.
 *
 * Les sports déclarés juste au-dessus décrivent une habitude ; ce journal note
 * ce qui a réellement eu lieu. C'est lui qui donne des kilomètres à compter —
 * une habitude n'en donne aucun.
 */
export function OutingLog() {
  const outings = outingsStore.useValue();
  const [adding, setAdding] = useState(false);

  const recentes = [...outings].sort((a, b) => b.date.localeCompare(a.date));
  const pied = totalKm(outings, ON_FOOT);
  const velo = totalKm(outings, ON_WHEELS);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-accent2">Journal de sorties</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-accent/60 px-3.5 py-1.5 text-sm text-accent transition hover:bg-accent-soft"
          >
            + Noter une sortie
          </button>
        )}
      </div>
      <p className="mt-1 text-[0.8rem] text-muted">
        Une course, un tour de vélo, une rando. Les kilomètres s&apos;additionnent
        et comptent dans tes hauts faits.
      </p>

      {adding && (
        <Formulaire
          onAdd={(sortie) => {
            outingsStore.set(addOuting(outingsStore.get(), sortie));
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {(pied > 0 || velo > 0) && (
        <div className="mt-3 flex flex-wrap gap-3">
          {pied > 0 && <Total valeur={`${decimal(pied)} km`} label="À pied" />}
          {velo > 0 && <Total valeur={`${decimal(velo)} km`} label="À vélo" />}
        </div>
      )}

      {recentes.length === 0
        ? !adding && (
            <p className="mt-3 rounded-2xl bg-surface2 px-4 py-3 text-sm text-muted">
              Aucune sortie notée. Dès la première, les kilomètres commencent à
              s&apos;accumuler.
            </p>
          )
        : (
            <ul className="mt-3 flex flex-col gap-2">
              {recentes.map((sortie) => {
                const sport = sportById(sortie.sportId);
                return (
                  <li
                    key={sortie.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.9rem] font-medium">
                        {sport?.name ?? sortie.sportId}
                        {sortie.km !== null && (
                          <span className="text-accent"> · {decimal(sortie.km)} km</span>
                        )}
                      </div>
                      <div className="text-[0.75rem] text-muted">
                        {leJour(sortie.date)} · {sortie.minutes} min
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        outingsStore.set(removeOuting(outingsStore.get(), sortie.id))
                      }
                      aria-label={`Supprimer la sortie du ${leJour(sortie.date)}`}
                      title="Supprimer cette sortie"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-neg hover:text-neg"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
    </section>
  );
}

function Total({ valeur, label }: { valeur: string; label: string }) {
  return (
    <div className="rounded-2xl bg-calm-soft px-4 py-2">
      <div className="font-display text-xl leading-none text-accent">{valeur}</div>
      <div className="mt-1 text-[0.65rem] tracking-[0.15em] text-muted uppercase">{label}</div>
    </div>
  );
}

function Formulaire({
  onAdd,
  onCancel,
}: {
  onAdd: (sortie: NewOuting) => void;
  onCancel: () => void;
}) {
  const [sportId, setSportId] = useState("running");
  const [date, setDate] = useState(aujourdhui);
  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");

  const distance = Number.parseFloat(km.replace(",", "."));
  const duree = Number.parseInt(minutes, 10);
  const valide = date.length === 10 && Number.isFinite(duree) && duree > 0;

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
        <label className="flex flex-col gap-1 text-[0.7rem] tracking-[0.1em] text-muted uppercase">
          Sport
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm normal-case text-text focus:border-accent focus:outline-none"
          >
            {SOLO.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] tracking-[0.1em] text-muted uppercase">
          Jour
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] tracking-[0.1em] text-muted uppercase">
          Distance (km)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={km}
            placeholder="facultatif"
            onChange={(e) => setKm(e.target.value)}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] tracking-[0.1em] text-muted uppercase">
          Durée (min)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!valide}
          onClick={() =>
            onAdd({
              id: newId(),
              sportId,
              date,
              km: Number.isFinite(distance) && distance > 0 ? distance : null,
              minutes: duree,
            })
          }
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:text-text"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
