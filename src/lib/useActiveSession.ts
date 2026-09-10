"use client";

import { useCallback, useEffect, useState } from "react";
import { buildSessionFromDay } from "@/lib/session";
import { activeSessionStore, historyStore } from "@/lib/stores";
import type { Day, SessionLog, SetLog } from "@/lib/types";

export function useActiveSession(day: Day) {
  const storedSession = activeSessionStore.useValue();
  const session = storedSession && storedSession.dayId === day.id ? storedSession : null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session || session.finishedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session]);

  const start = useCallback(() => {
    activeSessionStore.set(buildSessionFromDay(day));
  }, [day]);

  const updateSet = useCallback((exerciseId: string, setIndex: number, patch: Partial<SetLog>) => {
    const current = activeSessionStore.get();
    if (!current) return;
    const next: SessionLog = {
      ...current,
      exercises: current.exercises.map((ex) =>
        ex.exerciseId !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.setIndex !== setIndex ? s : { ...s, ...patch })),
            }
      ),
    };
    activeSessionStore.set(next);
  }, []);

  const finish = useCallback(() => {
    const current = activeSessionStore.get();
    if (!current) return;
    const finishedAt = new Date().toISOString();
    const durationSeconds = Math.round(
      (new Date(finishedAt).getTime() - new Date(current.startedAt).getTime()) / 1000
    );
    const finished: SessionLog = { ...current, finishedAt, durationSeconds };
    historyStore.set([...historyStore.get(), finished]);
    activeSessionStore.clear();
  }, []);

  const abandon = useCallback(() => {
    activeSessionStore.clear();
  }, []);

  const elapsedSeconds = session
    ? Math.max(
        0,
        Math.round(
          ((session.finishedAt ? new Date(session.finishedAt).getTime() : now) -
            new Date(session.startedAt).getTime()) /
            1000
        )
      )
    : 0;

  return { session, start, updateSet, finish, abandon, elapsedSeconds };
}
