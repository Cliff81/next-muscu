import { decideByTimestamp } from "../.tests-build/lastWrite.mjs";
import { decideProgramSync } from "../.tests-build/mergeProgram.mjs";

let ko = 0;
const eq = (nom, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { ko++; console.log(`✗ ${nom}\n   attendu ${JSON.stringify(b)}\n   obtenu  ${JSON.stringify(a)}`); }
  else console.log(`✓ ${nom}`);
};

// --- règle commune
eq("rien nulle part", decideByTimestamp([], 0, null), { action: "none" });
eq("rien là-bas, du travail ici", decideByTimestamp(["a"], 5, null), { action: "push" });
eq("le distant est plus récent", decideByTimestamp(["a"], 5, { value: ["b"], updatedAt: 9 }), { action: "pull", value: ["b"], updatedAt: 9 });
eq("le local est plus récent et diffère", decideByTimestamp(["a"], 12, { value: ["b"], updatedAt: 9 }), { action: "push" });
eq("le local est plus récent mais identique", decideByTimestamp(["a"], 12, { value: ["a"], updatedAt: 9 }), { action: "none" });
eq("même horodatage : on se tait", decideByTimestamp(["a"], 9, { value: ["b"], updatedAt: 9 }), { action: "none" });
eq("égalité profonde, pas de référence", decideByTimestamp({ x: [1, { y: 2 }] }, 12, { value: { x: [1, { y: 2 }] }, updatedAt: 9 }), { action: "none" });

// --- le programme garde son contrat
const prog = { title: "T", days: [] };
eq("programme : rien à faire", decideProgramSync(prog, 0, null), { action: "none" });
eq("programme : remontée initiale", decideProgramSync(prog, 5, null), { action: "push" });
eq("programme : descente", decideProgramSync(prog, 5, { program: { title: "U" }, updatedAt: 9 }), { action: "pull", program: { title: "U" }, updatedAt: 9 });
eq("programme : remontée", decideProgramSync(prog, 12, { program: { title: "U" }, updatedAt: 9 }), { action: "push" });
eq("programme : identique, on se tait", decideProgramSync(prog, 12, { program: prog, updatedAt: 9 }), { action: "none" });
eq("programme : un appareil en retard n'écrase rien", decideProgramSync(prog, 1, { program: { title: "U" }, updatedAt: 1000 }).action, "pull");

console.log(ko ? `\n${ko} échec(s)` : "\nTout passe");
process.exit(ko ? 1 : 0);
