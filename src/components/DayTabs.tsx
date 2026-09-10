import type { Day } from "@/lib/types";

type Props = {
  days: Day[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function DayTabs({ days, activeIndex, onSelect }: Props) {
  return (
    <div className="my-8 flex flex-wrap gap-2 border-b border-border pb-4">
      {days.map((day, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={day.id}
            onClick={() => onSelect(i)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm transition ${
              active
                ? "border-accent bg-accent font-bold text-bg"
                : "border-border bg-surface text-muted hover:border-[#333] hover:text-text"
            }`}
          >
            <span className="font-display text-base">{day.code}</span>
            {day.title}
          </button>
        );
      })}
    </div>
  );
}
