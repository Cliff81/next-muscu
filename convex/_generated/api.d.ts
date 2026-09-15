/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as identity from "../identity.js";
import type * as libraries from "../libraries.js";
import type * as notes from "../notes.js";
import type * as outings from "../outings.js";
import type * as profiles from "../profiles.js";
import type * as programs from "../programs.js";
import type * as shares from "../shares.js";
import type * as stamped from "../stamped.js";
import type * as trophies from "../trophies.js";
import type * as weights from "../weights.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  identity: typeof identity;
  libraries: typeof libraries;
  notes: typeof notes;
  outings: typeof outings;
  profiles: typeof profiles;
  programs: typeof programs;
  shares: typeof shares;
  stamped: typeof stamped;
  trophies: typeof trophies;
  weights: typeof weights;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
