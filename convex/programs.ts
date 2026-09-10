import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return null;
    const row = await ctx.db
      .query("programs")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    // L'horodatage remonte au client : c'est lui qui permet de décider si la
    // version distante est plus récente que la locale, au lieu d'écraser à
    // l'aveugle.
    return row ? { program: row.program, updatedAt: row.updatedAt } : null;
  },
});

/** Un seul programme actif par utilisateur : on remplace, on n'empile pas. */
export const save = mutation({
  args: { program: v.any() },
  handler: async (ctx, { program }) => {
    const subject = await requireSubject(ctx);
    const existing = await ctx.db
      .query("programs")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    const data = { subject, program, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("programs", data);
  },
});
