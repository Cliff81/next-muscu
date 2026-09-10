"use client";

import { useEffect, useRef, useState } from "react";
import { playBeep } from "@/lib/beep";

type Props = {
  totalSeconds: number;
  label: string;
  onFinish: () => void;
  onSkip: () => void;
};

// Mount this component with a `key` unique to each rest period so its
// countdown state resets naturally on remount instead of via an effect.
export function RestTimer({ totalSeconds, label, onFinish, onSkip }: Props) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    if (remaining <= 0) {
      playBeep();
      onFinishRef.current();
      return;
    }
    const timeout = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timeout);
  }, [remaining]);

  const minutes = Math.floor(Math.max(0, remaining) / 60);
  const seconds = Math.max(0, remaining) % 60;

  return (
    <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-4 rounded-lg border border-accent bg-bg/95 px-4 py-3 shadow-lg backdrop-blur">
      <div>
        <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">Repos — {label}</div>
        <div className="font-display text-3xl leading-none text-accent">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setRemaining((r) => r + 15)}
          className="rounded-md border border-border px-3 py-2 text-xs text-text transition hover:border-accent"
        >
          +15s
        </button>
        <button
          onClick={onSkip}
          className="rounded-md border border-border px-3 py-2 text-xs text-muted transition hover:border-accent2 hover:text-accent2"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
