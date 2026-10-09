/**
 * Super-sets : deux exercices ou plus enchaînés sans repos, série après
 * série, le repos ne venant qu'à la fin du tour.
 *
 * Un super-set est une clé partagée par ses membres (`superset`). La même
 * règle sert au programme — sur les fiches d'exercices — et à la séance en
 * cours — sur les lignes du journal : d'où ces fonctions génériques, qui ne
 * connaissent des éléments que leur identifiant et leur clé.
 */

export type Grouped = { superset?: string };

/** Une clé de super-set que personne ne porte encore. */
export function freshSupersetKey(items: Grouped[]): string {
  const used = new Set(items.map((i) => i.superset).filter(Boolean));
  for (let n = 1; n < 1000; n++) {
    if (!used.has(`ss-${n}`)) return `ss-${n}`;
  }
  return `ss-${Date.now().toString(36)}`;
}

/** Retire la clé des éléments qui n'ont plus personne avec qui la partager. */
function dissolveSingletons<T extends Grouped>(items: T[]): T[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.superset) counts.set(item.superset, (counts.get(item.superset) ?? 0) + 1);
  }
  return items.map((item) =>
    item.superset && (counts.get(item.superset) ?? 0) < 2 ? withKey(item, undefined) : item
  );
}

function withKey<T extends Grouped>(item: T, key: string | undefined): T {
  const next = { ...item, superset: key };
  if (key === undefined) delete next.superset;
  return next;
}

/**
 * Lie deux éléments. Si l'un des deux est déjà dans un super-set, l'autre le
 * rejoint ; si les deux le sont, les deux groupes n'en font plus qu'un.
 */
export function linkSuperset<T extends Grouped>(
  items: T[],
  idOf: (item: T) => string,
  idA: string,
  idB: string
): T[] {
  const a = items.find((i) => idOf(i) === idA);
  const b = items.find((i) => idOf(i) === idB);
  if (!a || !b || idA === idB) return items;
  const key = a.superset ?? b.superset ?? freshSupersetKey(items);
  const merged = new Set([a.superset, b.superset].filter(Boolean));
  return items.map((item) =>
    idOf(item) === idA || idOf(item) === idB || (item.superset && merged.has(item.superset))
      ? withKey(item, key)
      : item
  );
}

/**
 * Coupe un super-set juste avant un élément : lui et les membres qui le
 * suivent forment un groupe à part, ceux d'avant gardent le leur. Un groupe
 * réduit à un seul membre se dissout.
 */
export function splitSupersetBefore<T extends Grouped>(
  items: T[],
  idOf: (item: T) => string,
  id: string
): T[] {
  const at = items.findIndex((i) => idOf(i) === id);
  const key = at === -1 ? undefined : items[at].superset;
  if (!key) return items;
  const fresh = freshSupersetKey(items);
  return dissolveSingletons(
    items.map((item, index) => (item.superset === key && index >= at ? withKey(item, fresh) : item))
  );
}

/** Sort un élément de son super-set, quel que soit son rang. */
export function leaveSuperset<T extends Grouped>(items: T[], idOf: (item: T) => string, id: string): T[] {
  return dissolveSingletons(items.map((item) => (idOf(item) === id ? withKey(item, undefined) : item)));
}

/**
 * La lettre de chaque super-set, dans l'ordre d'apparition : A, B, C… C'est
 * ainsi qu'on les nomme à l'écran, les clés n'étant pas faites pour être lues.
 */
export function supersetLetters(items: Grouped[]): Map<string, string> {
  const letters = new Map<string, string>();
  for (const item of items) {
    if (item.superset && !letters.has(item.superset)) {
      letters.set(item.superset, String.fromCharCode(65 + letters.size));
    }
  }
  return letters;
}
