import { hoursLabel } from "@/lib/activities";
import { decimal } from "@/lib/format";
import type { ComputedNeeds, Goal } from "@/lib/nutrition";
import type { NutritionCard } from "@/lib/types";

/**
 * Conseils déduits des besoins calculés, plutôt que des cartes figées portées
 * par le programme : celui-ci n'en contient aucune quand il a été généré, et
 * celles du programme par défaut annonçaient des grammages qui contredisaient
 * le calcul.
 */
export function nutritionAdvice(
  goal: Goal,
  needs: ComputedNeeds,
  weightKg: number,
  weeklySportMinutes: number
): NutritionCard[] {
  const parRepas = Math.round(needs.protein / 4);
  const eau = decimal(weightKg * 0.035);

  const glucides: Record<Goal, string> = {
    masse: `${needs.carbs} g par jour. Place la plus grosse part autour de la séance : c'est là qu'ils servent le plus.`,
    maintien: `${needs.carbs} g par jour. Concentre-les avant et après l'effort, allège les jours sans séance.`,
    seche: `${needs.carbs} g par jour. Garde-les autour de la séance et réduis-les le soir des jours sans entraînement.`,
  };

  const cadre: Record<Goal, string> = {
    masse: `Vise ${needs.calories} kcal par jour, soit un surplus d'environ ${needs.calories - needs.tdee} kcal. Une prise de 250 à 400 g par semaine est le bon rythme : au-delà, c'est surtout du gras.`,
    maintien: `Vise ${needs.calories} kcal par jour, au niveau de ta dépense estimée. Le poids doit rester stable à 500 g près d'une semaine à l'autre.`,
    seche: `Vise ${needs.calories} kcal par jour, soit un déficit d'environ ${needs.tdee - needs.calories} kcal. Une perte de 0,5 à 1 % du poids par semaine préserve le muscle ; plus vite, il part avec le gras.`,
  };

  const cartes: NutritionCard[] = [
    { icon: "🎯", title: "Le cadre", text: cadre[goal] },
    {
      icon: "🥩",
      title: "Protéines",
      text: `${needs.protein} g par jour, soit environ ${parRepas} g sur quatre repas. C'est ce qui protège le muscle, que tu prennes ou que tu perdes.`,
    },
    { icon: "🍚", title: "Glucides", text: glucides[goal] },
    {
      icon: "💧",
      title: "Hydratation",
      text: `Environ ${eau} L par jour au repos, à majorer les jours d'entraînement. La soif arrive après la baisse de performance.`,
    },
    {
      icon: "😴",
      title: "Sommeil",
      text: "7 à 9 heures. C'est la nuit que le muscle se répare ; un déficit de sommeil réduit la force disponible et augmente l'appétit.",
    },
  ];

  if (weeklySportMinutes > 0) {
    cartes.push({
      icon: "🏃",
      title: "Tes sports",
      text: `${hoursLabel(weeklySportMinutes)} par semaine en plus du renforcement, soit ${needs.sportBurn} kcal par jour dans le calcul. Si ces séances tombent le même jour que la musculation, mange davantage ce jour-là plutôt que de lisser la semaine.`,
    });
  } else {
    cartes.push({
      icon: "🏃",
      title: "Ajoute tes sports",
      text: "Le calcul ne compte pour l'instant que le renforcement. Déclare tes autres activités ci-dessus pour que la dépense estimée reflète ta semaine réelle.",
    });
  }

  return cartes;
}
