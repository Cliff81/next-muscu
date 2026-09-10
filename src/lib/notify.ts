"use client";

/**
 * Notification de fin de repos.
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

export async function notifyRestOver(label: string): Promise<void> {
  if (!notificationsGranted()) return;
  const options: NotificationOptions = {
    body: label,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "stronger-rest",
    // Remplace la précédente au lieu de les empiler série après série.
    renotify: true,
    vibrate: [200, 100, 200],
  } as NotificationOptions;

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification("Repos terminé", options);
      return;
    }
    new Notification("Repos terminé", options);
  } catch {
    // Notification refusée à l'affichage : le bip et la vibration restent.
  }
}
