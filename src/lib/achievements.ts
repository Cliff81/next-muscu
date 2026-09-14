import type { SessionLog } from "@/lib/types";

/**
 * Hauts faits.
 *
 * Tout est **déduit de l'historique**, rien n'est stocké : un haut fait n'est
 * pas une donnée de plus à synchroniser, c'est une lecture des séances déjà
 * remontées. Un nouvel appareil les retrouve donc sans rien recevoir, et la
 * liste peut s'allonger sans migration.
 *
 * En contrepartie, supprimer une séance peut reprendre un haut fait : c'est le
 * prix de l'absence d'état, et c'est honnête — le fait n'a plus de preuve.
 */

export type Family = "assiduite" | "volume" | "force" | "rigueur";

export const FAMILY_LABELS: Record<Family, string> = {
  assiduite: "Assiduité",
  volume: "Volume",
  force: "Force",
  rigueur: "Rigueur",
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  family: Family;
  target: number;
  /** Unité du compteur, pour l'affichage de l'avancement. */
  unit?: string;
  measure: (tally: Tally) => number;
};

export type Tally = {
  weightKg: number | null;
  seances: number;
  series: number;
  repetitions: number;
  /** Kilos déplacés : charge × répétitions, séries cochées seulement. */
  tonnage: number;
  exercices: Set<string>;
  records: Map<string, number>;
  recordsBattus: number;
  chargeMax: number;
  seancesCompletes: number;
  plusLongueSeance: number;
  express: boolean;
  matinales: number;
  nocturnes: number;
  weekend: number;
  retour: boolean;
  dernierJour: string | null;
  suiteJours: number;
  meilleureSuiteJours: number;
  derniereSemaine: string | null;
  suiteSemaines: number;
  meilleureSuiteSemaines: number;
  parSemaine: Map<string, number>;
  meilleureSemaine: number;
};

const jourCle = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Le lundi de la semaine d'une date, comme clé de semaine. */
function lundiCle(d: Date): string {
  const lundi = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  return jourCle(lundi);
}

