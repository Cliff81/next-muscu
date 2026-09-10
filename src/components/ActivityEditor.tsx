"use client";

import { useState } from "react";
import {
  INTENSITY_LABELS,
  INTENSITY_HINTS,
  SPORTS,
  SPORT_KIND_LABELS,
  activityBurn,
  sportById,
  type Activity,
  type Intensity,
  type SportKind,
} from "@/lib/activities";
import { activitiesStore } from "@/lib/stores";

const INTENSITIES: Intensity[] = ["light", "moderate", "vigorous"];
const KINDS: SportKind[] = ["team", "solo"];

/** Un identifiant stable, sans dépendre de la disponibilité de crypto. */
function newId(): string {
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-accent bg-accent-soft font-medium text-accent"
          : "border-border2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function AddForm({ onAdd, onCancel }: { onAdd: (a: Activity) => void; onCancel: () => void }) {
  const [sportId, setSportId] = useState(SPORTS[0].id);
  const [sessionsPerWeek, setSessions] = useState(2);
  const [minutesPerSession, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState<Intensity>("moderate");

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] tracking-[0.12em] text-muted uppercase">Sport</span>
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            {KINDS.map((kind) => (
              <optgroup key={kind} label={SPORT_KIND_LABELS[kind]}>
                {SPORTS.filter((s) => s.kind === kind).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] tracking-[0.12em] text-muted uppercase">Par semaine</span>
          <input
            type="number"
            min={1}
            max={21}
            value={sessionsPerWeek}
            onChange={(e) => setSessions(Math.max(1, Number(e.target.value) || 1))}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] tracking-[0.12em] text-muted uppercase">Minutes</span>
          <input
            type="number"
            min={5}
            max={600}
            step={5}
            value={minutesPerSession}
            onChange={(e) => setMinutes(Math.max(5, Number(e.target.value) || 5))}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[0.7rem] tracking-[0.12em] text-muted uppercase">Intensité</div>
        <div className="flex flex-wrap gap-1.5">
          {INTENSITIES.map((i) => (
            <Chip
              key={i}
              active={intensity === i}
              onClick={() => setIntensity(i)}
              title={INTENSITY_HINTS[i]}
            >
              {INTENSITY_LABELS[i]}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-[0.72rem] text-muted">{INTENSITY_HINTS[intensity]}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() =>
            onAdd({ id: newId(), sportId, sessionsPerWeek, minutesPerSession, intensity })
          }
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-fg transition hover:opacity-90"
        >
          Ajouter
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

/**
 * Liste des sports pratiqués en plus du programme, et leur dépense.
 *
 * `weightKg` peut manquer : sans le poids, aucune dépense n'est calculable, et
 * on le dit plutôt que d'afficher un zéro qui passerait pour une mesure.
 */
export function ActivityEditor({ weightKg }: { weightKg: number | null }) {
  const activities = activitiesStore.useValue();
  const [adding, setAdding] = useState(false);

  const add = (activity: Activity) => {
    activitiesStore.set([...activities, activity]);
    setAdding(false);
  };
  const remove = (id: string) => {
    activitiesStore.set(activities.filter((a) => a.id !== id));
  };

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-accent2">Autres sports</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-accent/60 px-3.5 py-1.5 text-sm text-accent transition hover:bg-accent-soft"
          >
            + Ajouter une activité
          </button>
        )}
      </div>
      <p className="mt-1 text-[0.8rem] text-muted">
        Ce que tu pratiques en dehors du renforcement. Chaque activité entre dans
        la dépense estimée ci-dessus.
      </p>

      {adding && <AddForm onAdd={add} onCancel={() => setAdding(false)} />}

      {activities.length === 0 ? (
        !adding && (
          <p className="mt-3 rounded-2xl bg-surface2 px-4 py-3 text-sm text-muted">
            Aucune activité déclarée. La dépense ne compte pour l&apos;instant que
            ton programme de renforcement.
          </p>
        )
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {activities.map((activity) => {
            const sport = sportById(activity.sportId);
            const parSemaine = weightKg ? Math.round(activityBurn(activity, weightKg)) : null;
            return (
              <li
                key={activity.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[0.9rem] font-medium">{sport?.name ?? activity.sportId}</div>
                  <div className="text-[0.72rem] text-muted">
                    {activity.sessionsPerWeek} × {activity.minutesPerSession} min ·{" "}
                    {INTENSITY_LABELS[activity.intensity].toLowerCase()}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {parSemaine === null ? (
                    <span className="text-[0.72rem] text-muted">poids manquant</span>
                  ) : (
                    <>
                      <div className="font-display text-lg leading-none text-accent">
                        {parSemaine}
                      </div>
                      <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">
                        kcal/sem
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(activity.id)}
                  aria-label={`Retirer ${sport?.name ?? "cette activité"}`}
                  title="Retirer"
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-accent2 hover:text-accent2"
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
