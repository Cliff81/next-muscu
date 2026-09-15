import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";
import { mergeStamped } from "./stamped";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return [];
    const row = await ctx.db
      .query("weights")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return (row?.entries ?? []) as unknown[];
  },
});

/**
 * Fond les pesées reçues dans le journal, jour par jour : la version la plus
 * récente de chaque jour l'emporte, à date égale celle déjà en place. Même
 * règle que les sorties et les notes, appliquée ici pour que deux appareils
 * n'aient pas à se voir.
 */
export const merge = mutation({
  args: { entries: v.any() },
  handler: async (ctx, { entries }) => {
    const subject = await requireSubject(ctx);
    const row = await ctx.db
      .query("weights")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();

    const union = mergeStamped(row?.entries, entries, "date");

    if (row) await ctx.db.patch(row._id, { entries: union, updatedAt: Date.now() });
    else await ctx.db.insert("weights", { subject, entries: union, updatedAt: Date.now() });
    return union;
  },
});
