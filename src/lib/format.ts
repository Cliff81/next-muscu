/** Nombre à une décimale, avec la virgule française. */
export function decimal(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/** « 82,5 kg ». */
export function kilos(value: number): string {
  return `${decimal(value)} kg`;
}
