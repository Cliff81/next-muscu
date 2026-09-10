"use client";

import { useState } from "react";
import { DayPanel } from "@/components/DayPanel";
import { DayTabs } from "@/components/DayTabs";
import { Header } from "@/components/Header";
import { NutritionSection } from "@/components/NutritionSection";
import { useProgram } from "@/lib/useProgram";

export default function Home() {
  const { program } = useProgram();
  const [activeIndex, setActiveIndex] = useState(0);

  const activeDay = program.days[Math.min(activeIndex, program.days.length - 1)];

  return (
    <>
      <Header program={program} />
      <div className="mx-auto w-full max-w-[900px] px-8 pb-16">
        <DayTabs days={program.days} activeIndex={activeIndex} onSelect={setActiveIndex} />
        {activeDay && <DayPanel day={activeDay} />}
      </div>
      <NutritionSection cards={program.nutrition} />
    </>
  );
}
