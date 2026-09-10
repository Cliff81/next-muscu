export type LoadLevel = "heavy" | "moderate" | "light";

export const LOAD_LABELS: Record<LoadLevel, string> = {
  heavy: "charge lourde",
  moderate: "charge modérée",
  light: "charge légère",
};

/** Remplissage de la jauge, de bas en haut. */
export const LOAD_FILL: Record<LoadLevel, number> = {
  heavy: 1,
  moderate: 0.6,
  light: 0.28,
};

/**
 * Charge relative déduite de la fourchette de répétitions.
 *
 * C'est le nombre de répétitions qui fixe l'intensité — un exercice tenu sur
 * 8 répétitions se fait près du maximum, sur 20 il s'en éloigne — et non le
 * nom du mouvement. Les bornes sont posées sur ce que contiennent les
 * programmes : jusqu'à 10 répétitions on est dans le lourd, à partir de 15
 * dans le travail long.
 *
 * Renvoie `null` quand les répétitions sont une durée (gainage, cardio) : là
 * il n'y a pas de charge à situer.
 */
export function loadLevel(reps: string): LoadLevel | null {
  if (/\d\s*(s|sec|secondes?|min|minutes?)\b/i.test(reps)) return null;
  const numbers = reps.match(/\d+/g)?.map(Number);
  if (!numbers?.length) return null;
  const middle = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  if (middle <= 10) return "heavy";
  if (middle < 15) return "moderate";
  return "light";
}
