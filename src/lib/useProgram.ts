"use client";

import { programStore } from "@/lib/stores";

export function useProgram() {
  const program = programStore.useValue();

  return {
    program,
    setProgram: programStore.set,
    resetProgram: programStore.clear,
  };
}
