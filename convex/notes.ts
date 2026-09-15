import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return {};
    const row = await ctx.db
      .query("notes")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    return row?.entries ?? {};
  },
});

type Note = { text: string; updatedAt: number };

/**
 * Fond les notes reçues dans le registre, note par note : la plus récente
 * l'emporte, à date égale celle déjà en place reste. L'union se fait **ici**,
 * comme pour les hauts faits : deux appareils qui écrivent coup sur coup
 * n'ont pas à se voir, le second n'efface pas ce que le premier a écrit sur
 * un autre exercice.
 */
export const merge = mutation({
  args: { entries: v.any() },
  handler: async (ctx, { entries }) => {
    const subject = await requireSubject(ctx);
    const recues = (entries ?? {}) as Record<string, unknown>;

    const row = await ctx.db
      .query("notes")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();

    const union: Record<string, Note> = { ...((row?.entries ?? {}) as Record<string, Note>) };
    for (const [nom, note] of Object.entries(recues)) {
      if (typeof note !== "object" || note === null) continue;
      const { text, updatedAt } = note as Record<string, unknown>;
      if (typeof text !== "string" || typeof updatedAt !== "number") continue;
      const connue = union[nom];
      if (!connue || updatedAt > connue.updatedAt) union[nom] = { text: text.slice(0, 500), updatedAt };
    }

    if (row) await ctx.db.patch(row._id, { entries: union, updatedAt: Date.now() });
    else await ctx.db.insert("notes", { subject, entries: union, updatedAt: Date.now() });
    return union;
  },
});
