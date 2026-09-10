"use client";

import { useConvexAuth } from "convex/react";
import { mountGoogleButton } from "@/lib/googleButton";
import { tokenStore, tokenValide } from "@/lib/googleToken";
import { googleConfigured, type Profile } from "@/lib/profile";

/**
 * État de la synchronisation, et moyen de la rétablir.
 *
 * Le jeton Google vit une heure et le flux navigateur n'en délivre aucun de
 * rafraîchissement : passé ce délai, la remontée vers Convex s'arrête. Sans
 * cet encart elle s'arrêterait sans un mot, et on ne découvrirait le problème
 * qu'en trouvant la base vide.
 */
export function SyncStatus({ profile }: { profile: Profile }) {
  const { isAuthenticated } = useConvexAuth();
  const hasToken = tokenValide(tokenStore.useValue());

  // Un profil local assumé n'a rien à synchroniser : ne rien promettre.
  if (!googleConfigured() || profile.subject === "local") {
    return (
      <p className="px-3 py-2 text-[0.7rem] leading-snug text-muted">
        Compte local : tes données restent sur cet appareil.
      </p>
    );
  }

  if (isAuthenticated && hasToken) {
    return (
      <p className="px-3 py-2 text-[0.7rem] leading-snug text-pos">
        Synchronisé avec ton compte Google.
      </p>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="text-[0.7rem] leading-snug text-accent2">
        Session Google expirée : tes données ne remontent plus. Reconnecte-toi
        pour les retrouver sur tes autres appareils.
      </p>
      <div
        ref={(el) => {
          if (el) void mountGoogleButton(el, (jwt) => tokenStore.set(jwt));
        }}
        className="mt-2 flex justify-center"
      />
    </div>
  );
}
