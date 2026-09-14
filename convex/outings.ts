import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return null;
    const row = await ctx.db
      .query("outings")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return row ? { outings: row.outings, updatedAt: row.updatedAt } : null;
  },
});

/** Enregistre le journal de sorties, et rend l'heure retenue par le serveur. */
export const save = mutation({
  args: { outings: v.any() },
  handler: async (ctx, { outings }) => {
    const subject = await requireSubject(ctx);
    const updatedAt = Date.now();
    const row = await ctx.db
      .query("outings")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { outings, updatedAt });
      return { id: row._id, updatedAt };
    }
    const id = await ctx.db.insert("outings", { subject, outings, updatedAt });
    return { id, updatedAt };
  },
});
