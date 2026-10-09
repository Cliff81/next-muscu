"use client";

import { Modal } from "@/components/Modal";
import { frenchName } from "@/lib/exerciseNames";
import type { PlannedExercise } from "@/lib/session";
import type { SetLog } from "@/lib/types";

/**
 * Correction d'un exercice pendant la séance.
 *
 * On revient sur une série déjà faite — une charge tapée de travers, une
 * répétition de plus — sans quitter le déroulé. Chaque frappe écrit dans la
 * séance : rien à enregistrer, fermer suffit. Décocher une série la remet à
 * faire ; le déroulé y reviendra une fois la série en cours terminée.
 *
 * C'est aussi là qu'on noue ou dénoue un super-set pour cette séance seule —
 * la machine voisine est libre, autant enchaîner. Le programme n'en sait
 * rien : pour la prochaine fois, le lien se pose sur la fiche du jour.
 */
export function SessionExerciseEditor({
  item,
  plan,
  letters,
  onUpdateSet,
  onLink,
  onLeave,
  onRemove,
  onClose,
}: {
  item: PlannedExercise;
  /** Toute la séance, pour proposer avec qui nouer. */
  plan: PlannedExercise[];
  letters: Map<string, string>;
  onUpdateSet: (exerciseId: string, setIndex: number, patch: Partial<SetLog>) => void;
  onLink: (otherExerciseId: string) => void;
  onLeave: () => void;
  /** Présent pour un exercice ajouté en séance : ceux du programme restent. */
  onRemove: (() => void) | null;
  onClose: () => void;
}) {
  const name = frenchName(item.exercise.name);
  const id = item.log.exerciseId;
  const partners = item.superset
    ? plan.filter((p) => p.superset === item.superset && p.log.exerciseId !== id)
    : [];
  const candidates = plan.filter(
    (p) => p.log.exerciseId !== id && (!item.superset || p.superset !== item.superset)
  );

  return (
    <Modal title={`Corriger · ${name}`} onClose={onClose}>
      <p className="mb-3 text-[0.8rem] text-muted">
        Cible : {item.exercise.reps || "—"}. Une série décochée sera reproposée après celle en cours.
      </p>
      <div className="flex max-h-[55vh] flex-col gap-1 overflow-y-auto pr-1">
        {item.log.sets.map((s) => (
          <div
            key={s.setIndex}
            className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 rounded-lg bg-surface2 px-3 py-1.5 text-[0.8rem]"
          >
            <span className="w-6 text-muted">S{s.setIndex + 1}</span>
            <input
              type="number"
              inputMode="decimal"
              step={0.5}
              min={0}
              value={s.weight ?? ""}
              placeholder="kg"
              aria-label={`Charge, ${name}, série ${s.setIndex + 1}`}
              onChange={(e) =>
                onUpdateSet(id, s.setIndex, {
                  weight: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-text focus:border-accent focus:outline-none"
            />
            <input
              type="text"
              inputMode="numeric"
              value={s.reps}
              placeholder={item.exercise.reps || "reps"}
              aria-label={`Répétitions, ${name}, série ${s.setIndex + 1}`}
              onChange={(e) => onUpdateSet(id, s.setIndex, { reps: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-text focus:border-accent focus:outline-none"
            />
            <label className="flex items-center gap-1.5 text-[0.72rem] text-muted">
              <input
                type="checkbox"
                checked={s.completed}
                onChange={(e) => onUpdateSet(id, s.setIndex, { completed: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              faite
            </label>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-surface2 px-3 py-2 text-[0.78rem]">
        <div className="text-[0.65rem] tracking-[0.1em] text-accent2 uppercase">Super-set</div>
        {item.superset ? (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted">
              Super-set {letters.get(item.superset)} avec{" "}
              <span className="text-text">
                {partners.map((p) => frenchName(p.exercise.name)).join(", ")}
              </span>
            </span>
            <button
              type="button"
              onClick={onLeave}
              className="rounded-full border border-border px-3 py-0.5 text-[0.68rem] text-muted transition hover:border-neg hover:text-neg"
            >
              Sortir du super-set
            </button>
          </div>
        ) : (
          <p className="mt-1 text-muted">Pas de super-set : les séries se suivent avec leur repos.</p>
        )}
        {candidates.length > 0 && (
          <label className="mt-2 flex flex-wrap items-center gap-2 text-muted">
            {item.superset ? "Y ajouter" : "Nouer avec"}
            <select
              value=""
              aria-label={`Nouer ${name} en super-set avec`}
              onChange={(e) => {
                if (e.target.value) onLink(e.target.value);
              }}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-text focus:border-accent focus:outline-none"
            >
              <option value="">— choisir un exercice —</option>
              {candidates.map((p) => (
                <option key={p.log.exerciseId} value={p.log.exerciseId}>
                  {frenchName(p.exercise.name)}
                  {p.superset ? ` (super-set ${letters.get(p.superset)})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-1.5 text-[0.68rem] text-muted">
          Pour cette séance seulement. Pour la prochaine fois, lie-les dans le programme.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-fg transition hover:opacity-90"
        >
          Fermer
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Retirer « ${name} » de la séance ?`)) {
                onRemove();
                onClose();
              }
            }}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:border-neg hover:text-neg"
          >
            Retirer de la séance
          </button>
        )}
      </div>
    </Modal>
  );
}
