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

/**
 * Un haut fait, avec ses paliers.
 *
 * Un même effort se poursuit : soulever 100 kg puis 200, tenir trois jours
 * puis dix. Plutôt que des hauts faits séparés qui répètent le même libellé,
 * un seul se gravit — ce qui donne toujours un « prochain » à annoncer.
 */
export type Ladder = {
  id: string;
  name: string;
  description: string;
  icon: string;
  family: Family;
  /** Unité du compteur. Absente pour un haut fait qui se tient ou non. */
  unit?: string;
  /** Paliers croissants. */
  tiers: number[];
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

export const LADDERS: Ladder[] = [
  // --- assiduité
  { id: "seances", name: "Séances au compteur", description: "Chaque séance terminée compte", icon: "🎯", family: "assiduite", unit: "séances", tiers: [1, 10, 25, 50, 100, 250], measure: (t) => t.seances },
  { id: "suite-jours", name: "Jours d'affilée", description: "S'entraîner sans sauter un jour", icon: "🔥", family: "assiduite", unit: "jours", tiers: [2, 3, 5, 7, 10, 14], measure: (t) => t.meilleureSuiteJours },
  { id: "suite-semaines", name: "Semaines de suite", description: "Au moins une séance chaque semaine", icon: "📅", family: "assiduite", unit: "semaines", tiers: [2, 4, 8, 12, 26, 52], measure: (t) => t.meilleureSuiteSemaines },
  { id: "semaine-pleine", name: "Séances dans une semaine", description: "Le plus gros volume sur sept jours", icon: "📆", family: "assiduite", unit: "séances", tiers: [3, 4, 5, 6], measure: (t) => t.meilleureSemaine },
  { id: "weekend", name: "Séances le week-end", description: "Samedi ou dimanche à la salle", icon: "🛋️", family: "assiduite", unit: "séances", tiers: [1, 10, 25, 50], measure: (t) => t.weekend },
  { id: "leve-tot", name: "Séances avant 7 h", description: "Commencer avant que le jour se lève", icon: "🌅", family: "assiduite", unit: "séances", tiers: [1, 5, 20], measure: (t) => t.matinales },
  { id: "noctambule", name: "Séances après 21 h", description: "Finir quand les autres dorment", icon: "🌙", family: "assiduite", unit: "séances", tiers: [1, 5, 20], measure: (t) => t.nocturnes },
  { id: "retour", name: "Le retour", description: "Reprendre après deux semaines sans séance", icon: "↩️", family: "assiduite", tiers: [1], measure: (t) => (t.retour ? 1 : 0) },

  // --- volume
  { id: "tonnage", name: "Kilos déplacés", description: "Charge × répétitions, depuis le début", icon: "🏋️", family: "volume", unit: "kg", tiers: [1_000, 10_000, 50_000, 100_000, 500_000, 1_000_000], measure: (t) => t.tonnage },
  { id: "repetitions", name: "Répétitions cochées", description: "Une par une, elles s'accumulent", icon: "🔁", family: "volume", unit: "reps", tiers: [100, 1_000, 5_000, 10_000, 50_000], measure: (t) => t.repetitions },
  { id: "series", name: "Séries menées au bout", description: "Celles que tu as cochées", icon: "📚", family: "volume", unit: "séries", tiers: [50, 100, 500, 1_000, 5_000], measure: (t) => t.series },

  // --- force
  { id: "charge", name: "Charge sur une série", description: "Le plus lourd que tu aies soulevé", icon: "💥", family: "force", unit: "kg", tiers: [20, 40, 60, 80, 100, 120, 150, 200], measure: (t) => t.chargeMax },
  { id: "records", name: "Records battus", description: "Chaque fois que tu dépasses ta charge sur un mouvement", icon: "📈", family: "force", unit: "records", tiers: [1, 10, 25, 50, 100], measure: (t) => t.recordsBattus },
  { id: "poids-corps", name: "Part du poids de corps", description: "Ta charge maximale rapportée à ton poids", icon: "⚖️", family: "force", unit: "%", tiers: [50, 100, 150, 200], measure: partDuPoids },

  // --- rigueur
  { id: "sans-faute", name: "Séances sans faute", description: "Toutes les séries cochées, sans exception", icon: "✅", family: "rigueur", unit: "séances", tiers: [1, 10, 25, 50], measure: (t) => t.seancesCompletes },
  { id: "duree", name: "Plus longue séance", description: "Le jour où tu n'as pas compté ton temps", icon: "⏱️", family: "rigueur", unit: "min", tiers: [45, 60, 90, 120], measure: (t) => Math.round(t.plusLongueSeance / 60) },
  { id: "express", name: "Express", description: "Une séance complète en moins de trente minutes", icon: "⚡", family: "rigueur", tiers: [1], measure: (t) => (t.express ? 1 : 0) },
  { id: "mouvements", name: "Mouvements différents", description: "La variété de ce que tu as essayé", icon: "🧭", family: "rigueur", unit: "mouvements", tiers: [5, 20, 50, 100], measure: (t) => t.exercices.size },
];

/** Nombre total de paliers, tous hauts faits confondus. */
export const TIER_COUNT = LADDERS.reduce((n, l) => n + l.tiers.length, 0);

export type LadderProgress = {
  ladder: Ladder;
  value: number;
  /** Paliers franchis. */
  level: number;
  /** Date de la séance qui a débloqué chaque palier, `null` s'il reste à faire. */
  unlockedAt: (string | null)[];
  /** Prochain palier à viser, `null` si l'échelle est finie. */
  next: number | null;
};

/**
 * Passe l'historique en revue et rend l'état de chaque échelle.
 *
 * Un seul parcours, dans l'ordre chronologique : la date d'un palier est celle
 * de la séance qui l'a fait basculer, et non celle du jour où l'on regarde.
 * C'est ce qui permet d'annoncer en fin de séance ce qu'elle vient d'ouvrir,
 * sans avoir rien mémorisé.
 */
export function evaluateLadders(
  history: SessionLog[],
  weightKg: number | null = null
): LadderProgress[] {
  const finies = history
    .filter((s) => s.finishedAt !== null)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const tally = emptyTally(weightKg);
  const dates = new Map<string, (string | null)[]>(
    LADDERS.map((l) => [l.id, l.tiers.map(() => null)])
  );

  for (const seance of finies) {
    addSession(tally, seance);
    for (const echelle of LADDERS) {
      const atteint = echelle.measure(tally);
      const dejaLa = dates.get(echelle.id)!;
      echelle.tiers.forEach((palier, i) => {
        if (dejaLa[i] === null && atteint >= palier) {
          dejaLa[i] = seance.finishedAt ?? seance.startedAt;
        }
      });
    }
  }

  return LADDERS.map((ladder) => {
    const unlockedAt = dates.get(ladder.id)!;
    const level = unlockedAt.filter((d) => d !== null).length;
    return {
      ladder,
      value: ladder.measure(tally),
      level,
      unlockedAt,
      next: level < ladder.tiers.length ? ladder.tiers[level] : null,
    };
  });
}

/**
 * « 1 jour », « 20 kg », « 2 séances ».
 *
 * Les unités sont écrites au pluriel dans les définitions, forme de loin la
 * plus fréquente ; seul le singulier demande un accord.
 */
export function quantity(value: number, unit?: string): string {
  const arrondi = Math.round(value * 10) / 10;
  const nombre = arrondi.toLocaleString("fr-FR");
  if (!unit) return nombre;
  return `${nombre} ${arrondi === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit}`;
}

/** Libellé d'un palier : « 100 kg », ou le nom du haut fait s'il est unique. */
export function tierLabel(ladder: Ladder, tier: number): string {
  return ladder.unit ? quantity(tier, ladder.unit) : ladder.name;
}

export type Tier = { ladder: Ladder; tier: number; index: number };

/**
 * Paliers ouverts par une séance précise.
 *
 * On reconnaît la séance à sa date de fin, celle-là même qui a été inscrite
 * lors du parcours : pas besoin de comparer deux états de l'historique.
 *
 * Une première séance à 100 kg franchit d'un coup tous les paliers de charge
 * en dessous. Les annoncer tous noierait le seul qui compte : on ne garde que
 * le plus haut de chaque échelle.
 */
export function tiersUnlockedBy(progress: LadderProgress[], finishedAt: string): Tier[] {
  return progress.flatMap((p) => {
    const index = p.unlockedAt.findLastIndex((date) => date === finishedAt);
    return index === -1 ? [] : [{ ladder: p.ladder, tier: p.ladder.tiers[index], index }];
  });
}

export type Goal = Tier & { value: number; part: number };

/** Les prochains paliers, du plus proche au plus lointain. */
export function nextGoals(progress: LadderProgress[], count = 3): Goal[] {
  return progress
    .filter((p) => p.next !== null)
    .map((p) => ({
      ladder: p.ladder,
      tier: p.next as number,
      index: p.level,
      value: p.value,
      part: Math.min(1, p.value / (p.next as number)),
    }))
    .sort((a, b) => b.part - a.part)
    .slice(0, count);
}
