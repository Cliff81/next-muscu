import { build } from "esbuild";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * Les tests sont des scripts Node qui lisent des bibliothèques TypeScript.
 * Node ne résout pas les alias `@/…` du projet : on regroupe chaque module de
 * `src/lib` en un fichier .mjs autonome, puis on lance chaque test. Un test
 * échoue en sortant avec un code non nul.
 */
const LIBS = [
  "achievements", "bodyWeight", "calendar", "customProgram", "deload", "lastWrite", "mergeProgram",
  "mergeWorkouts", "muscleVolume", "notes", "outings", "overload", "progressData",
  "settings", "timedSet", "trophies", "warmup", "week", "weightCoach",
];

await build({
  entryPoints: LIBS.map((l) => `src/lib/${l}.ts`),
  bundle: true,
  format: "esm",
  platform: "node",
  outdir: ".tests-build",
  // Les tests importent des .mjs : sans cette extension, Node lirait des .js
  // comme du CommonJS et refuserait les `import`.
  outExtension: { ".js": ".mjs" },
  logLevel: "warning",
});

const fichiers = readdirSync("tests").filter((f) => f.endsWith(".test.mjs")).sort();
let echecs = 0;
for (const f of fichiers) {
  console.log(`\n▶ ${f}`);
  const r = spawnSync(process.execPath, [`tests/${f}`], { stdio: "inherit" });
  if (r.status !== 0) echecs++;
}
console.log(`\n${fichiers.length} fichier(s) de test, ${echecs} en échec`);
process.exit(echecs ? 1 : 0);
