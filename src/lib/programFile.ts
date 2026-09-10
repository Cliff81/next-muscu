"use client";

import { parseProgramJson } from "@/lib/programSchema";
import type { Program } from "@/lib/types";

/** Télécharge le programme courant en JSON. */
export function exportProgram(program: Program): void {
  const blob = new Blob([JSON.stringify(program, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "programme-stronger.json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Lit un fichier, valide son contenu, demande confirmation, et rend le
 * programme — ou `null` si quoi que ce soit s'y oppose.
 *
 * Les échanges avec l'utilisateur passent par `confirm` et `alert`, comme le
 * reste de ce parcours : remplacer son programme est irréversible, et le
 * dialogue natif bloque jusqu'à la réponse.
 */
export async function importProgramFromFile(file: File): Promise<Program | null> {
  const raw = await file.text();
  const result = parseProgramJson(raw);
  if (!result.success) {
    window.alert(`Import impossible.\n\n${result.error}`);
    return null;
  }
  const confirmed = window.confirm(
    `Importer « ${result.program.title} ${result.program.titleAccent} » ?\n\n` +
      "Cette action remplace tout le programme actuel. Les séances déjà " +
      "enregistrées restent dans l'historique."
  );
  return confirmed ? (result.program as Program) : null;
}

/** Confirme puis signale s'il faut revenir au programme par défaut. */
export function confirmReset(): boolean {
  return window.confirm(
    "Revenir au programme par défaut ?\n\nLe programme actuel sera remplacé."
  );
}
