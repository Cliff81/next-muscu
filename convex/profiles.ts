import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalSubject, requireSubject } from "./identity";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const subject = await optionalSubject(ctx);
    if (!subject) return null;
    return await ctx.db
      .query("profiles")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
  },
});

const MEASUREMENTS = {
  heightCm: v.union(v.number(), v.null()),
  weightKg: v.union(v.number(), v.null()),
  age: v.union(v.number(), v.null()),
  sex: v.union(
    v.literal("homme"),
    v.literal("femme"),
    v.literal("autre"),
    v.null()
  ),
  experience: v.union(
    v.literal("debutant"),
    v.literal("intermediaire"),
    v.literal("avance"),
    v.null()
  ),
  activities: v.optional(v.any()),
  neat: v.optional(v.string()),
};

/**
 * Crée le profil au premier appel, le met à jour ensuite. Le nom, l'e-mail et
 * la photo viennent du jeton et non du client : ce sont les seules valeurs
 * que le fournisseur d'identité a certifiées.
 */
export const save = mutation({
  args: MEASUREMENTS,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentification requise");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
      .unique();

    const certified = {
      email: identity.email ?? "",
      name: identity.name ?? identity.email ?? "Moi",
      picture: identity.pictureUrl ?? "",
    };

    if (existing) {
      await ctx.db.patch(existing._id, { ...certified, ...args });
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      subject: identity.subject,
      ...certified,
      ...args,
      onboardingDone: false,
    });
  },
});

export const setOnboardingDone = mutation({
  args: { done: v.boolean() },
  handler: async (ctx, { done }) => {
    const subject = await requireSubject(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
    if (!profile) throw new Error("Profil inexistant");
    await ctx.db.patch(profile._id, { onboardingDone: done });
  },
});
