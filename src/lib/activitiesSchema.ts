import { z } from "zod";

export const activitySchema = z.object({
  id: z.string().min(1),
  sportId: z.string().min(1),
  sessionsPerWeek: z.number().int().positive().max(21),
  minutesPerSession: z.number().int().positive().max(600),
  intensity: z.enum(["light", "moderate", "vigorous"]),
});

export const activitiesSchema = z.array(activitySchema);
