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

export const add = mutation({
  args: { log: v.any() },
  handler: async (ctx, { log }) => {
    const subject = await requireSubject(ctx);
    return await ctx.db.insert("workouts", {
      subject,
      log,
      completedAt: Date.now(),
    });
  },
});
