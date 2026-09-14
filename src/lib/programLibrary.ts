"use client";

/**
 * Bibliothèque de programmes conservés.
 *
 * Relancer l'assistant remplaçait le programme en cours sans retour possible :
 * un programme construit et ajusté pendant des semaines disparaissait pour
 * essayer autre chose. Il est désormais mis de côté avant d'être remplacé, et
 * peut être repris.
 *
 * Elle suit d'un appareil à l'autre, dans sa propre table Convex : la table des
 * programmes ne porte que celui qui est actif. L'arbitrage est celui du
 * programme — la version la plus récemment modifiée gagne — car un programme
 * gardé se renomme et se supprime, ce que l'union ne saurait pas propager.
 */
import { createLocalStore } from "@/lib/createLocalStore";
import { decideByTimestamp } from "@/lib/lastWrite";
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

/** Écarte les entrées illisibles au lieu de rejeter toute la bibliothèque. */
export function parseLibrary(value: unknown): SavedProgram[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((entry) => {
    const r = savedSchema.element.safeParse(entry);
    return r.success ? [r.data as SavedProgram] : [];
  });
}

export const libraryStore = createLocalStore<SavedProgram[]>("muscu:library", [], parseLibrary);

export const libraryTouchedAt = createLocalStore<number>("muscu:libraryTouchedAt", 0);

/**
 * Toute écriture locale horodate la bibliothèque : c'est cet horodatage que
 * l'arbitrage compare à celui du serveur.
 */
function write(list: SavedProgram[]): void {
  libraryStore.set(list);
  libraryTouchedAt.set(Date.now());
}

/** Écriture venue de Convex : ce n'est pas une modification locale. */
export function setLibraryFromRemote(list: SavedProgram[], updatedAt: number): void {
  libraryStore.set(list);
  libraryTouchedAt.set(updatedAt);
}

/** Après une remontée réussie : on se cale sur l'heure du serveur. */
export function markLibrarySynced(updatedAt: number): void {
  libraryTouchedAt.set(updatedAt);
}

export type RemoteLibrary = { entries: unknown; updatedAt: number } | null;

export type LibrarySyncDecision =
  | { action: "pull"; entries: unknown; updatedAt: number }
  | { action: "push" }
  | { action: "none" };

export function decideLibrarySync(
  local: SavedProgram[],
  touchedAt: number,
  remote: RemoteLibrary
): LibrarySyncDecision {
  const decision = decideByTimestamp(
    local,
    touchedAt,
    remote === null ? null : { value: remote.entries, updatedAt: remote.updatedAt }
  );
  return decision.action === "pull"
    ? { action: "pull", entries: decision.value, updatedAt: decision.updatedAt }
    : decision;
}

/** Nom lisible, déduit du programme lui-même. */
export function defaultName(program: Program): string {
  const jours = program.days.length;
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
  return `${program.title} · ${jours} jour${jours > 1 ? "s" : ""} — ${date}`;
}

/**
 * Met un programme de côté. Sans effet s'il y est déjà à l'identique : relancer
 * l'assistant trois fois de suite n'a pas à produire trois copies du même.
 *
 * Rend `false` dans ce cas, pour que l'appelant puisse le dire plutôt que de
 * laisser croire à un enregistrement.
 */
export function archiveProgram(program: Program, name?: string): boolean {
  const current = libraryStore.get();
  const signature = JSON.stringify(program);
  if (current.some((s) => JSON.stringify(s.program) === signature)) return false;

  const entry: SavedProgram = {
    id: `prog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name?.trim() || defaultName(program),
    savedAt: new Date().toISOString(),
    program,
  };
  write([entry, ...current].slice(0, MAX));
  return true;
}

export function removeSaved(id: string): void {
  write(libraryStore.get().filter((s) => s.id !== id));
}

export function renameSaved(id: string, name: string): void {
  write(libraryStore.get().map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)));
}
