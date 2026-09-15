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
      .query("outings")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return (row?.outings ?? []) as unknown[];
  },
});

/**
 * Fond les sorties reçues dans le journal, sortie par sortie : la version la
 * plus récente de chacune l'emporte, à date égale celle déjà en place. L'union
 * se fait **ici**, comme pour les notes : deux appareils qui écrivent coup sur
 * coup n'ont pas à se voir, le second n'efface pas la sortie du premier.
 */
export const merge = mutation({
  args: { entries: v.any() },
  handler: async (ctx, { entries }) => {
    const subject = await requireSubject(ctx);
    const row = await ctx.db
      .query("outings")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();

    const union = mergeStamped(row?.outings, entries, "id");

    if (row) await ctx.db.patch(row._id, { outings: union, updatedAt: Date.now() });
    else await ctx.db.insert("outings", { subject, outings: union, updatedAt: Date.now() });
    return union;
  },
});
