import type { WeightEntry } from "@/lib/bodyWeight";
import { ON_FOOT, ON_WHEELS, type Outing } from "@/lib/outings";
import { mergeEngraved, trophyKey, type Engraved } from "@/lib/trophies";
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

export type Family = "assiduite" | "volume" | "force" | "rigueur" | "endurance";

export const FAMILY_LABELS: Record<Family, string> = {
  assiduite: "Assiduité",
  volume: "Volume",
  force: "Force",
  rigueur: "Rigueur",
  endurance: "Dehors",
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
  /**
   * Meilleure charge rapportée au poids de corps **du moment** (1 = son poids).
   * Prise à l'instant de la série, et non recalculée avec le poids
   * d'aujourd'hui : perdre dix kilos ne fait pas soulever plus.
   */
  meilleurePart: number;
  seancesCompletes: number;
  plusLongueSeance: number;
  /** Temps cumulé sous la barre, en secondes. */
  tempsTotal: number;
  /** Le plus gros volume tenu en une seule séance. */
  plusGrosseSeance: number;
  plusDeSeries: number;
  /** Journées du programme visitées, et passages par mouvement. */
  journees: Set<string>;
  passages: Map<string, number>;
  fidelite: number;
  premierJour: string | null;
  /** Sorties enregistrées, et kilomètres cumulés. */
  sorties: number;
  kmPied: number;
  kmVelo: number;
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
    meilleurePart: 0,
    seancesCompletes: 0,
    plusLongueSeance: 0,
    tempsTotal: 0,
    plusGrosseSeance: 0,
    plusDeSeries: 0,
    journees: new Set(),
    passages: new Map(),
    fidelite: 0,
    premierJour: null,
    sorties: 0,
    kmPied: 0,
    kmVelo: 0,
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
  let volume = 0;
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
      volume += charge * n;
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
      if (tally.weightKg && tally.weightKg > 0) {
        tally.meilleurePart = Math.max(tally.meilleurePart, meilleure / tally.weightKg);
      }
    }
    tally.exercices.add(exercice.exerciseName);
    const passages = (tally.passages.get(exercice.exerciseName) ?? 0) + 1;
    tally.passages.set(exercice.exerciseName, passages);
    tally.fidelite = Math.max(tally.fidelite, passages);
  }

  tally.seances++;
  tally.series += cochees;
  const complete = prevues > 0 && cochees === prevues;
  if (complete) tally.seancesCompletes++;
  if (log.durationSeconds !== null) {
    tally.plusLongueSeance = Math.max(tally.plusLongueSeance, log.durationSeconds);
    tally.tempsTotal += log.durationSeconds;
    if (complete && log.durationSeconds < 30 * 60) tally.express = true;
  }
  tally.plusGrosseSeance = Math.max(tally.plusGrosseSeance, volume);
  tally.plusDeSeries = Math.max(tally.plusDeSeries, cochees);
  tally.journees.add(log.dayId);

  const heure = debut.getHours();
  if (heure < 7) tally.matinales++;
  if (heure >= 21) tally.nocturnes++;
  const jourSemaine = debut.getDay();
  if (jourSemaine === 0 || jourSemaine === 6) tally.weekend++;

  noterJour(tally, debut);
}

/**
 * Tient les suites de jours et de semaines.
 *
 * Partagé par les séances et les sorties : courir un dimanche prolonge la
 * suite autant que soulever de la fonte. Les événements doivent arriver dans
 * l'ordre chronologique — la suite se tient au fil de l'eau, sans revenir en
 * arrière.
 */
