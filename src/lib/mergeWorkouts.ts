import type { SessionLog } from "@/lib/types";

export type WorkoutMerge = {
  /** Historique local à réécrire, ou `null` s'il n'y a rien à changer. */
  toStore: SessionLog[] | null;
  /** Séances à remonter vers Convex. */
  toPush: SessionLog[];
  /** Séances supprimées ici, à supprimer aussi là-bas. */
  toRemove: string[];
  /** Suppressions faites ailleurs, à inscrire dans le registre d'ici. */
  toForget: string[];
};

const RIEN: WorkoutMerge = { toStore: null, toPush: [], toRemove: [], toForget: [] };

/**
 * Rapproche l'historique local et l'historique distant.
 *
 * Une séance terminée ne change plus : il n'y a donc rien à arbitrer, ce qui
 * manque d'un côté est ajouté de l'autre. C'est plus sûr que la règle du
 * programme, où deux versions du même objet peuvent s'affronter.
 *
 * Une séance supprimée, elle, ne peut pas se déduire de son absence : un
 * historique sans elle est exactement ce que montre un appareil qui ne l'a
 * jamais reçue. D'où le registre des suppressions, `deleted` : sans lui, la
 * séance effacée ici redescendrait au passage suivant, remontée par la copie
 * distante.
 *
 * La fonction ne fait qu'une chose à la fois : chaque écriture locale relance
 * le calcul, qui enchaînera au tour suivant. Sans cette précaution on écrirait
 * et on enverrait dans le même passage, sur un état déjà périmé.
 */
export function mergeWorkouts(
  local: SessionLog[],
  remote: SessionLog[],
  deleted: string[] = [],
  remoteDeleted: string[] = []
): WorkoutMerge {
  const supprimees = new Set(deleted);

  // Une suppression venue d'un autre appareil s'inscrit d'abord dans le
  // registre local : c'est lui qui empêchera de la remonter à nouveau.
  const inconnues = remoteDeleted.filter((id) => !supprimees.has(id));
  if (inconnues.length) return { ...RIEN, toForget: inconnues };

  // Puis elle quitte l'historique.
  if (local.some((s) => supprimees.has(s.id))) {
    return { ...RIEN, toStore: local.filter((s) => !supprimees.has(s.id)) };
  }

  const localIds = new Set(local.map((s) => s.id));
  const remoteIds = new Set(remote.map((s) => s.id));

  const manquantes = remote.filter((s) => !localIds.has(s.id) && !supprimees.has(s.id));
  if (manquantes.length) {
    return {
      ...RIEN,
      toStore: [...local, ...manquantes].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    };
  }

  // Une séance corrigée là-bas plus récemment qu'ici descend et remplace la
  // copie locale : la seule exception à « une séance terminée ne change plus ».
  const distantes = new Map(remote.map((s) => [s.id, s]));
  const corrigees = local.filter((s) => {
    const d = distantes.get(s.id);
    return d?.editedAt !== undefined && (s.editedAt === undefined || d.editedAt > s.editedAt);
  });
  if (corrigees.length) {
    return {
      ...RIEN,
      toStore: local.map((s) => (corrigees.includes(s) ? (distantes.get(s.id) as SessionLog) : s)),
    };
  }

  return {
    toStore: null,
    toPush: local.filter((s) => {
      if (s.finishedAt === null) return false;
      if (!remoteIds.has(s.id)) return true;
      // Corrigée ici plus récemment que là-bas : la correction remonte.
      const d = distantes.get(s.id);
      return s.editedAt !== undefined && (d?.editedAt === undefined || s.editedAt > d.editedAt);
    }),
    // Supprimée ici alors qu'elle est encore listée là-bas : l'ordre n'est pas
    // passé, faute de réseau au moment du geste.
    toRemove: deleted.filter((id) => remoteIds.has(id)),
    toForget: [],
  };
}
