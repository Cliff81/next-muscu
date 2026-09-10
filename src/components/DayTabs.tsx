import type { Day } from "@/lib/types";

type Props = {
  days: Day[];
  activeIndex: number;
  onSelect: (index: number) => void;
  editing: boolean;
  onToggleEditing: () => void;
  onAddDay: () => void;
};

export function DayTabs({
  days,
  activeIndex,
  onSelect,
  editing,
  onToggleEditing,
  onAddDay,
}: Props) {
  return (
    <div className="my-8 border-b border-border pb-4">
      <div className="flex flex-wrap gap-2">
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
        {editing && (
          <button
            onClick={onAddDay}
            className="rounded-md border border-dashed border-border2 px-4 py-2.5 text-sm text-muted transition hover:border-accent hover:text-accent"
          >
            + Journée
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onToggleEditing}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
            editing
              ? "border-accent bg-accent-soft font-medium text-accent"
              : "border-border2 text-muted hover:text-text"
          }`}
        >
          {editing ? "Terminer les modifications" : "Modifier le programme"}
        </button>
        {editing && (
          <span className="text-[0.75rem] text-muted">
            Les changements sont enregistrés au fur et à mesure.
          </span>
        )}
      </div>
    </div>
  );
}
