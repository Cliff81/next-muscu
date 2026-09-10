import { z } from "zod";

/**
 * Forme d'une séance réalisée.
 *
 * L'historique reçoit désormais des données venues de Convex : les valider à
 * la lecture évite qu'une ligne mal formée — format changé, écriture manuelle —
 * ne casse la page de progression sans recours dans l'interface.
 */
const setLogSchema = z.object({
  setIndex: z.number().int().nonnegative(),
  weight: z.union([z.number(), z.null()]),
  reps: z.string(),
  completed: z.boolean(),
});

const exerciseLogSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  sets: z.array(setLogSchema),
});

export const sessionLogSchema = z.object({
  id: z.string().min(1),
  dayId: z.string().min(1),
  dayCode: z.string(),
  dayTitle: z.string(),
  startedAt: z.string().min(1),
  finishedAt: z.union([z.string(), z.null()]),
  durationSeconds: z.union([z.number(), z.null()]),
  exercises: z.array(exerciseLogSchema),
});

export const historySchema = z.array(sessionLogSchema);

/** Écarte les séances illisibles au lieu de rejeter tout l'historique. */
export function parseHistory(value: unknown): z.infer<typeof historySchema> | null {
  if (!Array.isArray(value)) return null;
  const gardees = value.flatMap((entry) => {
    const r = sessionLogSchema.safeParse(entry);
    return r.success ? [r.data] : [];
  });
  return gardees;
}
