/**
 * Sorties enregistrées : une course, un tour de vélo, une rando.
 *
 * Les sports déclarés dans Nutrition décrivent une habitude — « deux fois par
 * semaine, quarante-cinq minutes ». Cela suffit à estimer une dépense, pas à
 * compter des kilomètres : une habitude ne dit pas ce qui a été fait. D'où ce
 * journal, qui note ce qui a réellement eu lieu.
 *
 * Chaque sortie porte sa date de modification et se synchronise pour son
 * compte — voir `entrySync`. Une sortie supprimée reste dans le journal,
 * marquée : c'est ce qui permet à la suppression de suivre les appareils. Les
 * fonctions d'affichage ne voient que les sorties vivantes.
 */

import { decideEntrySync, live, readStamp, type EntrySync, type Stamped } from "@/lib/entrySync";

export type Outing = Stamped & {
  id: string;
  /** Identifiant dans `SPORTS`. */
  sportId: string;
  /** Jour de la sortie, `AAAA-MM-JJ`. */
  date: string;
  /** Distance parcourue, si elle a un sens pour ce sport. */
  km: number | null;
  minutes: number;
};

/** Une sortie telle qu'on la saisit : le journal la date lui-même. */
export type NewOuting = Omit<Outing, keyof Stamped>;

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
    const sortie: Outing = { id: o.id, sportId: o.sportId, date: o.date, km, minutes, updatedAt: readStamp(o.updatedAt) };
    if (typeof o.deletedAt === "number" && Number.isFinite(o.deletedAt)) sortie.deletedAt = o.deletedAt;
    return [sortie];
  });
  return sortOutings(gardees);
}

const parDate = (a: Outing, b: Outing) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

export function sortOutings(list: Outing[]): Outing[] {
  return [...list].sort(parDate);
}

/** Les sorties à montrer : sans les supprimées. */
export const liveOutings: (list: Outing[]) => Outing[] = live;

/** Ajoute ou remplace une sortie, datée de l'instant. */
export function addOuting(list: Outing[], outing: NewOuting, now: number = Date.now()): Outing[] {
  const { id, sportId, date, km, minutes } = outing;
  return sortOutings([...list.filter((o) => o.id !== id), { id, sportId, date, km, minutes, updatedAt: now }]);
}

/** Marque une sortie supprimée ; sans effet sur une inconnue. */
export function removeOuting(list: Outing[], id: string, now: number = Date.now()): Outing[] {
  return list.map((o) => (o.id === id && o.deletedAt === undefined ? { ...o, deletedAt: now, updatedAt: now } : o));
}

/** Kilomètres cumulés, éventuellement restreints à une famille de sports. */
export function totalKm(list: Outing[], sportIds?: string[]): number {
  return live(list)
    .filter((o) => (sportIds ? sportIds.includes(o.sportId) : true))
    .reduce((total, o) => total + (o.km ?? 0), 0);
}

/** Fusion entrée par entrée avec le journal distant — voir `entrySync`. */
export function decideOutingsSync(local: Outing[], remote: Outing[]): EntrySync<Outing> {
  const { toStore, toPush } = decideEntrySync(local, remote, (o) => o.id);
  return { toStore: toStore ? sortOutings(toStore) : null, toPush };
}
