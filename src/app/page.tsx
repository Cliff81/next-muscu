"use client";

import { useState } from "react";
import { DayPanel } from "@/components/DayPanel";
import { DayTabs } from "@/components/DayTabs";
import { Header } from "@/components/Header";
import { ThisWeek } from "@/components/ThisWeek";
import { addDay, removeDay } from "@/lib/editProgram";
import { activeSessionStore, programStore } from "@/lib/stores";
import { useHistory } from "@/lib/useHistory";
import { useProgram } from "@/lib/useProgram";
import { weekStatus } from "@/lib/week";

export default function Home() {
  const { program } = useProgram();
  const { history } = useHistory();
  const [editing, setEditing] = useState(false);

  const status = weekStatus(program.days, history);
  // Tant qu'on n'a rien choisi, la journée affichée est la prochaine à faire :
  // ouvrir l'application, c'est tomber sur la séance du jour. Dérivé plutôt
  // que posé dans un effet — l'historique arrive après la première image.
  const [chosen, setChosen] = useState<number | null>(null);
  const nextIndex = Math.max(0, program.days.findIndex((d) => d.id === status.next));
  const index = Math.min(chosen ?? nextIndex, program.days.length - 1);
  const activeDay = program.days[index];
  const setActiveIndex = setChosen;

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
      <Header program={program} editing={editing} />
      <div className="mx-auto w-full max-w-[900px] px-8 pb-16">
        {!editing && <ThisWeek days={program.days} history={history} status={status} />}
        <DayTabs
          days={program.days}
          activeIndex={index}
          onSelect={setActiveIndex}
          editing={editing}
          onToggleEditing={() => setEditing((on) => !on)}
          onAddDay={onAddDay}
          status={status}
        />
        {activeDay && (
          <DayPanel
            day={activeDay}
            editing={editing}
            onRemoveDay={program.days.length > 1 ? onRemoveDay : undefined}
            doneAt={status.done.get(activeDay.id) ?? null}
            isNext={status.next === activeDay.id}
          />
        )}
      </div>
    </>
  );
}
