/**
 * Fusion entrée par entrée, côté serveur.
 *
 * La même règle que `src/lib/entrySync.ts` : chaque entrée porte une date de
 * modification, la plus récente l'emporte, à date égale celle déjà en place
 * reste. Les entrées d'avant l'horodatage n'ont pas de date : elles valent
 * zéro, plus anciennes que tout. Une entrée sans clé est ignorée.
 */
export function mergeStamped(
  existing: unknown,
  incoming: unknown,
  key: string
): Record<string, unknown>[] {
  const stamp = (e: Record<string, unknown>) =>
    typeof e.updatedAt === "number" && Number.isFinite(e.updatedAt) ? e.updatedAt : 0;
  const lire = (liste: unknown): Record<string, unknown>[] =>
    Array.isArray(liste)
      ? liste.filter(
          (e): e is Record<string, unknown> =>
            typeof e === "object" && e !== null && typeof (e as Record<string, unknown>)[key] === "string"
        )
      : [];

  const parCle = new Map<string, Record<string, unknown>>();
  for (const e of lire(existing)) parCle.set(e[key] as string, e);
  for (const e of lire(incoming)) {
    const connue = parCle.get(e[key] as string);
    if (!connue || stamp(e) > stamp(connue)) parCle.set(e[key] as string, e);
  }
  return [...parCle.values()];
}
