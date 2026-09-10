# Démonstrations d'exercices

Le bouton **(i)** à côté d'un exercice affiche par défaut les **photos du
catalogue** : le début et la fin du mouvement, alternées pour suggérer le geste,
avec une vue côte à côte pour comparer les deux positions.

Ces photos viennent de [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(Unlicense, domaine public) et sont chargées depuis un CDN — voir
`src/lib/exerciseImages.ts`. Elles ne sont pas dans le dépôt : 873 exercices
× 2 photos font environ 120 Mo, et le sélecteur ⇄ permet d'aller chercher
n'importe lequel des 876 exercices.

## Déposer un GIF à la main

Ce dossier reste un repli pour les exercices que le catalogue ne couvre pas
(le cardio HIIT, par exemple). Un fichier n'est affiché que si l'exercice
**n'a pas** de photos et que son champ `demo` porte le nom du fichier.

- Le champ `demo` se règle dans `src/data/defaultProgram.ts`.
- Sans fichier ni photos, aucun bouton (i) n'apparaît — pas d'erreur.
- Formats : `.gif` de préférence (offline/PWA), sinon `.webp` animé ou `.mp4`
  en adaptant le champ `demo`.
- Poids conseillé : moins de 1–2 Mo, ~480 px de large.
