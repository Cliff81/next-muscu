"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { frenchName } from "@/lib/exerciseNames";
import { notify } from "@/lib/toast";
import type { SessionLog } from "@/lib/types";

/**
 * Correction d'une séance passée.
 *
 * Une séance terminée ne change plus — sauf pour rectifier une charge mal
 * saisie sur le moment, quand on a le souffle court. On corrige les chiffres
 * et les cases cochées ; on ne réécrit pas la séance : ni exercices ajoutés,
 * ni date déplacée. Rien n'est écrit tant qu'on n'a pas enregistré.
 */
export function SessionEditor({
  session,
  onSave,
  onClose,
}: {
  session: SessionLog;
  onSave: (log: SessionLog) => void;
  onClose: () => void;
}) {
  const [brouillon, setBrouillon] = useState<SessionLog>(session);

  const poser = (exerciseId: string, setIndex: number, patch: { weight?: string; reps?: string; completed?: boolean }) =>
    setBrouillon((log) => ({
      ...log,
      exercises: log.exercises.map((ex) =>
        ex.exerciseId !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => {
                if (s.setIndex !== setIndex) return s;
                const suivant = { ...s };
                if (patch.weight !== undefined) {
                  const n = Number.parseFloat(patch.weight.replace(",", "."));
                  suivant.weight = Number.isFinite(n) && n > 0 ? n : null;
                }
                if (patch.reps !== undefined) suivant.reps = patch.reps;
                if (patch.completed !== undefined) suivant.completed = patch.completed;
                return suivant;
              }),
            }
      ),
    }));

  const change = JSON.stringify(brouillon) !== JSON.stringify(session);

  return (
    <Modal title={`Corriger · ${session.dayCode} ${session.dayTitle}`} onClose={onClose} wide>
      <p className="mb-3 text-[0.8rem] text-muted">
        Charges, répétitions, séries cochées. La correction suit tes appareils.
      </p>
      <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
        {brouillon.exercises.map((ex) => (
          <div key={ex.exerciseId}>
            <div className="mb-1.5 text-[0.85rem] font-medium">{frenchName(ex.exerciseName)}</div>
            <div className="flex flex-col gap-1">
              {ex.sets.map((s) => (
                <div
                  key={s.setIndex}
                  className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 rounded-lg bg-surface2 px-3 py-1.5 text-[0.8rem]"
                >
                  <span className="w-6 text-muted">S{s.setIndex + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    value={s.weight ?? ""}
                    placeholder="kg"
                    aria-label={`Charge, ${frenchName(ex.exerciseName)}, série ${s.setIndex + 1}`}
                    onChange={(e) => poser(ex.exerciseId, s.setIndex, { weight: e.target.value })}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 text-text focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={s.reps}
                    placeholder="reps"
                    aria-label={`Répétitions, ${frenchName(ex.exerciseName)}, série ${s.setIndex + 1}`}
                    onChange={(e) => poser(ex.exerciseId, s.setIndex, { reps: e.target.value })}
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 text-text focus:border-accent focus:outline-none"
                  />
                  <label className="flex items-center gap-1.5 text-[0.72rem] text-muted">
                    <input
                      type="checkbox"
                      checked={s.completed}
                      onChange={(e) => poser(ex.exerciseId, s.setIndex, { completed: e.target.checked })}
                      className="accent-[var(--accent)]"
                    />
                    faite
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!change}
          onClick={() => {
            onSave(brouillon);
            notify("Séance corrigée.");
            onClose();
          }}
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enregistrer la correction
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted transition hover:text-text"
        >
          Annuler
        </button>
      </div>
    </Modal>
  );
}
