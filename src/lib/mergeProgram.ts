import { decideByTimestamp } from "@/lib/lastWrite";
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
  const decision = decideByTimestamp(
    local,
    touchedAt,
    remote === null ? null : { value: remote.program, updatedAt: remote.updatedAt }
  );
  return decision.action === "pull"
    ? { action: "pull", program: decision.value, updatedAt: decision.updatedAt }
    : decision;
}
