import { defaultProgram } from "@/data/defaultProgram";
import { activitiesSchema } from "@/lib/activitiesSchema";
import { parseHistory } from "@/lib/historySchema";
import { GOALS, type Goal } from "@/lib/nutrition";
import { NEAT_LEVELS, type Activity, type NeatLevel } from "@/lib/activities";
import { createLocalStore } from "@/lib/createLocalStore";
import { programSchema } from "@/lib/programSchema";
import { repairStrings } from "@/lib/repairProgram";
import { parseOutings, type Outing } from "@/lib/outings";
import { parseEngraved, type Engraved } from "@/lib/trophies";
import type { Program, SessionLog } from "@/lib/types";

const programStoreRaw = createLocalStore<Program>(
  "muscu:program",
  defaultProgram,
  (valeur) => {
    const r = programSchema.safeParse(valeur);
    return r.success ? repairStrings(r.data as Program) : null;
  }
);

/**
 * Quand le programme local a changé pour la dernière fois.
 *
 * Sans cette date, la synchronisation ne savait pas laquelle des deux versions
 * était la plus récente : elle remontait dès que local et distant différaient,
 * si bien qu'un appareil resté en arrière écrasait le travail fait ailleurs.
 */
export const programTouchedAt = createLocalStore<number>("muscu:programTouchedAt", 0);

/**
 * Toute écriture locale horodate le programme. Passer par cet objet plutôt que
 * par le magasin brut évite d'avoir à penser à l'horodatage sur chacun des
 * points d'écriture — il y en a huit, en oublier un se verrait par une
 * modification qui ne remonte jamais.
 */
export const programStore = {
  useValue: programStoreRaw.useValue,
  get: programStoreRaw.get,
  set(value: Program) {
    programStoreRaw.set(value);
    programTouchedAt.set(Date.now());
  },
  clear() {
    programStoreRaw.clear();
    programTouchedAt.set(Date.now());
  },
  /** Écriture venue de Convex : ce n'est pas une modification locale. */
  setFromRemote(value: Program, updatedAt: number) {
    programStoreRaw.set(value);
    programTouchedAt.set(updatedAt);
  },
  /**
   * Écriture automatique — reprise, rattachement au catalogue — qui ne vient
   * pas d'un geste : l'horodatage ne bouge pas.
   *
   * Sans cette distinction, un appareil n'ayant que le programme par défaut
   * l'enrichissait au chargement, se déclarait « modifié à l'instant », et
   * écrasait dans Convex le vrai programme d'un autre appareil. C'est arrivé.
   */
  setDerived(value: Program) {
    programStoreRaw.set(value);
  },
  /** Après une remontée réussie : on se cale sur l'heure du serveur. */
  markSynced(updatedAt: number) {
    programTouchedAt.set(updatedAt);
  },
};

/**
 * Reprise des installations d'avant l'horodatage. Un programme déjà présent en
 * local peut contenir des modifications jamais remontées — c'est le cas quand
 * la session Google avait expiré sans le dire. On le déclare donc récent, pour
 * qu'il parte vers Convex au lieu d'être écrasé par une copie plus ancienne.
 */
export function seedProgramTimestamp(): void {
  if (typeof window === "undefined") return;
  if (programTouchedAt.get() > 0) return;
  if (window.localStorage.getItem("muscu:program") === null) return;
  programTouchedAt.set(Date.now());
}
export const historyStore = createLocalStore<SessionLog[]>("muscu:history", [], (value) =>
  parseHistory(value) as SessionLog[] | null
);
export const activeSessionStore = createLocalStore<SessionLog | null>("muscu:activeSession", null);

const outingsRaw = createLocalStore<Outing[]>("muscu:outings", [], parseOutings);
export const outingsTouchedAt = createLocalStore<number>("muscu:outingsTouchedAt", 0);

/**
 * Sorties enregistrées. Même règle que le programme : une sortie se corrige et
 * se supprime, donc chaque écriture locale s'horodate pour que l'arbitrage
 * sache qui, de cet appareil ou de Convex, a la version récente.
 */
export const outingsStore = {
  useValue: outingsRaw.useValue,
  get: outingsRaw.get,
  set(value: Outing[]) {
    outingsRaw.set(value);
    outingsTouchedAt.set(Date.now());
  },
  /** Écriture venue de Convex : ce n'est pas une modification locale. */
  setFromRemote(value: Outing[], updatedAt: number) {
    outingsRaw.set(value);
    outingsTouchedAt.set(updatedAt);
  },
  markSynced(updatedAt: number) {
    outingsTouchedAt.set(updatedAt);
  },
};

/**
 * Hauts faits gravés — voir `trophies.ts`. Le registre fait foi : une séance
 * supprimée ne reprend pas une médaille.
 */
export const trophyStore = createLocalStore<Engraved>("muscu:trophies", {}, parseEngraved);

/**
 * Séances supprimées, gardées par leur identifiant.
 *
 * L'historique se synchronise par union : sans ce registre, une séance effacée
 * ici redescendrait de Convex au passage suivant. Il tient aussi l'ordre de
 * suppression jusqu'au retour du réseau.
 */
export const deletedWorkoutsStore = createLocalStore<string[]>(
  "muscu:deletedWorkouts",
  [],
  (valeur) =>
    Array.isArray(valeur) && valeur.every((id) => typeof id === "string")
      ? (valeur as string[])
      : null
);

/** Sports pratiqués en plus du programme, saisis par la personne. */
export const activitiesStore = createLocalStore<Activity[]>("muscu:activities", [], (value) => {
  const r = activitiesSchema.safeParse(value);
  return r.success ? (r.data as Activity[]) : null;
});

/** Niveau d'activité de la vie courante, hors sport. */
export const neatStore = createLocalStore<NeatLevel>("muscu:neat", "sedentary", (value) =>
  NEAT_LEVELS.some((l) => l.id === value) ? (value as NeatLevel) : null
);

/** Objectif alimentaire : prise de masse, maintien ou sèche. */
export const goalStore = createLocalStore<Goal>("muscu:goal", "masse", (value) =>
  GOALS.some((g) => g.id === value) ? (value as Goal) : null
);