function noterJour(tally: Tally, quand: Date): void {
  const jour = jourCle(quand);
  if (tally.premierJour === null) tally.premierJour = jour;
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

  const semaine = lundiCle(quand);
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

/** Ajoute une sortie au décompte. Même exigence d'ordre que `addSession`. */
export function addOuting(tally: Tally, outing: Outing): void {
  const quand = new Date(`${outing.date}T12:00:00`);
  if (Number.isNaN(quand.getTime())) return;
  tally.sorties++;
  const km = outing.km ?? 0;
  if (ON_FOOT.includes(outing.sportId)) tally.kmPied += km;
  if (ON_WHEELS.includes(outing.sportId)) tally.kmVelo += km;
  tally.tempsTotal += outing.minutes * 60;
  noterJour(tally, quand);
}

/** Jours écoulés entre la première et la dernière séance. */
const anciennete = (t: Tally): number =>
  t.premierJour && t.dernierJour ? joursEntre(t.premierJour, t.dernierJour) + 1 : 0;

/** Meilleure part du poids de corps soulevée, en pourcentage. */
const partDuPoids = (t: Tally): number => Math.round(t.meilleurePart * 1000) / 10;

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
  { id: "poids-corps", name: "Part du poids de corps", description: "Ta meilleure charge rapportée à ton poids du jour", icon: "⚖️", family: "force", unit: "%", tiers: [50, 100, 150, 200], measure: partDuPoids },

  // --- rigueur
  { id: "sans-faute", name: "Séances sans faute", description: "Toutes les séries cochées, sans exception", icon: "✅", family: "rigueur", unit: "séances", tiers: [1, 10, 25, 50], measure: (t) => t.seancesCompletes },
  { id: "duree", name: "Plus longue séance", description: "Le jour où tu n'as pas compté ton temps", icon: "⏱️", family: "rigueur", unit: "min", tiers: [45, 60, 90, 120], measure: (t) => Math.round(t.plusLongueSeance / 60) },
  { id: "express", name: "Express", description: "Une séance complète en moins de trente minutes", icon: "⚡", family: "rigueur", tiers: [1], measure: (t) => (t.express ? 1 : 0) },
  { id: "mouvements", name: "Mouvements différents", description: "La variété de ce que tu as essayé", icon: "🧭", family: "rigueur", unit: "mouvements", tiers: [5, 20, 50, 100], measure: (t) => t.exercices.size },
  { id: "temps", name: "Temps sous la barre", description: "Tout ce que tu as passé à t'entraîner", icon: "⌛", family: "rigueur", unit: "h", tiers: [1, 10, 24, 50, 100, 250, 500], measure: (t) => Math.round(t.tempsTotal / 3600) },
  { id: "anciennete", name: "Ancienneté", description: "Depuis ta toute première séance", icon: "🎂", family: "rigueur", unit: "jours", tiers: [7, 30, 90, 180, 365, 730], measure: anciennete },
  { id: "journees", name: "Journées du programme", description: "Les séances différentes que tu as faites", icon: "🗂️", family: "rigueur", unit: "journées", tiers: [2, 3, 4, 5, 6], measure: (t) => t.journees.size },
  { id: "fidelite", name: "Fidèle à un mouvement", description: "Le mouvement que tu as le plus répété, séance après séance", icon: "🔂", family: "rigueur", unit: "séances", tiers: [5, 10, 25, 50, 100], measure: (t) => t.fidelite },

  // --- dehors
  { id: "km-pied", name: "Kilomètres à pied", description: "Course, marche et randonnée cumulées", icon: "👟", family: "endurance", unit: "km", tiers: [5, 10, 21.1, 42.2, 100, 250, 400, 1_000, 2_500], measure: (t) => t.kmPied },
  { id: "km-velo", name: "Kilomètres à vélo", description: "Tout ce que tu as avalé sur deux roues", icon: "🚲", family: "endurance", unit: "km", tiers: [20, 50, 100, 250, 500, 1_000, 3_500], measure: (t) => t.kmVelo },
  { id: "sorties", name: "Sorties enregistrées", description: "Chaque sortie notée dans le journal", icon: "🧭", family: "endurance", unit: "sorties", tiers: [1, 10, 25, 50, 100, 250], measure: (t) => t.sorties },

  // --- volume, en une seule séance
  { id: "grosse-seance", name: "Grosse séance", description: "Le plus de kilos déplacés en une seule fois", icon: "🐘", family: "volume", unit: "kg", tiers: [2_000, 5_000, 10_000, 15_000, 25_000], measure: (t) => t.plusGrosseSeance },
  { id: "series-seance", name: "Séries en une séance", description: "La séance la plus fournie", icon: "🧮", family: "volume", unit: "séries", tiers: [10, 20, 30, 40], measure: (t) => t.plusDeSeries },
];

/**
 * Équivalences, pour donner une taille aux grands nombres.
 *
 * Les ancrages sont approximatifs et assumés comme tels — c'est un ordre de
 * grandeur, pas une pesée. Le premier qui dépasse la valeur n'est pas retenu :
 * on garde le plus grand que l'on ait déjà dépassé.
 */
