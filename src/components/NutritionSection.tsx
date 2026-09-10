import type { NutritionCard } from "@/lib/types";

export function NutritionSection({ cards }: { cards: NutritionCard[] }) {
  // Sans carte, pas de titre orphelin : c'est ce que donnait un programme
  // généré, dont la liste de conseils est vide.
  if (!cards.length) return null;

  return (
    <div className="mx-auto mt-12 w-full max-w-[900px] px-8 pb-16">
      <h3 className="font-display mb-4 text-3xl text-accent2">Nutrition &amp; Récupération</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-2 text-2xl">{card.icon}</div>
            <h4 className="mb-1.5 text-sm font-medium">{card.title}</h4>
            <p className="text-[0.8rem] leading-relaxed text-muted">{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
