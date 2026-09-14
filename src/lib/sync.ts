"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { profileStore } from "@/lib/profile";
import { activitiesSchema } from "@/lib/activitiesSchema";
import { parseHistory } from "@/lib/historySchema";
import { mergeWorkouts } from "@/lib/mergeWorkouts";
import type { Activity, NeatLevel } from "@/lib/activities";
import { NEAT_LEVELS } from "@/lib/activities";
import { GOALS, type Goal } from "@/lib/nutrition";
import { decideProgramSync } from "@/lib/mergeProgram";
import { decideWeightsSync, parseWeights } from "@/lib/bodyWeight";
import { decideOutingsSync, parseOutings } from "@/lib/outings";
import {
  decideLibrarySync,
  libraryStore,
  libraryTouchedAt,
  markLibrarySynced,
  parseLibrary,
  setLibraryFromRemote,
} from "@/lib/programLibrary";
import { DEFAULT_SETTINGS, parseSettings, sameSettings } from "@/lib/settings";
import { parseDeloads, purgeExpired } from "@/lib/deload";
import { decideTrophySync, type Engraved } from "@/lib/trophies";
import { repairStrings } from "@/lib/repairProgram";
import {
  activitiesStore,
  deletedWorkoutsStore,
  goalStore,
  historyStore,
  neatStore,
  outingsStore,
  outingsTouchedAt,
  programStore,
  programTouchedAt,
  seedProgramTimestamp,
  deloadsStore,
  settingsStore,
  trophyStore,
  weightsStore,
  weightsTouchedAt,
} from "@/lib/stores";
import type { Program, SessionLog } from "@/lib/types";

/**
 * Synchronisation locale-d'abord.
 *
 * Le `localStorage` reste le magasin de travail : l'application s'affiche et
 * s'utilise sans réseau, ce qui compte dans une salle en sous-sol. Convex sert
 * de dépôt commun entre appareils.
 *
 * Arbitrage : on ne descend une version distante que si elle est **plus
 * récente** que la dernière synchronisation connue. Sans cette comparaison, un
 * appareil resté hors ligne écraserait au démarrage le travail fait ailleurs —
 * ou l'inverse.
 */

