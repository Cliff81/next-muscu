import { z } from "zod";

const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sub: z.string().optional(),
  series: z.number().int().positive(),
  reps: z.string().min(1),
  restLabel: z.string().min(1),
  restSeconds: z.number().int().nonnegative(),
  tip: z.string().optional(),
  demo: z.string().optional(),
});

const sectionSchema = z.object({
  title: z.string().min(1),
  exercises: z.array(exerciseSchema).min(1),
});

const restInfoSchema = z.object({
  duration: z.string(),
  warmup: z.string(),
  suggestedDay: z.string(),
});

const daySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  muscleTags: z.array(z.string()),
  sections: z.array(sectionSchema).min(1),
  restInfo: restInfoSchema,
  tips: z.array(z.string()),
});

const nutritionCardSchema = z.object({
  icon: z.string(),
  title: z.string(),
  text: z.string(),
});

export const programSchema = z.object({
  tag: z.string(),
  title: z.string(),
  titleAccent: z.string(),
  subtitle: z.string(),
  statsRow: z.array(z.object({ value: z.string(), label: z.string() })),
  days: z.array(daySchema).min(1),
  nutrition: z.array(nutritionCardSchema),
});

export type ProgramParseResult =
  | { success: true; program: z.infer<typeof programSchema> }
  | { success: false; error: string };

export function parseProgramJson(raw: string): ProgramParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { success: false, error: "Le fichier n'est pas un JSON valide." };
  }
  const result = programSchema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue.path.join(".") || "racine";
    return { success: false, error: `Format invalide (${path}) : ${firstIssue.message}` };
  }
  return { success: true, program: result.data };
}
