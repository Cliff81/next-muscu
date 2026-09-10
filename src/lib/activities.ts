"use client";

/**
 * Activités sportives déclarées, et leur dépense énergétique.
 *
 * Les valeurs MET viennent du Compendium of Physical Activities : un MET est
 * la dépense au repos, et 1 MET ≈ 1 kcal par kilo et par heure. Ce sont des
 * moyennes de population — un match de volley acharné et un échange tranquille
 * portent le même nom.
 */

export type Intensity = "light" | "moderate" | "vigorous";
export type SportKind = "team" | "solo";

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: "Légère",
  moderate: "Modérée",
  vigorous: "Soutenue",
};

export const INTENSITY_HINTS: Record<Intensity, string> = {
  light: "Tu peux tenir une conversation sans peine",
  moderate: "Tu parles par phrases courtes",
  vigorous: "Tu peux à peine parler",
};

export type Sport = {
  id: string;
  name: string;
  kind: SportKind;
  /** MET par intensité déclarée. */
  met: Record<Intensity, number>;
};

export const SPORTS: Sport[] = [
  // — Sports collectifs
  { id: "volleyball", name: "Volley-ball", kind: "team", met: { light: 3, moderate: 4, vigorous: 6 } },
  { id: "football", name: "Football", kind: "team", met: { light: 5, moderate: 7, vigorous: 10 } },
  { id: "basketball", name: "Basket-ball", kind: "team", met: { light: 4.5, moderate: 6.5, vigorous: 8 } },
  { id: "handball", name: "Handball", kind: "team", met: { light: 6, moderate: 8, vigorous: 12 } },
  { id: "rugby", name: "Rugby", kind: "team", met: { light: 6.3, moderate: 8.3, vigorous: 10 } },
  { id: "tennis", name: "Tennis", kind: "team", met: { light: 5, moderate: 7.3, vigorous: 8 } },
  { id: "padel", name: "Padel", kind: "team", met: { light: 4.5, moderate: 6, vigorous: 7.5 } },
  { id: "badminton", name: "Badminton", kind: "team", met: { light: 4.5, moderate: 5.5, vigorous: 7 } },
  // — Sports individuels
  { id: "running", name: "Course à pied", kind: "solo", met: { light: 6, moderate: 9.8, vigorous: 12.8 } },
  { id: "cycling", name: "Vélo", kind: "solo", met: { light: 4, moderate: 8, vigorous: 12 } },
  { id: "swimming", name: "Natation", kind: "solo", met: { light: 4.8, moderate: 7, vigorous: 10 } },
  { id: "walking", name: "Marche", kind: "solo", met: { light: 2.8, moderate: 3.5, vigorous: 5 } },
  { id: "hiking", name: "Randonnée", kind: "solo", met: { light: 4, moderate: 5.3, vigorous: 7 } },
  { id: "rowing", name: "Rameur", kind: "solo", met: { light: 4.8, moderate: 7, vigorous: 8.5 } },
  { id: "jumprope", name: "Corde à sauter", kind: "solo", met: { light: 8.8, moderate: 11.8, vigorous: 12.3 } },
  { id: "boxing", name: "Boxe", kind: "solo", met: { light: 5, moderate: 7.8, vigorous: 12.8 } },
  { id: "climbing", name: "Escalade", kind: "solo", met: { light: 5.8, moderate: 7.5, vigorous: 9 } },
  { id: "dancing", name: "Danse", kind: "solo", met: { light: 3, moderate: 5, vigorous: 7.8 } },
  { id: "yoga", name: "Yoga", kind: "solo", met: { light: 2.3, moderate: 3, vigorous: 4 } },
  { id: "skiing", name: "Ski", kind: "solo", met: { light: 4.3, moderate: 5.3, vigorous: 8 } },
];

/** MET du renforcement musculaire, pour chiffrer le programme lui-même. */
export const STRENGTH_MET: Record<Intensity, number> = { light: 3.5, moderate: 5, vigorous: 6 };

export const SPORT_KIND_LABELS: Record<SportKind, string> = {
  team: "Sports collectifs et de raquette",
  solo: "Sports individuels",
};

/**
 * Dépense de la vie courante, **hors sport**. C'est la seule donnée qui
 * manquait vraiment : le sport est désormais compté séance par séance, mais
 * une journée de bureau et une journée de chantier ne se ressemblent pas, et
 * l'écart atteint 500 kcal. Les facteurs sont volontairement plus bas que les
 * multiplicateurs usuels, qui incluent l'exercice — ici il est ailleurs.
 */
export type NeatLevel = "sedentary" | "onFeet" | "physical";

export const NEAT_LEVELS: { id: NeatLevel; name: string; summary: string; factor: number }[] = [
  { id: "sedentary", name: "Journée assise", summary: "Bureau, peu de déplacements", factor: 1.2 },
  { id: "onFeet", name: "Debout, en mouvement", summary: "Commerce, terrain, beaucoup de marche", factor: 1.35 },
  { id: "physical", name: "Travail physique", summary: "Port de charges, chantier", factor: 1.5 },
];

export function neatFactor(level: NeatLevel): number {
  return NEAT_LEVELS.find((l) => l.id === level)?.factor ?? 1.2;
}

export type Activity = {
  id: string;
  sportId: string;
  sessionsPerWeek: number;
  minutesPerSession: number;
  intensity: Intensity;
};

export function sportById(id: string): Sport | null {
  return SPORTS.find((s) => s.id === id) ?? null;
}

/**
 * Dépense d'une séance, en kilocalories.
 *
 * On retire 1 MET : le métabolisme de repos de ces heures-là est déjà compté
 * dans la dépense de base. Sans cette soustraction, une heure de sport serait
 * comptée deux fois pour sa part de repos.
 */
export function sessionBurn(met: number, minutes: number, weightKg: number): number {
  return Math.max(0, met - 1) * weightKg * (minutes / 60);
}

/** Dépense hebdomadaire d'une activité déclarée. */
export function activityBurn(activity: Activity, weightKg: number): number {
  const sport = sportById(activity.sportId);
  if (!sport) return 0;
  return (
    sessionBurn(sport.met[activity.intensity], activity.minutesPerSession, weightKg) *
    activity.sessionsPerWeek
  );
}

/** Dépense hebdomadaire de toutes les activités déclarées. */
export function weeklyActivityBurn(activities: Activity[], weightKg: number): number {
  return activities.reduce((sum, a) => sum + activityBurn(a, weightKg), 0);
}

/**
 * Minutes moyennes par séance annoncées par le programme. Les durées y sont
 * écrites pour être lues (« 60–75 min ») : on prend le milieu de la fourchette.
 */
export function programMinutes(durations: string[]): number {
  const moyennes = durations
    .map((d) => d.match(/\d+/g)?.map(Number) ?? [])
    .filter((n) => n.length > 0)
    .map((n) => n.reduce((a, b) => a + b, 0) / n.length);
  if (!moyennes.length) return 60;
  return Math.round(moyennes.reduce((a, b) => a + b, 0) / moyennes.length);
}

/** Nombre à une décimale, avec la virgule française. */
export function decimal(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/** Minutes hebdomadaires exprimées en heures, pour l'affichage. */
export function hoursLabel(minutes: number): string {
  return `${decimal(minutes / 60)} h`;
}
