"use client";

import { useEffect, useRef, useState } from "react";
import { playBeep, playPreAlert } from "@/lib/beep";
import { settingsStore } from "@/lib/stores";
import { formatSeconds } from "@/lib/timedSet";

type Props = {
  seconds: number;
  /** Appelé à la fin ou à l'arrêt, avec le temps réellement tenu. */
  onDone: (heldSeconds: number) => void;
};

/**
 * Minuteur d'une série en temps — planche, effort de cardio.
 *
 * Calé sur une échéance absolue comme le minuteur de repos, et pour la même
 * raison : un téléphone en veille bride les minuteurs, une échéance ne dérive
 * pas. Le signal de fin est celui du repos, la pré-alerte aussi si elle est
 * réglée — on ne lâche pas une planche en regardant l'écran.
 */
export function HoldTimer({ seconds, onDone }: Props) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(seconds);
  const { preAlert, sound, vibrate } = settingsStore.useValue();
  const fired = useRef(false);
  const prevenu = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (deadline === null) return;
    let timer = 0;
    const tick = () => {
      const reste = Math.ceil((deadline - Date.now()) / 1000);
      setRemaining(Math.max(0, reste));
      if (preAlert > 0 && reste > 0 && reste <= preAlert && !prevenu.current && seconds > preAlert) {
        prevenu.current = true;
        playPreAlert({ sound, vibrate });
      }
      if (reste > 0) {
        timer = window.setTimeout(tick, Math.max(100, (deadline - Date.now()) % 1000 || 1000));
        return;
      }
      if (fired.current) return;
      fired.current = true;
      playBeep({ sound, vibrate });
      onDoneRef.current(seconds);
    };
    tick();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deadline, preAlert, sound, vibrate, seconds]);

  if (deadline === null) {
    return (
      <button
        type="button"
        onClick={() => {
          fired.current = false;
          prevenu.current = false;
          setRemaining(seconds);
          setDeadline(Date.now() + seconds * 1000);
        }}
        className="w-full rounded-md border border-accent/60 px-3 py-2.5 text-sm text-accent transition hover:bg-accent-soft"
      >
        ▶ Lancer {formatSeconds(seconds)}
      </button>
    );
  }

  const progress = seconds > 0 ? remaining / seconds : 0;
  return (
    <div className="rounded-md border border-accent bg-surface2 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className={`font-display text-3xl leading-none ${remaining <= 3 ? "text-accent2" : "text-accent"}`}>
          {formatSeconds(remaining)}
        </span>
        <button
          type="button"
          onClick={() => {
            // Arrêt avant l'heure : on note ce qui a été tenu, pas la cible.
            fired.current = true;
            const tenu = Math.max(0, seconds - remaining);
            setDeadline(null);
            onDoneRef.current(tenu);
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent2 hover:text-accent2"
        >
          Arrêter
        </button>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full transition-[width] duration-500 ease-linear ${remaining <= 3 ? "bg-accent2" : "bg-accent"}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
