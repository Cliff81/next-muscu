export type Exercise = {
  id: string;
  name: string;
  sub?: string;
  series: number;
  reps: string;
  restLabel: string;
  restSeconds: number;
  tip?: string;
  /** Nom du fichier de démonstration dans /public/exos (ex: "squat.gif"). */
  demo?: string;
  /** Identifiant dans le catalogue, qui permet de proposer des équivalents. */
  catalogId?: string;
  /** Photos début/fin du mouvement, chemins relatifs au dépôt d'origine. */
  images?: string[];
};

export type Section = {
  title: string;
  exercises: Exercise[];
  /**
   * Muscles visés, en clés du catalogue (`chest`, `lats`…). Sert à proposer un
   * remplaçant qui travaille bien la même chose que l'exercice remplacé.
   */
  muscles?: string[];
};

export type RestInfo = {
  duration: string;
  warmup: string;
  suggestedDay: string;
};

export type Day = {
  id: string;
  code: string;
  title: string;
  description: string;
  muscleTags: string[];
  sections: Section[];
  restInfo: RestInfo;
  tips: string[];
};

export type NutritionCard = {
  icon: string;
  title: string;
  text: string;
};

export type Program = {
  tag: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  statsRow: { value: string; label: string }[];
  days: Day[];
  nutrition: NutritionCard[];
};

export type SetLog = {
  setIndex: number;
  weight: number | null;
  reps: string;
  completed: boolean;
};

export type ExerciseLog = {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
};

export type SessionLog = {
  id: string;
  dayId: string;
  dayCode: string;
  dayTitle: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  exercises: ExerciseLog[];
};
