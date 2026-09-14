import type { Trend } from "@/lib/bodyWeight";
import type { Goal } from "@/lib/nutrition";
import { decimal } from "@/lib/format";

/**
 * Ce que la balance dit de l'objectif.
 *
 * Les besoins sont une estimation ; la balance est une mesure. Quand les deux
 * divergent, c'est la balance qui a raison — et c'est elle qui doit corriger
 * l'estimation, pas l'inverse. Les vitesses de référence sont celles qu'on
 * retrouve partout : +0,25 à +0,5 kg par semaine en prise de masse pour
 * construire du muscle sans trop de gras, −0,25 à −0,75 en sèche pour perdre
 * du gras sans muscle.
 *
 * Il faut au moins deux semaines de pesées : à moins, on lit l'eau et le
 * contenu de l'estomac, pas le corps.
 */

export const MIN_SPAN_DAYS = 14;

export type Verdict = {
  kind: "pas-assez" | "ok" | "trop-lent" | "trop-vite" | "sens-inverse";
  /** kg par semaine, `null` sans mesure exploitable. */
  ratePerWeek: number | null;
  /** Correction suggérée sur l'objectif calorique, en kcal/jour ; 0 si rien à changer. */
  adjustKcal: number;
  message: string;
};

const CIBLES: Record<Goal, { min: number; max: number }> = {
  masse: { min: 0.25, max: 0.5 },
  maintien: { min: -0.25, max: 0.25 },
  seche: { min: -0.75, max: -0.25 },
};

const parSemaine = (t: Trend) => (t.days > 0 ? (t.delta / t.days) * 7 : 0);

const vitesse = (r: number) => `${r > 0 ? "+" : ""}${decimal(r)} kg/semaine`;

export function coachFromTrend(goal: Goal, trend: Trend | null): Verdict {
  if (!trend || trend.days < MIN_SPAN_DAYS) {
    return {
      kind: "pas-assez",
      ratePerWeek: null,
      adjustKcal: 0,
      message: `Il faut au moins ${MIN_SPAN_DAYS} jours de pesées pour lire une tendance — en dessous, c'est l'eau qu'on mesure.`,
    };
  }

  const rate = Math.round(parSemaine(trend) * 100) / 100;
  const cible = CIBLES[goal];
  const v = vitesse(rate);

  if (goal === "masse") {
    if (rate < -0.1) return { kind: "sens-inverse", ratePerWeek: rate, adjustKcal: 250, message: `Tu perds du poids (${v}) alors que tu vises la masse : ajoute environ 250 kcal par jour.` };
    if (rate < cible.min) return { kind: "trop-lent", ratePerWeek: rate, adjustKcal: 200, message: `${v} : c'est lent pour une prise de masse. Ajoute environ 200 kcal par jour et regarde dans deux semaines.` };
    if (rate > 0.7) return { kind: "trop-vite", ratePerWeek: rate, adjustKcal: -150, message: `${v} : c'est vite, et au-delà de 0,5 kg par semaine l'excédent est surtout du gras. Retire environ 150 kcal par jour.` };
    return { kind: "ok", ratePerWeek: rate, adjustKcal: 0, message: `${v} : dans la bonne fenêtre pour construire du muscle. Continue comme ça.` };
  }

  if (goal === "seche") {
    if (rate > 0.1) return { kind: "sens-inverse", ratePerWeek: rate, adjustKcal: -250, message: `Tu prends du poids (${v}) alors que tu vises la sèche : retire environ 250 kcal par jour.` };
    if (rate > cible.max) return { kind: "trop-lent", ratePerWeek: rate, adjustKcal: -200, message: `${v} : c'est lent pour une sèche. Retire environ 200 kcal par jour et regarde dans deux semaines.` };
    if (rate < -1) return { kind: "trop-vite", ratePerWeek: rate, adjustKcal: 200, message: `${v} : c'est vite, et au-delà d'un kilo par semaine on perd du muscle avec le gras. Remonte d'environ 200 kcal par jour.` };
    return { kind: "ok", ratePerWeek: rate, adjustKcal: 0, message: `${v} : dans la bonne fenêtre pour perdre du gras sans muscle. Continue comme ça.` };
  }

  if (rate > cible.max) return { kind: "trop-vite", ratePerWeek: rate, adjustKcal: -150, message: `${v} : tu prends du poids alors que tu vises le maintien. Retire environ 150 kcal par jour.` };
  if (rate < cible.min) return { kind: "trop-vite", ratePerWeek: rate, adjustKcal: 150, message: `${v} : tu perds du poids alors que tu vises le maintien. Ajoute environ 150 kcal par jour.` };
  return { kind: "ok", ratePerWeek: rate, adjustKcal: 0, message: `${v} : stable. C'est le maintien.` };
}
