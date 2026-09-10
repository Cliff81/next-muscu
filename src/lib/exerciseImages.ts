/**
 * Photos de démonstration des exercices.
 *
 * free-exercise-db fournit deux images par exercice — début et fin du
 * mouvement — plutôt que des GIF. Les alterner restitue l'essentiel du geste.
 *
 * Elles ne sont pas embarquées dans le dépôt : 873 exercices × 2 photos font
 * environ 120 Mo, et le sélecteur permet de choisir n'importe lequel des 876
 * exercices — n'en embarquer qu'une partie condamnerait les autres. On les
 * sert donc depuis jsDelivr, qui met en cache le dépôt d'origine (Unlicense,
 * domaine public). Contrepartie assumée : hors ligne la modale affiche son
 * repli au lieu des photos, mais le programme lui-même reste entièrement local.
 */
const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises";

/** `Barbell_Squat/0.jpg` → URL absolue servie par le CDN. */
export function exerciseImageUrl(path: string): string {
  return `${CDN}/${path}`;
}
