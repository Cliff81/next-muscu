import type { Day } from "@/lib/types";
import type { WeekStatus } from "@/lib/week";

type Props = {
  days: Day[];
  activeIndex: number;
  onSelect: (index: number) => void;
  editing: boolean;
  onToggleEditing: () => void;
  onAddDay: () => void;
  /** Où en est la semaine : journées faites, prochaine à faire. */
  status: WeekStatus;
};

export function DayTabs({
  days,
  activeIndex,
  onSelect,
  editing,
  onToggleEditing,
  onAddDay,
  status,
}: Props) {
  return (
    <div className="my-8 border-b border-border pb-4">
      <div className="flex flex-wrap gap-2">
        {days.map((day, i) => {
          const active = i === activeIndex;
          const faite = status.done.has(day.id);
          const prochaine = status.next === day.id;
          return (
            <button
              key={day.id}
              onClick={() => onSelect(i)}
              title={faite ? "Faite cette semaine" : prochaine ? "Prochaine séance" : undefined}
              className={`flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm transition ${
                active
                  ? "border-accent bg-accent font-bold text-bg"
                  : prochaine
                    ? "border-accent/60 bg-surface text-text hover:border-accent"
                    : "border-border bg-surface text-muted hover:border-[#333] hover:text-text"
              }`}
            >
              {faite ? (
                <span aria-label="Faite cette semaine" className={active ? "text-bg" : "text-pos"}>
                  ✓
                </span>
              ) : prochaine ? (
                <span aria-label="Prochaine séance" className={active ? "text-bg" : "text-accent"}>
                  ▸
                </span>
              ) : null}
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
