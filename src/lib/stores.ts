import { defaultProgram } from "@/data/defaultProgram";
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
