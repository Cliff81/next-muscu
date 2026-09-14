import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return {};
    const row = await ctx.db
      .query("trophies")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return row?.entries ?? {};
  },
});

/**
 * Ajoute des paliers au registre, sans jamais en retirer.
 *
 * L'union se fait **ici** et non chez l'appelant : deux appareils qui écrivent
 * coup sur coup n'ont pas à se voir, le second ne peut pas effacer ce que le
 * premier vient d'inscrire. En cas de dates différentes pour un même palier,
 * la plus ancienne gagne — il n'a été franchi qu'une fois.
 */
export const merge = mutation({
  args: { entries: v.any() },
  handler: async (ctx, { entries }) => {
    const subject = await requireSubject(ctx);
    const recues = (entries ?? {}) as Record<string, unknown>;

    const row = await ctx.db
      .query("trophies")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();

    const union: Record<string, string> = { ...((row?.entries ?? {}) as Record<string, string>) };
    for (const [cle, date] of Object.entries(recues)) {
      if (typeof date !== "string") continue;
      const connue = union[cle];
      if (connue === undefined || date < connue) union[cle] = date;
    }

    if (row) await ctx.db.patch(row._id, { entries: union, updatedAt: Date.now() });
    else await ctx.db.insert("trophies", { subject, entries: union, updatedAt: Date.now() });
    return union;
  },
});
