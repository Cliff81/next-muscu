"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { createLocalStore } from "@/lib/createLocalStore";
import { profileStore } from "@/lib/profile";
import { activitiesSchema } from "@/lib/activitiesSchema";
import { parseHistory } from "@/lib/historySchema";
import { mergeWorkouts } from "@/lib/mergeWorkouts";
import type { Activity, NeatLevel } from "@/lib/activities";
import { NEAT_LEVELS } from "@/lib/activities";
import { repairStrings } from "@/lib/repairProgram";
import { activitiesStore, historyStore, neatStore, programStore } from "@/lib/stores";
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
const syncedAtStore = createLocalStore<number>("muscu:syncedAt", 0);

export function useSync(): void {
  const { isAuthenticated } = useConvexAuth();

  const remoteProgram = useQuery(api.programs.get, isAuthenticated ? {} : "skip");
  const remoteProfile = useQuery(api.profiles.get, isAuthenticated ? {} : "skip");
  const remoteWorkouts = useQuery(api.workouts.list, isAuthenticated ? {} : "skip");
  const saveProgram = useMutation(api.programs.save);
  const saveProfile = useMutation(api.profiles.save);
  const saveWorkout = useMutation(api.workouts.save);

  const localProgram = programStore.useValue();
  const localProfile = profileStore.useValue();
  const localActivities = activitiesStore.useValue();
  const localNeat = neatStore.useValue();
  const localHistory = historyStore.useValue();

  // --- descente : le distant est plus récent que ce qu'on a déjà vu
  useEffect(() => {
    if (!isAuthenticated || remoteProgram === undefined || remoteProgram === null) return;
    if (remoteProgram.updatedAt <= syncedAtStore.get()) return;
    programStore.set(repairStrings(remoteProgram.program as Program));
    syncedAtStore.set(remoteProgram.updatedAt);
  }, [isAuthenticated, remoteProgram]);

  // --- remontée du programme : après chaque changement local
  useEffect(() => {
    if (!isAuthenticated || remoteProgram === undefined) return;
    const distant = remoteProgram?.program;
    if (JSON.stringify(distant) === JSON.stringify(localProgram)) return;
    void saveProgram({ program: localProgram })
      .then(() => syncedAtStore.set(Date.now()))
      .catch(() => {
        // Hors ligne : on garde la version locale et on retentera au prochain
        // changement ou à la prochaine ouverture.
      });
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
  }, [isAuthenticated, remoteProfile]);

  /*
   * --- séances réalisées : union par identifiant, dans les deux sens.
   *
   * Une séance terminée ne change plus : il n'y a donc rien à arbitrer, ce qui
   * manque d'un côté est simplement ajouté. C'est plus sûr que la règle du
   * programme, où deux versions du même objet peuvent s'affronter.
   */
  useEffect(() => {
    if (!isAuthenticated || remoteWorkouts === undefined) return;

    const distantes = (parseHistory(remoteWorkouts) ?? []) as SessionLog[];
    const { toStore, toPush } = mergeWorkouts(localHistory, distantes);

    if (toStore) {
      historyStore.set(toStore);
      return;
    }
    for (const seance of toPush) {
      void saveWorkout({ log: seance }).catch(() => {
        // Hors ligne : on retentera au prochain changement ou à l'ouverture.
      });
    }
  }, [isAuthenticated, localHistory, remoteWorkouts, saveWorkout]);

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
      JSON.stringify(remoteProfile.activities ?? []) === JSON.stringify(localActivities);
    if (memes) return;
    void saveProfile({
      heightCm: localProfile.heightCm,
      weightKg: localProfile.weightKg,
      age: localProfile.age,
      sex: localProfile.sex,
      experience: localProfile.experience,
      activities: localActivities,
      neat: localNeat,
    }).catch(() => {
      // Hors ligne : sans effet, on retentera.
    });
  }, [isAuthenticated, localActivities, localNeat, localProfile, remoteProfile, saveProfile]);
}
