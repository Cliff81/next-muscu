"use client";

/**
 * Garde l'écran allumé pendant une séance.
 *
 * C'est la mesure qui rend le chrono fiable en salle : un écran éteint fait
 * brider les minuteurs par le navigateur, et l'alarme arrive en retard. Tant
 * que l'écran reste allumé, la page vit et le compte à rebours tourne.
 *
 * Le verrou est relâché par le système dès que la page passe en arrière-plan :
 * on le reprend au retour, sinon il ne servirait qu'une fois.
 */
type SentinelLike = { released: boolean; release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<SentinelLike> };
};

let sentinel: SentinelLike | null = null;
let wanted = false;

export function wakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

async function acquire(): Promise<void> {
  const nav = navigator as WakeLockNavigator;
  if (!wanted || !nav.wakeLock || sentinel) return;
  try {
    sentinel = await nav.wakeLock.request("screen");
  } catch {
    // Refusé (batterie faible, réglage du navigateur) : la séance fonctionne
    // sans, l'écran s'éteindra simplement comme d'habitude.
  }
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    sentinel = null;
    void acquire();
  }
}

/** Demande le verrou et le maintient jusqu'à `releaseWakeLock`. */
export function keepScreenAwake(): void {
  if (wanted) return;
  wanted = true;
  document.addEventListener("visibilitychange", onVisibility);
  void acquire();
}

export function releaseWakeLock(): void {
  wanted = false;
  document.removeEventListener("visibilitychange", onVisibility);
  const courant = sentinel;
  sentinel = null;
  if (courant && !courant.released) void courant.release().catch(() => {});
}
