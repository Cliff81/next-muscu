/**
 * Sorties enregistrées : une course, un tour de vélo, une rando.
 *
 * Les sports déclarés dans Nutrition décrivent une habitude — « deux fois par
 * semaine, quarante-cinq minutes ». Cela suffit à estimer une dépense, pas à
 * compter des kilomètres : une habitude ne dit pas ce qui a été fait. D'où ce
 * journal, qui note ce qui a réellement eu lieu.
 */

export type Outing = {
  id: string;
  /** Identifiant dans `SPORTS`. */
  sportId: string;
  /** Jour de la sortie, `AAAA-MM-JJ`. */
  date: string;
  /** Distance parcourue, si elle a un sens pour ce sport. */
  km: number | null;
  minutes: number;
};

/** Sports comptés comme des kilomètres à pied. */
export const ON_FOOT = ["running", "walking", "hiking"];
/** Sports comptés comme des kilomètres à vélo. */
export const ON_WHEELS = ["cycling"];

export function parseOutings(valeur: unknown): Outing[] | null {
  if (!Array.isArray(valeur)) return null;
  const gardees = valeur.flatMap((entree) => {
    if (typeof entree !== "object" || entree === null) return [];
    const o = entree as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.sportId !== "string") return [];
    if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return [];
    const km = typeof o.km === "number" && Number.isFinite(o.km) && o.km >= 0 ? o.km : null;
    const minutes = typeof o.minutes === "number" && o.minutes > 0 ? o.minutes : 0;
    return [{ id: o.id, sportId: o.sportId, date: o.date, km, minutes }];
  });
  return gardees;
}

const parDate = (a: Outing, b: Outing) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

export function addOuting(list: Outing[], outing: Outing): Outing[] {
  return [...list.filter((o) => o.id !== outing.id), outing].sort(parDate);
}

export function removeOuting(list: Outing[], id: string): Outing[] {
  return list.filter((o) => o.id !== id);
}

/** Kilomètres cumulés, éventuellement restreints à une famille de sports. */
export function totalKm(list: Outing[], sportIds?: string[]): number {
  return list
    .filter((o) => (sportIds ? sportIds.includes(o.sportId) : true))
    .reduce((total, o) => total + (o.km ?? 0), 0);
}

export type RemoteOutings = { outings: unknown; updatedAt: number } | null;

export type OutingsSyncDecision =
  | { action: "pull"; outings: unknown; updatedAt: number }
  | { action: "push" }
  | { action: "none" };

/**
 * Qui, du local ou du distant, fait foi — même règle que pour le programme :
 * la version la plus récemment modifiée gagne. Une sortie se corrige et se
 * supprime, donc l'union ne suffirait pas : il faut un arbitrage par date.
 */
export function decideOutingsSync(
  local: Outing[],
  touchedAt: number,
  remote: RemoteOutings
): OutingsSyncDecision {
  if (remote === null) return touchedAt > 0 ? { action: "push" } : { action: "none" };
  if (remote.updatedAt > touchedAt) {
    return { action: "pull", outings: remote.outings, updatedAt: remote.updatedAt };
  }
  if (touchedAt > remote.updatedAt && JSON.stringify(remote.outings) !== JSON.stringify(local)) {
    return { action: "push" };
  }
  return { action: "none" };
}
