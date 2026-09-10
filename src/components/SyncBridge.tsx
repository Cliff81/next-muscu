"use client";

import { useSync } from "@/lib/sync";

/**
 * Monte la synchronisation, sans rien afficher.
 *
 * Placé à l'intérieur du fournisseur Convex mais à l'extérieur de la porte
 * d'entrée : la remontée doit tourner même pendant l'assistant, sinon un
 * programme construit avant d'atteindre l'application ne partirait jamais.
 */
export function SyncBridge() {
  useSync();
  return null;
}
