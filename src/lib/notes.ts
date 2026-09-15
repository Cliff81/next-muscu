/**
 * Notes personnelles par exercice.
 *
 * Ce que le programme ne dit pas et qu'on oublie d'une semaine sur l'autre :
 * le cran du siège, la largeur de prise, « ne pas cambrer », le banc qui
 * grince. Une note par exercice, rattachée au **nom** et non à la journée :
 * le même mouvement dans deux journées partage sa note, et changer de
 * programme ne la perd pas.
 *
 * Chaque note porte sa propre date de modification. C'est elle qui arbitre
 * entre deux appareils, note par note : corriger la note du squat ici ne
 * touche pas celle du curl écrite là-bas. Effacer une note la vide sans la
 * retirer — une absence ne saurait pas dire qu'elle est voulue, une note vide
 * datée le dit.
 */

export type Note = {
  text: string;
  /** Date de la dernière modification, en millisecondes depuis l'époque. */
  updatedAt: number;
};

/** Nom de l'exercice → note. */
export type Notes = Record<string, Note>;

export const NOTE_MAX_LENGTH = 500;

export function parseNotes(valeur: unknown): Notes | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const notes: Notes = {};
  for (const [nom, note] of Object.entries(valeur as Record<string, unknown>)) {
    if (!nom || typeof note !== "object" || note === null) continue;
    const { text, updatedAt } = note as Record<string, unknown>;
    if (typeof text !== "string" || typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) continue;
    notes[nom] = { text: text.slice(0, NOTE_MAX_LENGTH), updatedAt };
  }
  return notes;
}

/** Écrit la note d'un exercice ; un texte vide l'efface. */
export function setNote(notes: Notes, exerciseName: string, text: string, now: number = Date.now()): Notes {
  const propre = text.trim().slice(0, NOTE_MAX_LENGTH);
  const connue = notes[exerciseName];
  if (!connue && propre === "") return notes;
  if (connue && connue.text === propre) return notes;
  return { ...notes, [exerciseName]: { text: propre, updatedAt: now } };
}

/** Le texte de la note, ou `null` s'il n'y en a pas — ou plus. */
export function noteFor(notes: Notes, exerciseName: string): string | null {
  const texte = notes[exerciseName]?.text ?? "";
  return texte === "" ? null : texte;
}

/**
 * Union de deux registres, note par note : la plus récente l'emporte, et à
 * date égale la base est conservée. L'ordre des arguments compte donc, et il
 * est le même partout : la base, c'est ce qui est déjà en place.
 */
export function mergeNotes(base: Notes, incoming: Notes): Notes {
  const union: Notes = { ...base };
  for (const [nom, note] of Object.entries(incoming)) {
    const connue = union[nom];
    if (!connue || note.updatedAt > connue.updatedAt) union[nom] = note;
  }
  return union;
}

export function sameNotes(a: Notes, b: Notes): boolean {
  const nomsA = Object.keys(a);
  if (nomsA.length !== Object.keys(b).length) return false;
  return nomsA.every((nom) => b[nom] !== undefined && a[nom].text === b[nom].text && a[nom].updatedAt === b[nom].updatedAt);
}

export type NotesSync = {
  /** Registre à réécrire ici, ou `null` s'il n'y a rien à changer. */
  toStore: Notes | null;
  /** Notes à remonter — celles qui sont plus récentes ici —, ou `null`. */
  toPush: Notes | null;
};

/**
 * Rapproche les notes locales et distantes.
 *
 * Une seule chose à la fois, comme pour les hauts faits : si le distant
 * apporte du nouveau, on l'écrit ici et on ne remonte rien ; l'écriture
 * relance le calcul, qui remontera au tour suivant ce qui est plus récent ici.
 * À date égale, c'est le distant qui fait foi — le serveur applique la même
 * règle, les deux côtés convergent.
 */
export function decideNotesSync(local: Notes, remote: Notes): NotesSync {
  const union = mergeNotes(remote, local);
  if (!sameNotes(union, local)) return { toStore: union, toPush: null };
  const toPush: Notes = {};
  for (const [nom, note] of Object.entries(local)) {
    const distante = remote[nom];
    if (!distante || note.updatedAt > distante.updatedAt) toPush[nom] = note;
  }
  return { toStore: null, toPush: Object.keys(toPush).length ? toPush : null };
}
