import type { SessionLog } from "@/lib/types";

export type WorkoutMerge = {
  /** Historique local à réécrire, ou `null` s'il n'y a rien à changer. */
  toStore: SessionLog[] | null;
  /** Séances à remonter vers Convex. */
  toPush: SessionLog[];
};

/**
 * Rapproche l'historique local et l'historique distant.
 *
 * Une séance terminée ne change plus : il n'y a donc rien à arbitrer, ce qui
 * manque d'un côté est ajouté de l'autre. C'est plus sûr que la règle du
 * programme, où deux versions du même objet peuvent s'affronter.
 *
 * La fonction ne fait qu'une chose à la fois : quand il y a des séances à
 * descendre, elle les descend et ne remonte rien. L'écriture locale relance le
 * calcul, qui remontera au tour suivant. Sans cette précaution on écrirait et
 * on enverrait dans le même passage, sur un état déjà périmé.
 */
export function mergeWorkouts(local: SessionLog[], remote: SessionLog[]): WorkoutMerge {
  const localIds = new Set(local.map((s) => s.id));
  const remoteIds = new Set(remote.map((s) => s.id));

  const missingLocally = remote.filter((s) => !localIds.has(s.id));
  if (missingLocally.length) {
    return {
      toStore: [...local, ...missingLocally].sort((a, b) =>
        a.startedAt.localeCompare(b.startedAt)
      ),
      toPush: [],
    };
  }

  // Une séance en cours n'a pas encore de résultat à partager.
  return {
    toStore: null,
    toPush: local.filter((s) => s.finishedAt !== null && !remoteIds.has(s.id)),
  };
}
