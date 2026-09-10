import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Identité de l'appelant, vérifiée par Convex à partir du jeton.
 *
 * Le `subject` ne doit **jamais** venir d'un argument de la fonction : ce
 * serait laisser n'importe qui lire les données d'un autre en devinant un
 * identifiant. Il vient du jeton, dont Convex a vérifié la signature.
 */
export async function requireSubject(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentification requise");
  return identity.subject;
}

/** Variante tolérante, pour les lectures qui peuvent rendre `null`. */
export async function optionalSubject(
  ctx: QueryCtx | MutationCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity ? identity.subject : null;
}
