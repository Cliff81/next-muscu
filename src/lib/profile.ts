"use client";

import { createLocalStore } from "@/lib/createLocalStore";

/**
 * Profil de l'utilisateur : son identité Google et ses mensurations.
 *
 * `weightKg` est le **poids du corps** — à ne pas confondre avec la charge
 * soulevée par série (`set.weight`), que suit déjà l'historique.
 */
export type Sex = "homme" | "femme" | "autre";
export type Experience = "debutant" | "intermediaire" | "avance";

export type Profile = {
  subject: string;
  email: string;
  name: string;
  picture: string;
  /** Tout ce qui suit est facultatif : l'étape d'informations est passable. */
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  experience: Experience | null;
};

/** Profil vierge, rattaché à une identité. */
export function emptyProfile(
  base: Pick<Profile, "subject" | "email" | "name" | "picture">
): Profile {
  return {
    ...base,
    heightCm: null,
    weightKg: null,
    age: null,
    sex: null,
    experience: null,
  };
}

/**
 * Reprise des profils enregistrés sous les anciens noms français. Sans ça, la
 * taille et le poids déjà saisis disparaîtraient silencieusement au premier
 * chargement suivant le renommage.
 */
type LegacyProfile = Partial<Profile> & {
  sub?: string;
  tailleCm?: number | null;
  poidsKg?: number | null;
  sexe?: Sex | null;
};

function migrate(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const v = value as LegacyProfile;
  const subject = v.subject ?? v.sub;
  if (typeof subject !== "string") return null;
  return {
    subject,
    email: v.email ?? "",
    name: v.name ?? "Moi",
    picture: v.picture ?? "",
    heightCm: v.heightCm ?? v.tailleCm ?? null,
    weightKg: v.weightKg ?? v.poidsKg ?? null,
    age: v.age ?? null,
    sex: v.sex ?? v.sexe ?? null,
    experience: v.experience ?? null,
  };
}

export const profileStore = createLocalStore<Profile | null>(
  "muscu:profile",
  null,
  (value) => (value === null ? null : migrate(value))
);

/**
 * Identifiant public du client OAuth. Il n'y a pas de secret ici : l'app n'a
 * pas de serveur, et le flux « Sign in with Google » côté navigateur n'en
 * demande pas.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function googleConfigured(): boolean {
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
 * La signature n'est **pas** vérifiée ici : sans serveur, c'est impossible.
 * C'est le backend Convex qui la vérifie, contre les clés publiques de Google.
 * Les contrôles ci-dessous (destinataire, émetteur, expiration) n'écartent que
 * les jetons manifestement inadaptés.
 */
export function decodeIdToken(jwt: string): GoogleClaims | null {
  const payload = jwt.split(".")[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
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

const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

/** Retourne le profil issu du jeton, ou un message d'erreur. */
export function profileFromToken(jwt: string): Profile | { error: string } {
  const c = decodeIdToken(jwt);
  if (!c) return { error: "Jeton d'identité illisible." };
  if (c.aud !== GOOGLE_CLIENT_ID) return { error: "Jeton émis pour une autre application." };
  if (!ISSUERS.includes(c.iss ?? "")) return { error: "Émetteur inattendu." };
  if (!c.exp || c.exp * 1000 < Date.now()) return { error: "Jeton expiré." };
  if (!c.sub || !c.email) return { error: "Jeton incomplet." };

  return emptyProfile({
    subject: c.sub,
    email: c.email,
    name: c.name || c.email,
    picture: c.picture || "",
  });
}

/** 178 → « 1m78 ». */
export function formatHeight(cm: number): string {
  return `${Math.floor(cm / 100)}m${String(cm % 100).padStart(2, "0")}`;
}

/** Ligne « 1m78 · 118 kg », vide si les mensurations manquent. */
export function measurementsLine(profile: Profile | null): string {
  if (!profile || profile.heightCm === null || profile.weightKg === null) return "";
  return `${formatHeight(profile.heightCm)} · ${profile.weightKg} kg`;
}

/**
 * Retire d'un sous-titre les mensurations qu'il contiendrait déjà.
 *
 * Les programmes enregistrés avant l'arrivée du profil portent « 1m78 · 118 kg »
 * dans leur sous-titre : sans ce nettoyage, l'en-tête les afficherait deux fois.
 */
export function withoutMeasurements(subtitle: string): string {
  return subtitle
    .replace(/^\s*\d+\s*m\s*\d+\s*·\s*[\d.,]+\s*kg\s*(·\s*)?/i, "")
    .trim();
}
