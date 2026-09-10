export function playBeep() {
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
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
    oscillator.onended = () => ctx.close();
  } catch {
    // audio unavailable (autoplay restrictions, unsupported browser) — ignore
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}
