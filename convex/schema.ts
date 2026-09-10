import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Une ligne par utilisateur et par donnée, indexée sur le `subject` de
 * l'identité — l'identifiant stable du fournisseur d'identité, et non
 * l'adresse e-mail, qui peut changer.
 *
 * `program` et `log` sont stockés en `v.any()` : leur forme est déjà décrite
 * et validée par le schéma zod du client (`programSchema`). La dupliquer en
 * validateurs Convex ferait deux définitions à maintenir, qui divergeraient.
 */
export default defineSchema({
  profiles: defineTable({
    subject: v.string(),
    email: v.string(),
    name: v.string(),
    picture: v.string(),
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
    onboardingDone: v.boolean(),
    /*
     * Sports déclarés et niveau de vie courante. Facultatifs : les profils
     * enregistrés avant leur arrivée doivent rester valides. `activities` est
     * en `v.any()` comme `program`, sa forme étant décrite côté client par
     * `activitiesSchema`.
     */
    activities: v.optional(v.any()),
    neat: v.optional(v.string()),
  }).index("by_subject", ["subject"]),

  programs: defineTable({
    subject: v.string(),
    program: v.any(),
    updatedAt: v.number(),
  }).index("by_subject", ["subject"]),

  /*
   * Séances réalisées. Nommée `workouts` et non `sessions` : si l'application
   * adopte plus tard une bibliothèque d'authentification, celle-ci créera ses
   * propres tables de sessions, et la confusion serait garantie.
   */
  workouts: defineTable({
    subject: v.string(),
    log: v.any(),
    completedAt: v.number(),
  })
    .index("by_subject", ["subject"])
    .index("by_subject_and_date", ["subject", "completedAt"]),
});
