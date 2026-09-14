"use client";

/**
 * Bibliothèque de programmes conservés.
 *
 * Relancer l'assistant remplaçait le programme en cours sans retour possible :
 * un programme construit et ajusté pendant des semaines disparaissait pour
 * essayer autre chose. Il est désormais mis de côté avant d'être remplacé, et
 * peut être repris.
 *
 * Volontairement local pour l'instant : la table Convex ne porte qu'un
 * programme actif par personne, et en ajouter une seconde pour l'archive est un
 * travail à part. La conséquence est dite à l'écran — cette bibliothèque ne
 * suit pas d'un appareil à l'autre.
 */
import { createLocalStore } from "@/lib/createLocalStore";
import { programSchema } from "@/lib/programSchema";
import type { Program } from "@/lib/types";
import { z } from "zod";

export type SavedProgram = {
  id: string;
  name: string;
  /** Date d'archivage, en ISO. */
  savedAt: string;
  program: Program;
};

const savedSchema = z.array(
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    savedAt: z.string().min(1),
    program: programSchema,
  })
);

/** Au-delà, les plus anciens cèdent : une archive sans fin n'est plus une archive. */
const MAX = 10;

export const libraryStore = createLocalStore<SavedProgram[]>("muscu:library", [], (value) => {
  const r = savedSchema.safeParse(value);
  return r.success ? (r.data as SavedProgram[]) : null;
});

/** Nom lisible, déduit du programme lui-même. */
export function defaultName(program: Program): string {
  const jours = program.days.length;
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
  return `${program.title} · ${jours} jour${jours > 1 ? "s" : ""} — ${date}`;
}

/**
 * Met un programme de côté. Sans effet s'il y est déjà à l'identique : relancer
 * l'assistant trois fois de suite n'a pas à produire trois copies du même.
 */
export function archiveProgram(program: Program, name?: string): void {
  const current = libraryStore.get();
  const signature = JSON.stringify(program);
  if (current.some((s) => JSON.stringify(s.program) === signature)) return;

  const entry: SavedProgram = {
    id: `prog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name?.trim() || defaultName(program),
    savedAt: new Date().toISOString(),
    program,
  };
  libraryStore.set([entry, ...current].slice(0, MAX));
}

export function removeSaved(id: string): void {
  libraryStore.set(libraryStore.get().filter((s) => s.id !== id));
}

export function renameSaved(id: string, name: string): void {
  libraryStore.set(
    libraryStore.get().map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s))
  );
}
