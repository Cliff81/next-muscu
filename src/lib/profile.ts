"use client";

import { createLocalStore } from "@/lib/createLocalStore";

/**
 * Profil de l'utilisateur : son identité Google et ses mensurations.
 *
 * `poidsKg` est le **poids du corps** — à ne pas confondre avec la charge
 * soulevée par série (`set.weight`), que suit déjà l'historique.
 */
export type Profile = {
  sub: string;
  email: string;
  name: string;
  picture: string;
  tailleCm: number | null;
  poidsKg: number | null;
};

export const profileStore = createLocalStore<Profile | null>("muscu:profile", null);

/**
 * Identifiant public du client OAuth. Il n'y a pas de secret ici : l'app n'a
 * pas de serveur, et le flux « Sign in with Google » côté navigateur n'en
 * demande pas.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function googleConfigure(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

export type GoogleClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  exp?: number;
};

/**
 * Décode la charge utile du jeton d'identité.
 *
 * La signature n'est **pas** vérifiée : sans serveur, c'est impossible. Cette
 * connexion identifie donc l'utilisateur, elle ne protège pas les données —
 * qui restent de toute façon lisibles dans le `localStorage` de l'appareil.
 * Les contrôles ci-dessous (destinataire, émetteur, expiration) n'écartent que
 * les jetons manifestement inadaptés.
 */
export function decodeIdToken(jwt: string): GoogleClaims | null {
  const partie = jwt.split(".")[1];
  if (!partie) return null;
  try {
    const b64 = partie.replace(/-/g, "+").replace(/_/g, "/");
    const utf8 = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(utf8) as GoogleClaims;
  } catch {
    return null;
  }
}

const EMETTEURS = ["accounts.google.com", "https://accounts.google.com"];

/** Retourne le profil issu du jeton, ou un message d'erreur. */
export function profilDepuisJeton(jwt: string): Profile | { erreur: string } {
  const c = decodeIdToken(jwt);
  if (!c) return { erreur: "Jeton d'identité illisible." };
  if (c.aud !== GOOGLE_CLIENT_ID) return { erreur: "Jeton émis pour une autre application." };
  if (!EMETTEURS.includes(c.iss ?? "")) return { erreur: "Émetteur inattendu." };
  if (!c.exp || c.exp * 1000 < Date.now()) return { erreur: "Jeton expiré." };
  if (!c.sub || !c.email) return { erreur: "Jeton incomplet." };

  return {
    sub: c.sub,
    email: c.email,
    name: c.name || c.email,
    picture: c.picture || "",
    tailleCm: null,
    poidsKg: null,
  };
}

/** 178 → « 1m78 ». */
export function tailleLisible(cm: number): string {
  return `${Math.floor(cm / 100)}m${String(cm % 100).padStart(2, "0")}`;
}

/** Ligne « 1m78 · 118 kg », vide si les mensurations manquent. */
export function mensurations(p: Profile | null): string {
  if (!p || p.tailleCm === null || p.poidsKg === null) return "";
  return `${tailleLisible(p.tailleCm)} · ${p.poidsKg} kg`;
}

/**
 * Retire d'un sous-titre les mensurations qu'il contiendrait déjà.
 *
 * Les programmes enregistrés avant l'arrivée du profil portent « 1m78 · 118 kg »
 * dans leur sous-titre, et ils vivent dans le `localStorage` du navigateur :
 * sans ce nettoyage, l'en-tête afficherait la taille et le poids deux fois.
 */
export function sansMensurations(sousTitre: string): string {
  return sousTitre
    .replace(/^\s*\d+\s*m\s*\d+\s*·\s*[\d.,]+\s*kg\s*(·\s*)?/i, "")
    .trim();
}
