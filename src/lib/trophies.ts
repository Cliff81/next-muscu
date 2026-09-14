/**
 * Hauts faits gravés.
 *
 * Les paliers se déduisent de l'historique, mais un haut fait obtenu ne doit
 * plus dépendre de lui : supprimer une séance ne reprend pas une médaille. Le
 * registre garde donc, pour chaque palier franchi, la date à laquelle il l'a
 * été — et c'est lui qui fait foi.
 *
 * Il ne fait que grandir. C'est ce qui rend la synchronisation triviale : deux
 * appareils qui ont vécu des choses différentes n'ont rien à arbitrer, leur
 * union est la vérité. En cas de doute sur une date, la plus ancienne gagne :
 * un palier a été franchi une fois, pas deux.
 */

/** `ladderId:index` → date ISO du jour où le palier a été franchi. */
export type Engraved = Record<string, string>;

export const trophyKey = (ladderId: string, index: number) => `${ladderId}:${index}`;

/** Le registre est relu depuis le `localStorage` : on le contrôle. */
export function parseEngraved(valeur: unknown): Engraved | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const entrees = Object.entries(valeur as Record<string, unknown>);
  if (!entrees.every(([cle, date]) => cle.includes(":") && typeof date === "string")) return null;
  return Object.fromEntries(entrees) as Engraved;
}

/** Union de deux registres : la date la plus ancienne l'emporte. */
export function mergeEngraved(a: Engraved, b: Engraved): Engraved {
  const union: Engraved = { ...a };
  for (const [cle, date] of Object.entries(b)) {
    const connue = union[cle];
    if (connue === undefined || date < connue) union[cle] = date;
  }
  return union;
}

export function sameEngraved(a: Engraved, b: Engraved): boolean {
  const clesA = Object.keys(a);
  if (clesA.length !== Object.keys(b).length) return false;
  return clesA.every((cle) => a[cle] === b[cle]);
}

export type TrophySync = {
  /** Registre à réécrire ici, ou `null` s'il n'y a rien à changer. */
  toStore: Engraved | null;
  /** Registre à remonter, ou `null`. */
  toPush: Engraved | null;
};

/**
 * Rapproche le registre local et le registre distant.
 *
 * Une seule chose à la fois : quand l'union apporte du nouveau ici, on l'écrit
 * et on ne remonte rien. L'écriture relance le calcul, qui remontera au tour
 * suivant — sans quoi on enverrait un état déjà périmé.
 */
export function decideTrophySync(local: Engraved, remote: Engraved): TrophySync {
  const union = mergeEngraved(local, remote);
  if (!sameEngraved(union, local)) return { toStore: union, toPush: null };
  if (!sameEngraved(union, remote)) return { toStore: null, toPush: union };
  return { toStore: null, toPush: null };
}
