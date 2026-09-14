import { MUSCLE_GROUPS, type DayTemplate } from "@/lib/generateProgram";

/**
 * Programme dessiné à la main.
 *
 * La personne décide du découpage : combien de journées, quels groupes
 * musculaires dans chacune, combien d'exercices. Le choix des mouvements reste
 * au générateur — c'est lui qui connaît le matériel déclaré, les douleurs à
 * ménager et le temps disponible, et il n'y a pas de raison de redemander tout
 * cela exercice par exercice. Chaque mouvement reste échangeable ensuite.
 */

export type DayDraft = {
  /** Nom voulu, ou vide pour laisser les groupes le composer. */
  title: string;
  /** Identifiants dans `MUSCLE_GROUPS`. */
  groups: string[];
  count: number;
};

export const MIN_EXERCISES = 2;
export const MAX_EXERCISES = 8;

/**
 * Combien d'exercices tiennent dans le temps annoncé. Une estimation large :
 * le générateur rogne ensuite sur le calcul réel des séries et des repos.
 */
export function defaultCount(minutesPerSession: number): number {
  return Math.min(MAX_EXERCISES, Math.max(MIN_EXERCISES, Math.round(minutesPerSession / 12)));
}

export function emptyDrafts(frequency: number, minutesPerSession: number): DayDraft[] {
  return Array.from({ length: frequency }, () => ({
    title: "",
    groups: [],
    count: defaultCount(minutesPerSession),
  }));
}

const groupsOf = (draft: DayDraft) =>
  draft.groups.flatMap((id) => {
    const groupe = MUSCLE_GROUPS.find((g) => g.id === id);
    return groupe ? [groupe] : [];
  });

/** Le nom voulu, sinon celui que composent les groupes choisis. */
export function draftTitle(draft: DayDraft, index: number): string {
  const voulu = draft.title.trim();
  if (voulu) return voulu;
  const noms = groupsOf(draft).map((g) => g.name);
  if (!noms.length) return `Journée ${index + 1}`;
  // Au-delà de trois, l'énumération devient illisible dans un onglet.
  return noms.length <= 3 ? noms.join(" + ") : `${noms.slice(0, 2).join(" + ")} +${noms.length - 2}`;
}

/**
 * Répartit les exercices entre les groupes choisis.
 *
 * Au plus juste, les premiers groupes prenant le reste de la division : c'est
 * l'ordre dans lequel ils ont été cochés, donc celui de leur importance aux
 * yeux de la personne.
 */
export function toTemplate(draft: DayDraft, index: number): DayTemplate {
  const groupes = groupsOf(draft);
  const base = groupes.length ? Math.floor(draft.count / groupes.length) : 0;
  const reste = groupes.length ? draft.count % groupes.length : 0;

  return {
    title: draftTitle(draft, index),
    description: groupes.map((g) => g.name).join(", "),
    sections: groupes
      .map((g, i) => ({ title: g.name, muscles: g.muscles, count: base + (i < reste ? 1 : 0) }))
      .filter((s) => s.count > 0),
  };
}

/** Une journée sans groupe musculaire n'a rien à produire. */
export const draftReady = (draft: DayDraft) => draft.groups.length > 0;

export const draftsReady = (drafts: DayDraft[]) => drafts.length > 0 && drafts.every(draftReady);
