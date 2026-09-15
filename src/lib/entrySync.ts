/**
 * Fusion entrée par entrée.
 *
 * L'arbitrage global de `lastWrite` compare deux listes entières : la plus
 * récemment modifiée gagne, l'autre disparaît. Pour un journal — des sorties,
 * des pesées —, c'est trop brutal : une sortie notée ici et une pesée notée
 * là-bas, le même soir, ne sont pas en conflit, et pourtant l'une des deux
 * s'effaçait.
 *
 * Ici chaque entrée porte sa propre date de modification, et c'est entre deux
 * versions d'**une même entrée** que la plus récente l'emporte. Une entrée
 * supprimée ne disparaît pas : elle reste, marquée, pour que la suppression
 * voyage — une absence ne saurait pas dire qu'elle est voulue. À date égale,
 * la base est conservée ; l'ordre des arguments est le même partout, et le
 * serveur applique la même règle, si bien que tous les côtés convergent.
 */

export type Stamped = {
  /** Date de la dernière modification, en millisecondes depuis l'époque. */
  updatedAt: number;
  /** Date de suppression : l'entrée est une pierre tombale. */
  deletedAt?: number;
};

/** Ce qui s'affiche : les entrées non supprimées. */
export function live<T extends Stamped>(list: T[]): T[] {
  return list.filter((e) => e.deletedAt === undefined);
}

/** Forme canonique, clés triées : l'ordre des clés ne fait pas une différence. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v
  );
}

/**
 * Union de deux listes : la version la plus récente de chaque entrée l'emporte,
 * à date égale celle de la base. L'ordre de la base est conservé, les entrées
 * nouvelles viennent à la suite — à l'appelant de trier.
 */
export function mergeEntries<T extends Stamped>(base: T[], incoming: T[], keyOf: (e: T) => string): T[] {
  const parCle = new Map<string, T>(base.map((e) => [keyOf(e), e]));
  for (const e of incoming) {
    const cle = keyOf(e);
    const connue = parCle.get(cle);
    if (!connue || e.updatedAt > connue.updatedAt) parCle.set(cle, e);
  }
  return [...parCle.values()];
}

/** Mêmes entrées, à l'ordre près. */
export function sameEntries<T extends Stamped>(a: T[], b: T[], keyOf: (e: T) => string): boolean {
  if (a.length !== b.length) return false;
  const parCle = new Map(b.map((e) => [keyOf(e), canonical(e)]));
  return a.every((e) => parCle.get(keyOf(e)) === canonical(e));
}

export type EntrySync<T> = {
  /** Liste à réécrire ici, ou `null` s'il n'y a rien à changer. */
  toStore: T[] | null;
  /** Entrées à remonter — celles qui sont plus récentes ici —, ou `null`. */
  toPush: T[] | null;
};

/**
 * Rapproche la liste locale et la liste distante.
 *
 * Une seule chose à la fois, comme pour les notes : si l'union change quelque
 * chose ici, on l'écrit et on ne remonte rien ; l'écriture relance le calcul,
 * qui remontera au tour suivant ce qui est plus récent ici. Le distant fait
 * foi à date égale, donc après ce premier tour toute égalité est une identité.
 */
export function decideEntrySync<T extends Stamped>(local: T[], remote: T[], keyOf: (e: T) => string): EntrySync<T> {
  const union = mergeEntries(remote, local, keyOf);
  if (!sameEntries(union, local, keyOf)) return { toStore: union, toPush: null };
  const distantes = new Map(remote.map((e) => [keyOf(e), e]));
  const toPush = local.filter((e) => {
    const r = distantes.get(keyOf(e));
    return !r || e.updatedAt > r.updatedAt;
  });
  return { toStore: null, toPush: toPush.length ? toPush : null };
}

/** Relecture d'une date de modification : absente sur les anciennes entrées. */
export function readStamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}
