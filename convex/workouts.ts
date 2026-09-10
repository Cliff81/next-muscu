import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return [];
    const rows = await ctx.db
      .query("workouts")
      .withIndex("by_subject_and_date", (q) => q.eq("subject", subject))
      .order("desc")
      .collect();
    return rows.map((r) => r.log);
  },
});

/**
 * Enregistre une séance réalisée, sans jamais la dupliquer.
 *
 * Idempotente par l'identifiant du journal : la synchronisation peut rejouer
 * la même séance — au retour du réseau, depuis un second appareil — sans
 * empiler les lignes. La date retenue est celle de la **fin de séance** et non
 * celle de l'écriture : c'est elle qui ordonne l'historique, et une séance
 * remontée trois jours plus tard n'a pas à passer pour la plus récente.
 */
export const save = mutation({
  args: { log: v.any() },
  handler: async (ctx, { log }) => {
    const subject = await requireSubject(ctx);

    const journal = log as { id?: unknown; finishedAt?: unknown } | null;
    const logId = typeof journal?.id === "string" ? journal.id : null;
    if (!logId) throw new Error("Séance sans identifiant");

    const fin = typeof journal?.finishedAt === "string" ? Date.parse(journal.finishedAt) : NaN;
    const completedAt = Number.isFinite(fin) ? fin : Date.now();

    const existing = await ctx.db
      .query("workouts")
      .withIndex("by_subject_and_log", (q) => q.eq("subject", subject).eq("logId", logId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { log, completedAt });
      return existing._id;
    }
    return await ctx.db.insert("workouts", { subject, log, completedAt, logId });
  },
});
