import type { CatalogExercise } from "@/lib/catalog";
import type { Program } from "@/lib/types";

/**
 * Reprise des programmes déjà enregistrés.
 *
 * Un programme vit dans le `localStorage` et dans Convex : corriger le
 * générateur ne répare pas ce qui a déjà été produit. Ces deux fonctions
 * rattrapent l'existant à la lecture, et sont écrites pour être sans effet sur
 * un programme déjà sain — elles peuvent donc tourner à chaque chargement.
 */

/** Chaînes abîmées par le renommage en anglais, telles qu'elles ont été enregistrées. */
const DAMAGED_STRINGS: [string, string][] = [
  ["isCompound", "polyarticulaire"],
  ["Enchaîne les exercises", "Enchaîne les exercices"],
];

function repairText(text: string): string {
  return DAMAGED_STRINGS.reduce((out, [from, to]) => out.split(from).join(to), text);
}

/** Répare les textes enregistrés. Synchrone : ne demande pas le catalogue. */
export function repairStrings(program: Program): Program {
  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      tips: day.tips.map(repairText),
      sections: day.sections.map((section) => ({
        ...section,
        exercises: section.exercises.map((exercise) => ({
          ...exercise,
          sub: exercise.sub === undefined ? undefined : repairText(exercise.sub),
          tip: exercise.tip === undefined ? undefined : repairText(exercise.tip),
        })),
      })),
    })),
  };
}

/**
 * Rattache au catalogue les programmes générés avant que l'identité catalogue
 * y soit portée : sans elle, pas de photos, et le sélecteur d'exercices ne sait
 * pas sur quel groupe musculaire filtrer. Le rapprochement se fait par nom
 * exact — les programmes générés reprennent les intitulés du catalogue tels
 * quels, donc aucune approximation n'est nécessaire.
 */
export function enrichWithCatalog(program: Program, catalog: CatalogExercise[]): Program {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const byName = new Map(catalog.map((e) => [e.name, e]));

  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      sections: day.sections.map((section) => {
        const exercises = section.exercises.map((exercise) => {
          const entry =
            (exercise.catalogId ? byId.get(exercise.catalogId) : undefined) ??
            byName.get(exercise.name);
          if (!entry) return exercise;
          return {
            ...exercise,
            catalogId: exercise.catalogId ?? entry.id,
            images: exercise.images?.length ? exercise.images : entry.images,
          };
        });

        if (section.muscles?.length) return { ...section, exercises };

        // À défaut de muscles enregistrés, on les déduit des exercices en place.
        const muscles = [
          ...new Set(
            exercises.flatMap((exercise) => {
              const entry = exercise.catalogId ? byId.get(exercise.catalogId) : undefined;
              return entry ? entry.muscles : [];
            })
          ),
        ];
        return muscles.length ? { ...section, exercises, muscles } : { ...section, exercises };
      }),
    })),
  };
}
