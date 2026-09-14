import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSubject } from "./identity";

/**
 * Alphabet sans caractères jumeaux : ni O/0, ni I/1/l. Un code se recopie
 * parfois à la main quand la caméra ne veut rien savoir.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LONGUEUR = 8;

function tirerCode(): string {
  let code = "";
  for (let i = 0; i < LONGUEUR; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** Programme partagé, lisible sans être connecté : c'est tout l'objet du lien. */
export const get = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const row = await ctx.db
      .query("shares")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    return row ? { title: row.title, program: row.program, createdAt: row.createdAt } : null;
  },
});

/**
 * Publie le programme et rend son code.
 *
 * Partager deux fois le même programme rend le même code : sans cette reprise,
 * chaque ouverture de la fenêtre créerait une ligne et un QR différents pour la
 * même chose.
 */
export const create = mutation({
  args: { program: v.any(), title: v.string() },
  handler: async (ctx, { program, title }) => {
    const subject = await requireSubject(ctx);
    const signature = JSON.stringify(program);

    const siens = await ctx.db
      .query("shares")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .collect();
    const deja = siens.find((s) => JSON.stringify(s.program) === signature);
    if (deja) return { code: deja.code };

    for (let essai = 0; essai < 5; essai++) {
      const code = tirerCode();
      const pris = await ctx.db
        .query("shares")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (pris) continue;
      await ctx.db.insert("shares", {
        code,
        subject,
        title,
        program,
        createdAt: Date.now(),
      });
      return { code };
    }
    throw new Error("Impossible de tirer un code libre");
  },
});

/** Retire un partage : le lien cesse de fonctionner. */
export const revoke = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const subject = await requireSubject(ctx);
    const row = await ctx.db
      .query("shares")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    // Seul l'auteur du partage peut le retirer.
    if (!row || row.subject !== subject) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});
