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
import { repairStrings } from "@/lib/repairProgram";
import {
  activitiesStore,
  deletedWorkoutsStore,
  goalStore,
  historyStore,
  neatStore,
  programStore,
  programTouchedAt,
  seedProgramTimestamp,
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
  const saveProgram = useMutation(api.programs.save);
  const saveProfile = useMutation(api.profiles.save);
  const saveWorkout = useMutation(api.workouts.save);
  const removeWorkout = useMutation(api.workouts.remove);

  const localProgram = programStore.useValue();
  const localProfile = profileStore.useValue();
  const localActivities = activitiesStore.useValue();
  const localNeat = neatStore.useValue();
  const localGoal = goalStore.useValue();
  const localHistory = historyStore.useValue();
  const localDeleted = deletedWorkoutsStore.useValue();

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
      goal: localGoal,
    }).catch(() => {
      // Hors ligne : sans effet, on retentera.
    });
  }, [isAuthenticated, localActivities, localGoal, localNeat, localProfile, remoteProfile, saveProfile]);
}
