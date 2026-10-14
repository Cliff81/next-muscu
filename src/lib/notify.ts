"use client";

import { formatDuration } from "@/lib/session";

/**
 * Notifications de séance : le repos qui file, puis sa fin.
 *
 * Passe par le service worker quand il est là : une notification affichée par
 * lui survit à un onglet mis en veille, là où `new Notification(...)` dépend
 * de la page. Le repli sert au navigateur de bureau sans service worker
 * enregistré, en développement notamment.
 *
 * Ce qu'aucune application web ne peut promettre : réveiller un téléphone
 * verrouillé dont le navigateur a été suspendu par le système. D'où le verrou
 * d'écran pendant la séance — voir `wakeLock`.
 */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsGranted(): boolean {
  return notificationsSupported() && Notification.permission === "granted";
}

/**
 * Demande l'autorisation. À appeler sur un geste — au démarrage d'une séance —
 * et non au chargement : une demande surgie sans raison se fait refuser, et un
 * refus est définitif.
 */
export async function askNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/**
 * Une seule notification pour la séance, remplacée à chaque étape plutôt
 * qu'empilée : le repos qui file, puis la fin du repos, jusqu'à la série
 * validée.
 */
const SESSION_TAG = "stronger-session";

async function showSessionNotification(title: string, options: NotificationOptions): Promise<void> {
  if (!notificationsGranted()) return;
  const full = {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: SESSION_TAG,
    // Elle reste dans le volet tant que la série n'est pas validée.
    requireInteraction: true,
    ...options,
  } as NotificationOptions;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, full);
      return;
    }
    new Notification(title, full);
  } catch {
    // Notification refusée à l'affichage : le bip et la vibration restent.
  }
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Le repos en cours, dans le volet de notifications. Une notification web ne
 * sait pas décompter seule : le titre donne l'heure de reprise, qui reste
 * juste même quand le navigateur gèle la page ; le temps restant, lui, n'est
 * à jour que tant que la page tourne.
 */
export async function notifyRestRunning(deadline: number, next: string): Promise<void> {
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  await showSessionNotification(`Repos — reprise à ${clock(deadline)}`, {
    body: `Encore ${formatDuration(remaining)} · ensuite : ${next}`,
    // Une mise à jour du décompte ne doit ni sonner ni vibrer.
    silent: true,
    renotify: false,
    timestamp: deadline,
  } as NotificationOptions);
}

export async function notifyRestOver(label: string): Promise<void> {
  await showSessionNotification("Repos terminé", {
    body: label,
    // Remplace le décompte, et cette fois se fait entendre.
    renotify: true,
    vibrate: [200, 100, 200],
  } as NotificationOptions);
}

/** Série validée, repos passé ou séance quittée : la notification n'a plus lieu d'être. */
export async function closeSessionNotification(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const shown = (await registration?.getNotifications({ tag: SESSION_TAG })) ?? [];
    shown.forEach((n) => n.close());
  } catch {
    // Rien à fermer, ou pas de service worker : rien à faire.
  }
}
