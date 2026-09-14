import type { Program } from "@/lib/types";

export type RemoteProgram = { program: unknown; updatedAt: number } | null;

export type ProgramSyncDecision =
  | { action: "pull"; program: unknown; updatedAt: number }
  | { action: "push" }
  | { action: "none" };

/**
 * Qui, du local ou du distant, fait foi.
 *
 * La version la plus récemment modifiée gagne. Cela suppose un horodatage local
 * fiable — d'où `programTouchedAt`, posé à chaque écriture locale et recalé sur
 * l'heure du serveur après chaque remontée.
 *
 * Le cas que cette fonction existe pour empêcher : un appareil resté en arrière
 * qui, en s'ouvrant, renvoie sa copie périmée et efface le travail fait
 * ailleurs. C'est ce que faisait la version précédente, qui remontait dès que
 * les deux versions différaient sans jamais regarder les dates.
 */
export function decideProgramSync(
  local: Program,
  touchedAt: number,
  remote: RemoteProgram
): ProgramSyncDecision {
  if (remote === null) {
    // Rien là-bas : on envoie, sauf si rien n'a jamais été modifié ici.
    return touchedAt > 0 ? { action: "push" } : { action: "none" };
  }
  if (remote.updatedAt > touchedAt) {
    return { action: "pull", program: remote.program, updatedAt: remote.updatedAt };
  }
  if (touchedAt > remote.updatedAt && JSON.stringify(remote.program) !== JSON.stringify(local)) {
    return { action: "push" };
  }
  return { action: "none" };
}
