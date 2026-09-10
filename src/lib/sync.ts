"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { createLocalStore } from "@/lib/createLocalStore";
import { profileStore } from "@/lib/profile";
import { programStore } from "@/lib/stores";
import type { Program } from "@/lib/types";

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
  const saveProgram = useMutation(api.programs.save);
  const saveProfile = useMutation(api.profiles.save);

  const localProgram = programStore.useValue();
  const localProfile = profileStore.useValue();

  // --- descente : le distant est plus récent que ce qu'on a déjà vu
  useEffect(() => {
    if (!isAuthenticated || remoteProgram === undefined || remoteProgram === null) return;
    if (remoteProgram.updatedAt <= syncedAtStore.get()) return;
    programStore.set(remoteProgram.program as Program);
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

  // --- remontée du profil : les mensurations, le reste vient du jeton
  useEffect(() => {
    if (!isAuthenticated || !localProfile || remoteProfile === undefined) return;
    const memes =
      remoteProfile &&
      remoteProfile.heightCm === localProfile.heightCm &&
      remoteProfile.weightKg === localProfile.weightKg &&
      remoteProfile.age === localProfile.age &&
      remoteProfile.sex === localProfile.sex &&
      remoteProfile.experience === localProfile.experience;
    if (memes) return;
    void saveProfile({
      heightCm: localProfile.heightCm,
      weightKg: localProfile.weightKg,
      age: localProfile.age,
      sex: localProfile.sex,
      experience: localProfile.experience,
    }).catch(() => {
      // Hors ligne : sans effet, on retentera.
    });
  }, [isAuthenticated, localProfile, remoteProfile, saveProfile]);
}