export function useSync(): void {
  const { isAuthenticated } = useConvexAuth();

  const remoteProgram = useQuery(api.programs.get, isAuthenticated ? {} : "skip");
  const remoteProfile = useQuery(api.profiles.get, isAuthenticated ? {} : "skip");
  const remoteWorkouts = useQuery(api.workouts.list, isAuthenticated ? {} : "skip");
  const remoteRemoved = useQuery(api.workouts.removed, isAuthenticated ? {} : "skip");
  const remoteTrophies = useQuery(api.trophies.get, isAuthenticated ? {} : "skip");
  const remoteOutings = useQuery(api.outings.get, isAuthenticated ? {} : "skip");
  const remoteLibrary = useQuery(api.libraries.get, isAuthenticated ? {} : "skip");
  const remoteWeights = useQuery(api.weights.get, isAuthenticated ? {} : "skip");
  const saveProgram = useMutation(api.programs.save);
  const saveProfile = useMutation(api.profiles.save);
  const saveWorkout = useMutation(api.workouts.save);
  const removeWorkout = useMutation(api.workouts.remove);
  const mergeTrophies = useMutation(api.trophies.merge);
  const saveOutings = useMutation(api.outings.save);
  const saveLibrary = useMutation(api.libraries.save);
  const saveWeights = useMutation(api.weights.save);

  const localProgram = programStore.useValue();
  const localProfile = profileStore.useValue();
  const localActivities = activitiesStore.useValue();
  const localNeat = neatStore.useValue();
  const localGoal = goalStore.useValue();
  const localSettings = settingsStore.useValue();
  const localDeloads = deloadsStore.useValue();
  const localHistory = historyStore.useValue();
  const localDeleted = deletedWorkoutsStore.useValue();
  const localTrophies = trophyStore.useValue();
  const localOutings = outingsStore.useValue();
  const localLibrary = libraryStore.useValue();
  const localWeights = weightsStore.useValue();

  // Les installations d'avant l'horodatage déclarent leur programme récent,
  // une fois, pour qu'il remonte au lieu d'être écrasé. Dans un effet : écrire
  // dans le `localStorage` pendant le rendu est un effet de bord déplacé.
  useEffect(seedProgramTimestamp, []);

  /*
   * --- programme : c'est la date de modification qui tranche.
   *
   * La version la plus récemment modifiée gagne, qu'elle soit ici ou là-bas.
   * Auparavant la remontée partait dès que les deux versions différaient, sans
   * regarder les dates : un appareil ouvert après coup renvoyait sa copie
   * périmée et effaçait le travail fait ailleurs.
   */
  useEffect(() => {
    if (!isAuthenticated || remoteProgram === undefined) return;
    const decision = decideProgramSync(localProgram, programTouchedAt.get(), remoteProgram);

    if (decision.action === "pull") {
      programStore.setFromRemote(
        repairStrings(decision.program as Program),
        decision.updatedAt
      );
      return;
    }
    if (decision.action === "push") {
      void saveProgram({ program: localProgram })
        .then((r) => programStore.markSynced(r.updatedAt))
        .catch(() => {
          // Hors ligne : on garde la version locale et on retentera au prochain
          // changement ou à la prochaine ouverture.
        });
    }
  }, [isAuthenticated, localProgram, remoteProgram, saveProgram]);

  // --- descente des sports : uniquement si rien n'a encore été saisi ici.
  // Sans cette réserve, une saisie faite hors ligne serait écrasée au retour
  // du réseau par la version d'un autre appareil.
  useEffect(() => {
    if (!isAuthenticated || !remoteProfile) return;
    if (activitiesStore.get().length > 0) return;
    const parsed = activitiesSchema.safeParse(remoteProfile.activities ?? []);
    if (parsed.success && parsed.data.length) {
      activitiesStore.set(parsed.data as Activity[]);
    }
    if (NEAT_LEVELS.some((l) => l.id === remoteProfile.neat)) {
      neatStore.set(remoteProfile.neat as NeatLevel);
    }
    if (GOALS.some((g) => g.id === remoteProfile.goal)) {
      goalStore.set(remoteProfile.goal as Goal);
    }
  }, [isAuthenticated, remoteProfile]);

  // --- descente des allègements : uniquement si rien n'est décidé ici.
  useEffect(() => {
    if (!isAuthenticated || !remoteProfile) return;
    if (deloadsStore.get().length > 0) return;
    const distants = purgeExpired(parseDeloads(remoteProfile.deloads) ?? []);
    if (distants.length) deloadsStore.set(distants);
  }, [isAuthenticated, remoteProfile]);

  // --- descente des réglages : uniquement si les réglages d'ici sont encore
  // ceux par défaut, pour la même raison que les sports.
  useEffect(() => {
    if (!isAuthenticated || !remoteProfile) return;
    if (!sameSettings(settingsStore.get(), DEFAULT_SETTINGS)) return;
    const distants = parseSettings(remoteProfile.settings);
    if (distants && !sameSettings(distants, DEFAULT_SETTINGS)) settingsStore.set(distants);
  }, [isAuthenticated, remoteProfile]);

  /*
   * --- séances réalisées : union par identifiant, dans les deux sens.
   *
   * Une séance terminée ne change plus : il n'y a donc rien à arbitrer, ce qui
   * manque d'un côté est simplement ajouté. C'est plus sûr que la règle du
   * programme, où deux versions du même objet peuvent s'affronter.
   *
   * Seule la suppression échappe à cette symétrie : une absence ne se distingue
   * pas d'une séance jamais reçue. Les deux côtés tiennent donc la liste de ce
   * qui a été supprimé, et c'est elle qui circule.
   */
  useEffect(() => {
    if (!isAuthenticated || remoteWorkouts === undefined || remoteRemoved === undefined) return;

    const distantes = (parseHistory(remoteWorkouts) ?? []) as SessionLog[];
    const { toStore, toPush, toRemove, toForget } = mergeWorkouts(
      localHistory,
      distantes,
      localDeleted,
      remoteRemoved
    );

    if (toForget.length) {
      deletedWorkoutsStore.set([...localDeleted, ...toForget]);
      return;
    }
    if (toStore) {
      historyStore.set(toStore);
      return;
    }
    for (const seance of toPush) {
      void saveWorkout({ log: seance }).catch(() => {
        // Hors ligne : on retentera au prochain changement ou à l'ouverture.
      });
    }
    for (const id of toRemove) {
      void removeWorkout({ logId: id }).catch(() => {
        // Hors ligne : la séance reste inscrite au registre, l'ordre repartira.
      });
    }
  }, [
    isAuthenticated,
    localDeleted,
    localHistory,
    remoteRemoved,
    remoteWorkouts,
    removeWorkout,
    saveWorkout,
  ]);

  /*
   * --- hauts faits gravés : union dans les deux sens.
   *
   * Un registre ne perd jamais rien, donc rien à arbitrer non plus : ce qui
   * manque d'un côté est ajouté. L'union finale se refait côté serveur, pour
   * qu'un second appareil ne puisse pas écraser ce que le premier vient
   * d'inscrire.
   */
  useEffect(() => {
    if (!isAuthenticated || remoteTrophies === undefined) return;
    const { toStore, toPush } = decideTrophySync(localTrophies, (remoteTrophies ?? {}) as Engraved);
    if (toStore) {
      trophyStore.set(toStore);
      return;
    }
    if (toPush) {
      void mergeTrophies({ entries: toPush }).catch(() => {
        // Hors ligne : le registre reste ici, on retentera.
      });
    }
  }, [isAuthenticated, localTrophies, mergeTrophies, remoteTrophies]);

  // --- sorties : arbitrage par date, comme le programme
  useEffect(() => {
    if (!isAuthenticated || remoteOutings === undefined) return;
    const decision = decideOutingsSync(localOutings, outingsTouchedAt.get(), remoteOutings);
    if (decision.action === "pull") {
      outingsStore.setFromRemote(parseOutings(decision.outings) ?? [], decision.updatedAt);
      return;
    }
    if (decision.action === "push") {
      void saveOutings({ outings: localOutings })
        .then((r) => outingsStore.markSynced(r.updatedAt))
        .catch(() => {
          // Hors ligne : on retentera au prochain changement.
        });
    }
  }, [isAuthenticated, localOutings, remoteOutings, saveOutings]);

  // --- programmes gardés : arbitrage par date, comme le programme actif
  useEffect(() => {
    if (!isAuthenticated || remoteLibrary === undefined) return;
    const decision = decideLibrarySync(localLibrary, libraryTouchedAt.get(), remoteLibrary);
    if (decision.action === "pull") {
      setLibraryFromRemote(parseLibrary(decision.entries) ?? [], decision.updatedAt);
      return;
    }
    if (decision.action === "push") {
      void saveLibrary({ entries: localLibrary })
        .then((r) => markLibrarySynced(r.updatedAt))
        .catch(() => {
          // Hors ligne : on retentera au prochain changement.
        });
    }
  }, [isAuthenticated, localLibrary, remoteLibrary, saveLibrary]);

  // --- pesées : arbitrage par date, comme le programme
  useEffect(() => {
    if (!isAuthenticated || remoteWeights === undefined) return;
    const decision = decideWeightsSync(localWeights, weightsTouchedAt.get(), remoteWeights);
    if (decision.action === "pull") {
      weightsStore.setFromRemote(parseWeights(decision.entries) ?? [], decision.updatedAt);
      return;
    }
    if (decision.action === "push") {
      void saveWeights({ entries: localWeights })
        .then((r) => weightsStore.markSynced(r.updatedAt))
        .catch(() => {
          // Hors ligne : on retentera au prochain changement.
        });
    }
  }, [isAuthenticated, localWeights, remoteWeights, saveWeights]);

  // --- remontée du profil : les mensurations, le reste vient du jeton
  useEffect(() => {
    if (!isAuthenticated || !localProfile || remoteProfile === undefined) return;
    const memes =
      remoteProfile &&
      remoteProfile.heightCm === localProfile.heightCm &&
      remoteProfile.weightKg === localProfile.weightKg &&
      remoteProfile.age === localProfile.age &&
      remoteProfile.sex === localProfile.sex &&
      remoteProfile.experience === localProfile.experience &&
      remoteProfile.neat === localNeat &&
      remoteProfile.goal === localGoal &&
      JSON.stringify(remoteProfile.activities ?? []) === JSON.stringify(localActivities) &&
      sameSettings(parseSettings(remoteProfile.settings) ?? DEFAULT_SETTINGS, localSettings) &&
      JSON.stringify(remoteProfile.deloads ?? []) === JSON.stringify(localDeloads);
    if (memes) return;
    void saveProfile({
      heightCm: localProfile.heightCm,
      weightKg: localProfile.weightKg,
      age: localProfile.age,
      sex: localProfile.sex,
      experience: localProfile.experience,
      activities: localActivities,
      neat: localNeat,
      goal: localGoal,
      settings: localSettings,
      deloads: localDeloads,
    }).catch(() => {
      // Hors ligne : sans effet, on retentera.
    });
  }, [
    isAuthenticated,
    localActivities,
    localGoal,
    localNeat,
    localDeloads,
    localProfile,
    localSettings,
    remoteProfile,
    saveProfile,
  ]);
}
