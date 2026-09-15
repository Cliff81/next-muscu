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
    goal: v.optional(v.string()),
    settings: v.optional(v.any()),
    deloads: v.optional(v.any()),
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
    /*
     * Identifiant de la séance, recopié du journal pour être indexable. C'est
     * lui qui rend l'écriture idempotente : deux appareils qui remontent la
     * même séance produisent une ligne, pas deux. Facultatif pour que d'anciennes
     * lignes sans ce champ restent valides.
     */
    logId: v.optional(v.string()),
    /*
     * Date de suppression. La ligne survit à la suppression, vidée de son
     * journal : il ne reste qu'un identifiant, de quoi dire aux autres
     * appareils que la séance a disparu. Effacer la ligne entière la ferait
     * revenir dès qu'un appareil resté hors ligne remonterait sa copie.
     */
    deletedAt: v.optional(v.number()),
  })
    .index("by_subject", ["subject"])
    .index("by_subject_and_date", ["subject", "completedAt"])
    .index("by_subject_and_log", ["subject", "logId"]),

  /*
   * Hauts faits gravés : `palier → date`. Une ligne par personne, le détail en
   * `v.any()` comme ailleurs — sa forme est décrite côté client.
   *
   * Ce registre ne fait que grandir, ce qui dispense d'arbitrer : deux
   * appareils qui ont vécu des choses différentes voient leurs registres
   * s'unir, et la date la plus ancienne l'emporte.
   */
  /* Sorties enregistrées : course, vélo, rando. Arbitrées par date de
   * modification, comme le programme — une sortie se corrige et se supprime,
   * donc l'union ne suffirait pas. */
  outings: defineTable({
    subject: v.string(),
    outings: v.any(),
    updatedAt: v.number(),
  }).index("by_subject", ["subject"]),

  /*
   * Programmes partagés par lien.
   *
   * Le code voyage dans un QR : c'est lui qu'on montre, pas le programme. Un
   * programme complet pèse une vingtaine de kilo-octets, bien au-delà de ce
   * qu'un QR sait porter — et un lien court reste lisible même froissé.
   */
  shares: defineTable({
    code: v.string(),
    subject: v.string(),
    title: v.string(),
    program: v.any(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_subject", ["subject"]),

  /* Pesées : un journal par personne, arbitré par date de modification — une
   * pesée se corrige et se supprime. */
  weights: defineTable({
    subject: v.string(),
    entries: v.any(),
    updatedAt: v.number(),
  }).index("by_subject", ["subject"]),

  /* Programmes gardés de côté. La table `programs` ne porte que celui qui est
   * actif : l'archive a la sienne, arbitrée par date de modification. */
  libraries: defineTable({
    subject: v.string(),
    entries: v.any(),
    updatedAt: v.number(),
  }).index("by_subject", ["subject"]),

  trophies: defineTable({
    subject: v.string(),
    entries: v.any(),
    updatedAt: v.number(),
  }).index("by_subject", ["subject"]),

  /* Notes personnelles par exercice : `nom → { texte, date }`. Une ligne par
   * personne ; l'arbitrage se fait note par note, la plus récente l'emporte —
   * voir `notes.ts` côté client. */
  notes: defineTable({
    subject: v.string(),
    entries: v.any(),
    updatedAt: v.number(),
  }).index("by_subject", ["subject"]),
});
