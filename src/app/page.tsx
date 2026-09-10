"use client";

import { useState } from "react";
import { DayPanel } from "@/components/DayPanel";
import { DayTabs } from "@/components/DayTabs";
import { Header } from "@/components/Header";
import { addDay, removeDay } from "@/lib/editProgram";
import { activeSessionStore, programStore } from "@/lib/stores";
import { useProgram } from "@/lib/useProgram";

export default function Home() {
  const { program } = useProgram();
  const [activeIndex, setActiveIndex] = useState(0);
  const [editing, setEditing] = useState(false);

  const index = Math.min(activeIndex, program.days.length - 1);
  const activeDay = program.days[index];

  const onAddDay = () => {
    const { program: next } = addDay(program);
    programStore.set(next);
    setActiveIndex(next.days.length - 1);
    setEditing(true);
  };

  const onRemoveDay = () => {
    if (!activeDay) return;
    // La séance en cours pointe sur un identifiant de journée : si celle-ci
    // disparaît, la séance n'a plus de programme et la page de séance ne
    // trouverait rien. On la referme avec la journée.
    const session = activeSessionStore.get();
    if (session && session.dayId === activeDay.id) activeSessionStore.clear();
    programStore.set(removeDay(program, activeDay.id));
    setActiveIndex(Math.max(0, index - 1));
  };

  return (
    <>
      <Header program={program} />
      <div className="mx-auto w-full max-w-[900px] px-8 pb-16">
        <DayTabs
          days={program.days}
          activeIndex={index}
          onSelect={setActiveIndex}
          editing={editing}
          onToggleEditing={() => setEditing((on) => !on)}
          onAddDay={onAddDay}
        />
        {activeDay && (
          <DayPanel
            day={activeDay}
            editing={editing}
            onRemoveDay={program.days.length > 1 ? onRemoveDay : undefined}
          />
        )}
      </div>
    </>
  );
}
