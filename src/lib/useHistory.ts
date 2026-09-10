"use client";

import { historyStore } from "@/lib/stores";

export function useHistory() {
  const history = historyStore.useValue();
  return { history };
}
