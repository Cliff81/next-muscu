import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return null;
    const row = await ctx.db
      .query("libraries")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return row ? { entries: row.entries, updatedAt: row.updatedAt } : null;
  },
});

/** Enregistre la bibliothèque, et rend l'heure retenue par le serveur. */
export const save = mutation({
  args: { entries: v.any() },
  handler: async (ctx, { entries }) => {
    const subject = await requireSubject(ctx);
    const updatedAt = Date.now();
    const row = await ctx.db
      .query("libraries")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { entries, updatedAt });
      return { id: row._id, updatedAt };
    }
    const id = await ctx.db.insert("libraries", { subject, entries, updatedAt });
    return { id, updatedAt };
  },
});
