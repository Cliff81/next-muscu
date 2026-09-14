import { query } from "./_generated/server";
import { accessOf } from "./identity";

/**
 * L'accès du compte connecté. Sert à l'afficher : un compte hors liste
 * paraîtrait connecté — nom et photo viennent du jeton — alors que rien ne
 * remonte. Il faut le dire.
 */
export const me = query({
  args: {},
  handler: async (ctx) => accessOf(ctx),
});
