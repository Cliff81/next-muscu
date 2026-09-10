"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SessionRunner } from "@/components/SessionRunner";
import { useActiveSession } from "@/lib/useActiveSession";
import { useProgram } from "@/lib/useProgram";

export default function SessionPage() {
  const params = useParams<{ dayId: string }>();
  const router = useRouter();
  const { program } = useProgram();
  const day = program.days.find((d) => d.id === params.dayId);

  const activeSession = useActiveSession(day ?? program.days[0]);

  if (!day) {
    return (
      <div className="mx-auto max-w-[900px] px-8 pt-12">
        <p className="text-muted">Ce jour n&apos;existe pas dans le programme actuel.</p>
        <Link href="/" className="mt-4 inline-block text-accent">
          ← Retour au programme
        </Link>
      </div>
    );
  }

  const { session, start, updateSet, finish, abandon, elapsedSeconds } = activeSession;

  function handleFinish() {
    finish();
    router.push("/progress");
  }

  function handleAbandon() {
    abandon();
    router.push("/");
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-8 pt-10 pb-16">
      <Link href="/" className="text-[0.8rem] text-muted transition hover:text-accent">
        ← Retour au programme
      </Link>

      {!session || session.finishedAt ? (
        <div className="mt-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-lg border border-border bg-surface px-4 py-1 font-display text-4xl leading-none text-accent">
              {day.code}
            </div>
            <div>
              <h1 className="font-display text-4xl">{day.title}</h1>
              <p className="mt-1 text-[0.85rem] text-muted">{day.description}</p>
            </div>
          </div>
          <button
            onClick={start}
            className="rounded-md bg-accent px-6 py-3 text-sm font-bold text-bg transition hover:opacity-90"
          >
            Démarrer la séance ▸
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <SessionRunner
            day={day}
            session={session}
            elapsedSeconds={elapsedSeconds}
            onUpdateSet={updateSet}
            onFinish={handleFinish}
            onAbandon={handleAbandon}
          />
        </div>
      )}
    </div>
  );
}
