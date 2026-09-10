"use client";

import { useEffect, useRef, useState } from "react";
import { playBeep } from "@/lib/beep";
import { notifyRestOver } from "@/lib/notify";

type Props = {
  totalSeconds: number;
  label: string;
  onFinish: () => void;
  onSkip: () => void;
};

/**
 * Compte à rebours de repos, calé sur une échéance absolue.
 *
 * Décrémenter d'une seconde à chaque `setTimeout` paraissait suffisant mais ne
 * l'est pas sur un téléphone : dès que l'écran s'éteint ou que l'application
 * passe en arrière-plan, le navigateur bride les minuteurs, et un repos de deux
 * minutes en durait bien plus. En visant un instant précis, le bridage n'affecte
 * plus que la fréquence d'affichage : au retour dans l'application, le temps
 * restant est juste, et l'alarme part sans retard.
 *
 * Monté avec une `key` propre à chaque repos, pour que son état reparte de zéro
 * par remontage plutôt que par un effet.
 */
export function RestTimer({ totalSeconds, label, onFinish, onSkip }: Props) {
  const [deadline, setDeadline] = useState(() => Date.now() + totalSeconds * 1000);
  const [remaining, setRemaining] = useState(totalSeconds);
  const fired = useRef(false);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    let timer = 0;

    const tick = () => {
      const reste = Math.ceil((deadline - Date.now()) / 1000);
      setRemaining(reste);
      if (reste > 0) {
        // On se recale sur la seconde suivante plutôt que sur un pas fixe :
        // l'affichage ne dérive pas au fil des minutes.
        timer = window.setTimeout(tick, Math.max(100, (deadline - Date.now()) % 1000 || 1000));
        return;
      }
      if (fired.current) return;
      fired.current = true;
      playBeep();
      void notifyRestOver(`${label} — c'est reparti.`);
      onFinishRef.current();
    };

    tick();
    // Au retour dans l'application, on recalcule immédiatement : le minuteur a
    // pu être gelé pendant la mise en veille.
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
  }, [deadline, label]);

  const clamped = Math.max(0, remaining);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, clamped / totalSeconds)) : 0;
  const derniersInstants = clamped <= 3 && clamped > 0;

  return (
    <div className="sticky top-0 z-20 mb-4 overflow-hidden rounded-lg border border-accent bg-bg/95 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="text-[0.65rem] tracking-[0.1em] text-muted uppercase">
            Repos — {label}
          </div>
          <div
            className={`font-display text-3xl leading-none transition-colors ${
              derniersInstants ? "text-accent2" : "text-accent"
            }`}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDeadline((d) => d + 15000)}
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
      {/* Barre de progression : la fonte du repos se voit d'un coup d'œil,
          sans lire les chiffres. */}
      <div className="h-1 w-full bg-surface2">
        <div
          className={`h-full transition-[width] duration-500 ease-linear ${
            derniersInstants ? "bg-accent2" : "bg-accent"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
