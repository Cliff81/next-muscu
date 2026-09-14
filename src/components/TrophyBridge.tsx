"use client";

import { useEffect } from "react";
import { derivedUnlocks } from "@/lib/achievements";
import { profileStore } from "@/lib/profile";
import { historyStore, outingsStore, trophyStore } from "@/lib/stores";
import { mergeEngraved, sameEngraved } from "@/lib/trophies";

/**
 * Grave les paliers que l'historique justifie.
 *
 * Le registre ne fait que grandir : ce qui a été obtenu le reste, même si la
 * séance qui l'a permis est supprimée ensuite. L'écriture n'a lieu que si le
 * registre change vraiment — sans quoi elle relancerait la remontée Convex à
 * chaque passage.
 */
export function TrophyBridge() {
  const history = historyStore.useValue();
  const profile = profileStore.useValue();
  const poids = profile?.weightKg ?? null;
  const sorties = outingsStore.useValue();

  useEffect(() => {
    const registre = trophyStore.get();
    const fusion = mergeEngraved(registre, derivedUnlocks(history, poids, sorties));
    if (!sameEngraved(registre, fusion)) trophyStore.set(fusion);
  }, [history, poids, sorties]);

  return null;
}
