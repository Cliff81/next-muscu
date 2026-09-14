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
  catalogId: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const sectionSchema = z.object({
  title: z.string().min(1),
  exercises: z.array(exerciseSchema),
  muscles: z.array(z.string()).optional(),
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
  sections: z.array(sectionSchema),
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

/** Relit un programme venu d'ailleurs — un partage, une ligne Convex. */
export function parseProgram(value: unknown): z.infer<typeof programSchema> | null {
  const result = programSchema.safeParse(value);
  return result.success ? result.data : null;
}
