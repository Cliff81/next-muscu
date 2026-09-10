import { catalogDetails } from "@/lib/generateProgram";
import type { CatalogExercise } from "@/lib/catalog";
import type { Program } from "@/lib/types";

/**
 * Remplace un exercice du programme par un autre du catalogue.
 *
 * Le créneau garde son identifiant, ses séries, ses répétitions et son repos :
 * c'est la programmation de la séance, pas le mouvement. Seuls le mouvement et
 * sa description changent. Conserver l'identifiant garde aussi l'historique
 * rattaché au créneau — les séances déjà faites restent lisibles.
 */
export function swapExercise(
  program: Program,
  dayId: string,
  exerciseId: string,
  replacement: CatalogExercise
): Program {
  return {
    ...program,
    days: program.days.map((day) =>
      day.id !== dayId
        ? day
        : {
            ...day,
            sections: day.sections.map((section) => ({
              ...section,
              exercises: section.exercises.map((exercise) =>
                exercise.id !== exerciseId
                  ? exercise
                  : {
                      ...exercise,
                      name: replacement.name,
                      catalogId: replacement.id,
                      images: replacement.images,
                      ...catalogDetails(replacement),
                      // Le GIF local pointait sur l'ancien mouvement.
                      demo: undefined,
                    }
              ),
            })),
          }
    ),
  };
}