const EQUIVALENCES: Record<string, { at: number; text: string }[]> = {
  tonnage: [
    { at: 500, text: "un cheval" },
    { at: 1_300, text: "une Clio" },
    { at: 5_000, text: "un éléphant d'Afrique" },
    { at: 12_000, text: "un bus" },
    { at: 40_000, text: "un semi-remorque chargé" },
    { at: 78_000, text: "un Airbus A320 au décollage" },
    { at: 380_000, text: "une rame de TGV" },
    { at: 1_000_000, text: "trois rames de TGV" },
    { at: 7_300_000, text: "la charpente de la tour Eiffel" },
  ],
  "grosse-seance": [
    { at: 2_000, text: "deux vaches" },
    { at: 5_000, text: "un éléphant d'Afrique" },
    { at: 12_000, text: "un bus" },
    { at: 25_000, text: "deux bus" },
  ],
  temps: [
    { at: 3, text: "un aller-retour Limoges–Paris en voiture" },
    { at: 11, text: "la trilogie du Seigneur des Anneaux en version longue" },
    { at: 24, text: "une journée entière, sans dormir" },
    { at: 100, text: "quatre jours et quatre nuits" },
    { at: 151, text: "un mois de travail à plein temps" },
    { at: 500, text: "trois mois de travail à plein temps" },
  ],
  "km-pied": [
    { at: 10, text: "la traversée de Paris d'est en ouest" },
    { at: 21.1, text: "un semi-marathon" },
    { at: 42.2, text: "un marathon" },
    { at: 100, text: "Limoges → Poitiers" },
    { at: 250, text: "Limoges → Nantes" },
    { at: 400, text: "Limoges → Paris" },
    { at: 1_000, text: "Lille → Perpignan" },
    { at: 2_500, text: "un tour de France… à pied" },
  ],
  "km-velo": [
    { at: 50, text: "une sortie de club le dimanche matin" },
    { at: 100, text: "un premier « cent bornes »" },
    { at: 250, text: "Limoges → Nantes" },
    { at: 400, text: "Limoges → Paris" },
    { at: 1_000, text: "Lille → Perpignan" },
    { at: 3_500, text: "un Tour de France complet" },
  ],
  repetitions: [
    { at: 1_000, text: "une répétition par minute pendant seize heures" },
    { at: 10_000, text: "le compte de pas d'une journée bien remplie" },
    { at: 50_000, text: "une répétition toutes les dix minutes pendant un an" },
  ],
};

/** Ce à quoi ressemble un compteur, s'il y a de quoi le dire. */
export function equivalent(ladderId: string, value: number): string | null {
  const echelle = EQUIVALENCES[ladderId];
  if (!echelle) return null;
  const atteint = echelle.filter((e) => value >= e.at);
  return atteint.length ? atteint[atteint.length - 1].text : null;
}

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
 * Paliers que l'historique justifie, avec la date de la séance qui les a fait
 * basculer — et non celle du jour où l'on regarde.
 *
 * C'est la matière que le registre grave, et c'est aussi ce qui permet
 * d'annoncer en fin de séance ce qu'elle vient d'ouvrir.
 */
type Evenement = { at: string; apply: (tally: Tally) => void };

/**
 * Séances et sorties dans un seul fil chronologique.
 *
 * Les deux nourrissent les mêmes compteurs : les mélanger dans l'ordre est ce
 * qui donne des suites de jours justes et des dates de palier exactes.
 */
function evenements(history: SessionLog[], outings: Outing[], weights: WeightEntry[]): Evenement[] {
  const seances: Evenement[] = history
    .filter((s) => s.finishedAt !== null)
    .map((s) => ({ at: s.finishedAt as string, apply: (t: Tally) => addSession(t, s) }));
  const sorties: Evenement[] = outings.map((o) => ({
    at: `${o.date}T12:00:00.000`,
    apply: (t: Tally) => addOuting(t, o),
  }));
  // Une pesée change le poids de référence pour tout ce qui suit : la part du
  // poids de corps se calcule avec le poids de l'époque, pas celui d'aujourd'hui.
  // Placée au matin, avant les séances du jour.
  const pesees: Evenement[] = weights.map((w) => ({
    at: `${w.date}T06:00:00.000`,
    apply: (t: Tally) => {
      t.weightKg = w.kg;
    },
  }));
  return [...seances, ...sorties, ...pesees].sort((a, b) => a.at.localeCompare(b.at));
}

export function derivedUnlocks(
  history: SessionLog[],
  weightKg: number | null = null,
  outings: Outing[] = [],
  weights: WeightEntry[] = []
): Engraved {
  // Le poids du profil sert de départ, avant la première pesée du journal.
  const tally = emptyTally(weightKg);
  const dates: Engraved = {};

  for (const evenement of evenements(history, outings, weights)) {
    evenement.apply(tally);
    for (const echelle of LADDERS) {
      const atteint = echelle.measure(tally);
      echelle.tiers.forEach((palier, i) => {
        const cle = trophyKey(echelle.id, i);
        if (dates[cle] === undefined && atteint >= palier) dates[cle] = evenement.at;
      });
    }
  }

  return dates;
}

/**
 * État de chaque échelle : ce que l'historique montre, complété par ce que le
 * registre a gravé.
 *
 * Les deux ne disent pas la même chose. Le compteur suit l'historique du
 * moment — supprimer une séance le fait baisser. Les paliers, eux, viennent du
 * registre : une médaille obtenue reste obtenue.
 */
export function evaluateLadders(
  history: SessionLog[],
  weightKg: number | null = null,
  engraved: Engraved = {},
  outings: Outing[] = [],
  weights: WeightEntry[] = []
): LadderProgress[] {
  const dates = mergeEngraved(engraved, derivedUnlocks(history, weightKg, outings, weights));

  const tally = emptyTally(weightKg);
  for (const evenement of evenements(history, outings, weights)) evenement.apply(tally);

  return LADDERS.map((ladder) => {
    const unlockedAt = ladder.tiers.map((_, i) => dates[trophyKey(ladder.id, i)] ?? null);
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
