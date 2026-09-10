<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Conventions de ce projet

- **Identifiants en anglais** : variables, fonctions, types, composants, tables
  et colonnes. Le code d'origine l'était déjà (`createLocalStore`, `useProgram`,
  `Program`, `SessionLog`) — mélanger les langues rend le code illisible.
- **Commentaires et textes d'interface en français.**
- Un renommage qui touche une clé de `localStorage` ou une colonne doit prévoir
  la reprise des données existantes, pas les perdre en silence.