/** Jours entre deux clés, en UTC pour ignorer les changements d'heure. */
function joursEntre(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function emptyTally(weightKg: number | null = null): Tally {
  return {
    weightKg,
    seances: 0,
    series: 0,
    repetitions: 0,
    tonnage: 0,
    exercices: new Set(),
    records: new Map(),
    recordsBattus: 0,
    chargeMax: 0,
    seancesCompletes: 0,
    plusLongueSeance: 0,
    express: false,
    matinales: 0,
    nocturnes: 0,
    weekend: 0,
    retour: false,
    dernierJour: null,
    suiteJours: 0,
    meilleureSuiteJours: 0,
    derniereSemaine: null,
    suiteSemaines: 0,
    meilleureSuiteSemaines: 0,
    parSemaine: new Map(),
    meilleureSemaine: 0,
  };
}

/**
 * Ajoute une séance au décompte. Les séances doivent arriver dans l'ordre
 * chronologique : les suites de jours et de semaines se tiennent au fil de
 * l'eau, sans revenir en arrière.
 */
export function addSession(tally: Tally, log: SessionLog): void {
  const debut = new Date(log.startedAt);
  if (Number.isNaN(debut.getTime())) return;

  let cochees = 0;
  let prevues = 0;
  for (const exercice of log.exercises) {
    let meilleure = 0;
    for (const serie of exercice.sets) {
      prevues++;
      if (!serie.completed) continue;
      cochees++;
      const reps = Number.parseInt(serie.reps, 10);
      const n = Number.isFinite(reps) && reps > 0 ? reps : 0;
      tally.repetitions += n;
      const charge = serie.weight ?? 0;
      tally.tonnage += charge * n;
      if (charge > meilleure) meilleure = charge;
    }
    if (meilleure > 0) {
      const ancien = tally.records.get(exercice.exerciseName);
      // Le premier passage sur un mouvement pose la référence ; battre une
      // référence existante, c'est un record.
      if (ancien === undefined) tally.records.set(exercice.exerciseName, meilleure);
      else if (meilleure > ancien) {
        tally.records.set(exercice.exerciseName, meilleure);
        tally.recordsBattus++;
      }
      tally.chargeMax = Math.max(tally.chargeMax, meilleure);
    }
    tally.exercices.add(exercice.exerciseName);
  }

  tally.seances++;
  tally.series += cochees;
  const complete = prevues > 0 && cochees === prevues;
  if (complete) tally.seancesCompletes++;
  if (log.durationSeconds !== null) {
    tally.plusLongueSeance = Math.max(tally.plusLongueSeance, log.durationSeconds);
    if (complete && log.durationSeconds < 30 * 60) tally.express = true;
  }

  const heure = debut.getHours();
  if (heure < 7) tally.matinales++;
  if (heure >= 21) tally.nocturnes++;
  const jourSemaine = debut.getDay();
  if (jourSemaine === 0 || jourSemaine === 6) tally.weekend++;

  const jour = jourCle(debut);
  if (jour !== tally.dernierJour) {
    const ecart = tally.dernierJour === null ? null : joursEntre(tally.dernierJour, jour);
    if (ecart === 1) tally.suiteJours++;
    else {
      if (ecart !== null && ecart >= 14) tally.retour = true;
      tally.suiteJours = 1;
    }
    tally.dernierJour = jour;
    tally.meilleureSuiteJours = Math.max(tally.meilleureSuiteJours, tally.suiteJours);
  }

  const semaine = lundiCle(debut);
  if (semaine !== tally.derniereSemaine) {
    const ecart = tally.derniereSemaine === null ? null : joursEntre(tally.derniereSemaine, semaine);
    tally.suiteSemaines = ecart === 7 ? tally.suiteSemaines + 1 : 1;
    tally.derniereSemaine = semaine;
    tally.meilleureSuiteSemaines = Math.max(tally.meilleureSuiteSemaines, tally.suiteSemaines);
  }
  const compte = (tally.parSemaine.get(semaine) ?? 0) + 1;
  tally.parSemaine.set(semaine, compte);
  tally.meilleureSemaine = Math.max(tally.meilleureSemaine, compte);
}

/** Part du poids de corps atteinte sur un mouvement, en pourcentage. */
const partDuPoids = (t: Tally): number =>
  t.weightKg && t.weightKg > 0 ? (t.chargeMax / t.weightKg) * 100 : 0;

export const ACHIEVEMENTS: Achievement[] = [
  // --- assiduité
  { id: "premier-pas", name: "Premier pas", description: "Terminer une première séance", icon: "🥇", family: "assiduite", target: 1, unit: "séance", measure: (t) => t.seances },
  { id: "dix-seances", name: "Dans le rythme", description: "Dix séances au compteur", icon: "🎯", family: "assiduite", target: 10, unit: "séances", measure: (t) => t.seances },
  { id: "vingt-cinq-seances", name: "Habitué", description: "Vingt-cinq séances au compteur", icon: "🎯", family: "assiduite", target: 25, unit: "séances", measure: (t) => t.seances },
  { id: "cinquante-seances", name: "Pilier", description: "Cinquante séances au compteur", icon: "🏛️", family: "assiduite", target: 50, unit: "séances", measure: (t) => t.seances },
  { id: "cent-seances", name: "Centenaire", description: "Cent séances au compteur", icon: "💯", family: "assiduite", target: 100, unit: "séances", measure: (t) => t.seances },
  { id: "suite-3", name: "Trois d'affilée", description: "S'entraîner trois jours de suite", icon: "🔥", family: "assiduite", target: 3, unit: "jours", measure: (t) => t.meilleureSuiteJours },
  { id: "suite-5", name: "Cinq d'affilée", description: "S'entraîner cinq jours de suite", icon: "🔥", family: "assiduite", target: 5, unit: "jours", measure: (t) => t.meilleureSuiteJours },
  { id: "suite-7", name: "Semaine sans faute", description: "S'entraîner sept jours de suite", icon: "🌋", family: "assiduite", target: 7, unit: "jours", measure: (t) => t.meilleureSuiteJours },
  { id: "semaines-4", name: "Mois tenu", description: "Quatre semaines de suite avec au moins une séance", icon: "📅", family: "assiduite", target: 4, unit: "semaines", measure: (t) => t.meilleureSuiteSemaines },
  { id: "semaines-12", name: "Trimestre tenu", description: "Douze semaines de suite avec au moins une séance", icon: "🗓️", family: "assiduite", target: 12, unit: "semaines", measure: (t) => t.meilleureSuiteSemaines },
  { id: "semaine-pleine", name: "Semaine pleine", description: "Cinq séances dans la même semaine", icon: "📆", family: "assiduite", target: 5, unit: "séances", measure: (t) => t.meilleureSemaine },
  { id: "leve-tot", name: "Lève-tôt", description: "Commencer une séance avant 7 h", icon: "🌅", family: "assiduite", target: 1, measure: (t) => t.matinales },
  { id: "noctambule", name: "Noctambule", description: "Commencer une séance après 21 h", icon: "🌙", family: "assiduite", target: 1, measure: (t) => t.nocturnes },
  { id: "weekend", name: "Week-end actif", description: "Dix séances un samedi ou un dimanche", icon: "🛋️", family: "assiduite", target: 10, unit: "séances", measure: (t) => t.weekend },
  { id: "retour", name: "Le retour", description: "Reprendre après deux semaines sans séance", icon: "↩️", family: "assiduite", target: 1, measure: (t) => (t.retour ? 1 : 0) },

  // --- volume
  { id: "tonne-1", name: "Une tonne", description: "Mille kilos déplacés en tout", icon: "🏋️", family: "volume", target: 1_000, unit: "kg", measure: (t) => t.tonnage },
  { id: "tonne-10", name: "Dix tonnes", description: "Dix mille kilos déplacés en tout", icon: "🚜", family: "volume", target: 10_000, unit: "kg", measure: (t) => t.tonnage },
  { id: "tonne-100", name: "Cent tonnes", description: "Cent mille kilos déplacés en tout", icon: "🚚", family: "volume", target: 100_000, unit: "kg", measure: (t) => t.tonnage },
  { id: "tonne-500", name: "Cinq cents tonnes", description: "Un demi-million de kilos déplacés", icon: "🛳️", family: "volume", target: 500_000, unit: "kg", measure: (t) => t.tonnage },
  { id: "reps-1000", name: "Mille répétitions", description: "Mille répétitions cochées", icon: "🔁", family: "volume", target: 1_000, unit: "reps", measure: (t) => t.repetitions },
  { id: "reps-10000", name: "Dix mille répétitions", description: "Dix mille répétitions cochées", icon: "♾️", family: "volume", target: 10_000, unit: "reps", measure: (t) => t.repetitions },
  { id: "series-100", name: "Cent séries", description: "Cent séries menées au bout", icon: "📚", family: "volume", target: 100, unit: "séries", measure: (t) => t.series },
  { id: "series-1000", name: "Mille séries", description: "Mille séries menées au bout", icon: "🧱", family: "volume", target: 1_000, unit: "séries", measure: (t) => t.series },

  // --- force
  { id: "record-1", name: "Premier record", description: "Battre sa charge sur un mouvement", icon: "💪", family: "force", target: 1, unit: "record", measure: (t) => t.recordsBattus },
  { id: "record-10", name: "Dix records", description: "Battre sa charge dix fois", icon: "📈", family: "force", target: 10, unit: "records", measure: (t) => t.recordsBattus },
  { id: "record-50", name: "Cinquante records", description: "Battre sa charge cinquante fois", icon: "🚀", family: "force", target: 50, unit: "records", measure: (t) => t.recordsBattus },
  { id: "charge-60", name: "Soixante kilos", description: "Soixante kilos sur une série", icon: "🏋️‍♂️", family: "force", target: 60, unit: "kg", measure: (t) => t.chargeMax },
  { id: "charge-100", name: "Les trois chiffres", description: "Cent kilos sur une série", icon: "💥", family: "force", target: 100, unit: "kg", measure: (t) => t.chargeMax },
  { id: "poids-corps", name: "Son propre poids", description: "Soulever son poids de corps sur une série", icon: "⚖️", family: "force", target: 100, unit: "%", measure: partDuPoids },
  { id: "poids-corps-150", name: "Une fois et demie", description: "Soulever une fois et demie son poids de corps", icon: "🗿", family: "force", target: 150, unit: "%", measure: partDuPoids },
  { id: "poids-corps-200", name: "Le double", description: "Soulever deux fois son poids de corps", icon: "🦍", family: "force", target: 200, unit: "%", measure: partDuPoids },

  // --- rigueur
  { id: "sans-faute-1", name: "Sans faute", description: "Une séance dont toutes les séries sont cochées", icon: "✅", family: "rigueur", target: 1, unit: "séance", measure: (t) => t.seancesCompletes },
  { id: "sans-faute-10", name: "Dix sans faute", description: "Dix séances menées entièrement au bout", icon: "🎖️", family: "rigueur", target: 10, unit: "séances", measure: (t) => t.seancesCompletes },
  { id: "marathon", name: "Marathon", description: "Une séance de plus d'une heure trente", icon: "⏱️", family: "rigueur", target: 90, unit: "min", measure: (t) => Math.round(t.plusLongueSeance / 60) },
  { id: "express", name: "Express", description: "Une séance complète en moins de trente minutes", icon: "⚡", family: "rigueur", target: 1, measure: (t) => (t.express ? 1 : 0) },
  { id: "curieux", name: "Curieux", description: "Vingt mouvements différents essayés", icon: "🧭", family: "rigueur", target: 20, unit: "mouvements", measure: (t) => t.exercices.size },
  { id: "explorateur", name: "Explorateur", description: "Cinquante mouvements différents essayés", icon: "🗺️", family: "rigueur", target: 50, unit: "mouvements", measure: (t) => t.exercices.size },
];

export type Progress = {
  achievement: Achievement;
  value: number;
  /** Date de la séance qui a débloqué le haut fait, ou `null`. */
  unlockedAt: string | null;
};

/**
 * Passe l'historique en revue et rend l'état de chaque haut fait.
 *
 * Un seul parcours, dans l'ordre chronologique : la date de déblocage est
 * celle de la séance qui a fait basculer le compteur, et non celle du jour où
 * on regarde.
 */
export function evaluateAchievements(
  history: SessionLog[],
  weightKg: number | null = null
): Progress[] {
  const finies = history
    .filter((s) => s.finishedAt !== null)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const tally = emptyTally(weightKg);
  const dates = new Map<string, string>();

  for (const seance of finies) {
    addSession(tally, seance);
    for (const haut of ACHIEVEMENTS) {
      if (!dates.has(haut.id) && haut.measure(tally) >= haut.target) {
        dates.set(haut.id, seance.finishedAt ?? seance.startedAt);
      }
    }
  }

  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    value: achievement.measure(tally),
    unlockedAt: dates.get(achievement.id) ?? null,
  }));
}

/** Identifiants débloqués, pour comparer deux moments de l'historique. */
export function unlockedIds(history: SessionLog[], weightKg: number | null = null): Set<string> {
  return new Set(
    evaluateAchievements(history, weightKg)
      .filter((p) => p.unlockedAt !== null)
      .map((p) => p.achievement.id)
  );
}
