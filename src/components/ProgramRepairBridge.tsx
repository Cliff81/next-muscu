"use client";

import { useEffect, useRef } from "react";
import { loadCatalog } from "@/lib/catalog";
import { enrichWithCatalog } from "@/lib/repairProgram";
import { programStore } from "@/lib/stores";

/**
 * Rattache au catalogue les programmes enregistrés avant que l'identité
 * catalogue y soit portée, une fois par chargement.
 *
 * Le catalogue arrive par le réseau, donc la reprise ne peut pas se faire dans
 * le magasin, qui est synchrone. Elle tourne ici et n'écrit que si quelque
 * chose a changé : sans cette comparaison, l'écriture relancerait la
 * remontée Convex à chaque passage.
 */
export function ProgramRepairBridge() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void loadCatalog()
      .then((catalog) => {
        const current = programStore.get();
        const enriched = enrichWithCatalog(current, catalog);
        if (JSON.stringify(enriched) !== JSON.stringify(current)) {
          programStore.set(enriched);
        }
      })
      .catch(() => {
        // Hors ligne : la reprise attendra la prochaine ouverture.
      });
  }, []);

  return null;
}
