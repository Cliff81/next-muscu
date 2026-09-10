import { defaultProgram } from "@/data/defaultProgram";
import { activitiesSchema } from "@/lib/activitiesSchema";
import { NEAT_LEVELS, type Activity, type NeatLevel } from "@/lib/activities";
import { createLocalStore } from "@/lib/createLocalStore";
import { programSchema } from "@/lib/programSchema";
import { repairStrings } from "@/lib/repairProgram";
import type { Program, SessionLog } from "@/lib/types";

export const programStore = createLocalStore<Program>(
  "muscu:program",
  defaultProgram,
  (valeur) => {
    const r = programSchema.safeParse(valeur);
    return r.success ? repairStrings(r.data as Program) : null;
  }
);
export const historyStore = createLocalStore<SessionLog[]>("muscu:history", []);
export const activeSessionStore = createLocalStore<SessionLog | null>("muscu:activeSession", null);

/** Sports pratiqués en plus du programme, saisis par la personne. */
export const activitiesStore = createLocalStore<Activity[]>("muscu:activities", [], (value) => {
  const r = activitiesSchema.safeParse(value);
  return r.success ? (r.data as Activity[]) : null;
});

/** Niveau d'activité de la vie courante, hors sport. */
export const neatStore = createLocalStore<NeatLevel>("muscu:neat", "sedentary", (value) =>
  NEAT_LEVELS.some((l) => l.id === value) ? (value as NeatLevel) : null
);
