import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Identité de l'appelant, vérifiée par Convex à partir du jeton.
 *
 * Le `subject` ne doit **jamais** venir d'un argument de la fonction : ce
 * serait laisser n'importe qui lire les données d'un autre en devinant un
 * identifiant. Il vient du jeton, dont Convex a vérifié la signature.
 *
 * Liste d'accès : la variable d'environnement `ALLOWED_EMAILS` (adresses
 * séparées par des virgules, casse indifférente) restreint qui peut écrire et
 * lire ses données. Vide ou absente, tout compte Google passe — c'était le cas
 * jusqu'ici, et deux inconnus s'en sont servis. Un compte hors liste est traité
 * comme non connecté : ses lectures rendent vide, ses écritures échouent.
 */
function allowed(email: string | undefined): boolean {
  const liste = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!liste.length) return true;
  return email !== undefined && liste.includes(email.toLowerCase());
}

export async function requireSubject(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentification requise");
  if (!allowed(identity.email)) throw new Error("Compte non autorisé");
  return identity.subject;
}

/** Variante tolérante, pour les lectures qui peuvent rendre `null`. */
export async function optionalSubject(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || !allowed(identity.email)) return null;
  return identity.subject;
}

/** Ce que le client peut savoir de son propre accès, sans lever d'erreur. */
export async function accessOf(ctx: QueryCtx): Promise<{ signedIn: boolean; allowed: boolean }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { signedIn: false, allowed: false };
  return { signedIn: true, allowed: allowed(identity.email) };
}
