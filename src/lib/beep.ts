export type Signal = { sound: boolean; vibrate: boolean };

const TOUT: Signal = { sound: true, vibrate: true };

/**
 * Un son bref par l'API audio, sans fichier à charger : un oscillateur suffit,
 * et il part même hors ligne.
 */
function tone(frequency: number, duration: number, volume: number): void {
  if (typeof window === "undefined") return;
  try {
    type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
    const win = window as WindowWithWebkitAudio;
    const AudioContextClass = window.AudioContext ?? win.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => ctx.close();
  } catch {
    // audio indisponible (restrictions de lecture automatique, navigateur) — on passe
  }
}

function buzz(pattern: number[]): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

/** Fin du repos : franc et long. */
export function playBeep(signal: Signal = TOUT): void {
  if (signal.sound) tone(880, 0.6, 0.15);
  if (signal.vibrate) buzz([200, 100, 200]);
}

/**
 * Pré-alerte : plus grave, plus courte, plus douce. Elle prévient, elle ne
 * sonne pas — la fin du repos doit rester reconnaissable entre les deux.
 */
export function playPreAlert(signal: Signal = TOUT): void {
  if (signal.sound) tone(660, 0.25, 0.1);
  if (signal.vibrate) buzz([120]);
}
