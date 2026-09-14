import { z } from "zod";

/**
 * Réglages de la personne.
 *
 * Peu nombreux à dessein : chacun répond à une gêne rencontrée à la salle. La
 * pré-alerte, parce qu'un bip à zéro surprend quand on est encore assis ; le
 * son et la vibration séparés, parce qu'une salle bruyante et une salle
 * silencieuse n'appellent pas la même chose ; le visage sombre de Nutrition,
 * parce qu'un écran blanc dans une pièce sombre agresse.
 */

export const PRE_ALERTS = [0, 5, 10, 15] as const;
export type PreAlert = (typeof PRE_ALERTS)[number];

export type Settings = {
  /** Secondes avant la fin du repos où un premier signal part ; 0 = aucun. */
  preAlert: PreAlert;
  sound: boolean;
  vibrate: boolean;
  /** Nutrition en clair (son visage d'origine) ou en sombre. */
  nutritionTheme: "light" | "dark";
};

export const DEFAULT_SETTINGS: Settings = {
  preAlert: 0,
  sound: true,
  vibrate: true,
  nutritionTheme: "light",
};

const settingsSchema = z.object({
  preAlert: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15)]),
  sound: z.boolean(),
  vibrate: z.boolean(),
  nutritionTheme: z.union([z.literal("light"), z.literal("dark")]),
});

/**
 * Relit des réglages venus du `localStorage` ou de Convex. Partiels acceptés :
 * un réglage ajouté plus tard prend sa valeur par défaut au lieu de tout
 * invalider.
 */
export function parseSettings(value: unknown): Settings | null {
  if (typeof value !== "object" || value === null) return null;
  const r = settingsSchema.partial().safeParse(value);
  return r.success ? { ...DEFAULT_SETTINGS, ...r.data } : null;
}

export function sameSettings(a: Settings, b: Settings): boolean {
  return (
    a.preAlert === b.preAlert &&
    a.sound === b.sound &&
    a.vibrate === b.vibrate &&
    a.nutritionTheme === b.nutritionTheme
  );
}
