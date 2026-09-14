/**
 * Arbitrage local/distant par date de modification.
 *
 * La version la plus récemment modifiée gagne. Cela suppose un horodatage
 * local fiable : posé à chaque écriture locale, recalé sur l'heure du serveur
 * après chaque remontée.
 *
 * Le cas que cette règle existe pour empêcher : un appareil resté en arrière
 * qui, en s'ouvrant, renvoie sa copie périmée et efface le travail fait
 * ailleurs. C'est arrivé une fois, sur le programme.
 *
 * Elle ne convient qu'aux données qui se corrigent et se suppriment — un
 * programme, des sorties, une bibliothèque. Pour ce qui ne fait que grandir,
 * l'union est plus sûre : elle ne perd rien, et n'a rien à arbitrer.
 */

export type RemoteCopy = { value: unknown; updatedAt: number } | null;

export type SyncAction =
  | { action: "pull"; value: unknown; updatedAt: number }
  | { action: "push" }
  | { action: "none" };

export function decideByTimestamp(local: unknown, touchedAt: number, remote: RemoteCopy): SyncAction {
  if (remote === null) {
    // Rien là-bas : on envoie, sauf si rien n'a jamais été modifié ici.
    return touchedAt > 0 ? { action: "push" } : { action: "none" };
  }
  if (remote.updatedAt > touchedAt) {
    return { action: "pull", value: remote.value, updatedAt: remote.updatedAt };
  }
  if (touchedAt > remote.updatedAt && JSON.stringify(remote.value) !== JSON.stringify(local)) {
    return { action: "push" };
  }
  return { action: "none" };
}
