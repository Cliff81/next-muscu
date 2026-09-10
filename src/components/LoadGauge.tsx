import { LOAD_FILL, LOAD_LABELS, type LoadLevel } from "@/lib/loadLevel";

const COLORS: Record<LoadLevel, string> = {
  heavy: "bg-neg",
  moderate: "bg-warn",
  light: "bg-pos",
};

/**
 * Jauge verticale de charge : le remplissage et la couleur disent ensemble si
 * l'exercice se fait lourd, modéré ou léger. Deux signaux plutôt qu'un, pour
 * que la lecture ne repose pas seulement sur la couleur.
 */
export function LoadGauge({ level, className }: { level: LoadLevel; className?: string }) {
  return (
    <span
      role="img"
      aria-label={LOAD_LABELS[level]}
      title={LOAD_LABELS[level]}
      className={`inline-flex h-5 w-1.5 shrink-0 items-end overflow-hidden rounded-full bg-surface3 ${className ?? ""}`}
    >
      <span
        className={`w-full rounded-full ${COLORS[level]}`}
        style={{ height: `${LOAD_FILL[level] * 100}%` }}
      />
    </span>
  );
}
