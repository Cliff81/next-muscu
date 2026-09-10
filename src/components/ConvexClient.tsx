"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { useCallback, useMemo } from "react";
import { tokenStore, tokenValide } from "@/lib/googleToken";

/**
 * Client Convex et pont d'authentification.
 *
 * Convex vérifie lui-même la signature du jeton Google (voir
 * `convex/auth.config.ts`). Ici on ne fait que le lui présenter.
 *
 * Sans jeton — ou avec un jeton expiré — Convex considère l'appelant comme
 * anonyme : ses requêtes rendent `null`, et l'application continue de
 * fonctionner sur le `localStorage`. C'est la dégradation attendue, pas une
 * panne.
 */
const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
const client = url ? new ConvexReactClient(url) : null;

function useGoogleAuth() {
  const jwt = tokenStore.useValue();
  const valide = tokenValide(jwt);

  const fetchAccessToken = useCallback(async () => {
    const courant = tokenStore.get();
    // Aucun renouvellement silencieux possible : le flux navigateur de Google
    // ne délivre pas de jeton de rafraîchissement. Un jeton périmé est donc
    // écarté, et l'utilisateur reclique sur le bouton quand il le souhaite.
    if (!tokenValide(courant)) {
      if (courant) tokenStore.clear();
      return null;
    }
    return courant;
  }, []);

  return useMemo(
    () => ({ isLoading: false, isAuthenticated: valide, fetchAccessToken }),
    [valide, fetchAccessToken]
  );
}

export function ConvexClient({ children }: { children: React.ReactNode }) {
  if (!client) return <>{children}</>;
  return (
    <ConvexProviderWithAuth client={client} useAuth={useGoogleAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
