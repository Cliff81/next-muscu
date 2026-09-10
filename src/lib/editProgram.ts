import { catalogDetails, setsAndReps } from "@/lib/generateProgram";
import { MUSCLE_LABELS, type CatalogExercise, type Muscle } from "@/lib/catalog";
import type { Day, Exercise, Program, Section } from "@/lib/types";

/**
 * Modifications du programme faites à la main.
 *
 * Fonctions pures, séparées du rendu : ce sont elles qui décident, et elles
 * sont vérifiables sans navigateur. Chacune rend un nouveau programme et
 * laisse l'appelant l'enregistrer — la synchronisation Convex observe le
 * magasin et remonte le changement d'elle-même.
 */

/** Un identifiant de journée encore libre. */
function freeDayId(program: Program): string {
  const used = new Set(program.days.map((d) => d.id));
  for (let n = 1; n < 1000; n++) {
    if (!used.has(`j${n}`)) return `j${n}`;
  }
  return `j-${Date.now().toString(36)}`;
}

/** Un identifiant d'exercice encore libre dans tout le programme. */
function freeExerciseId(program: Program, prefix: string): string {
  const used = new Set(
    program.days.flatMap((d) => d.sections.flatMap((s) => s.exercises.map((e) => e.id)))
  );
  for (let n = 1; n < 1000; n++) {
    const candidate = `${prefix}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/**
 * Remet d'aplomb ce qui dépend du nombre de journées : les codes affichés sur
 * les onglets, et les compteurs de l'en-tête. Au mieux : on ne touche qu'aux
 * entrées dont le libellé est reconnu, pour ne pas réécrire un en-tête que la
 * personne aurait voulu autrement.
 */
function refreshCounts(program: Program): Program {
  const count = program.days.length;
  return {
    ...program,
    titleAccent: /^\d+\s+jours?$/.test(program.titleAccent)
      ? `${count} jour${count > 1 ? "s" : ""}`
      : program.titleAccent,
    statsRow: program.statsRow.map((stat) => {
      if (stat.label === "Séances/sem") return { ...stat, value: String(count) };
      if (stat.label === "Jours off") return { ...stat, value: String(Math.max(0, 7 - count)) };
      return stat;
    }),
    days: program.days.map((day, index) => ({
      ...day,
      code: `J${index + 1}`,
      restInfo: { ...day.restInfo, suggestedDay: WEEKDAYS[Math.round((index * 7) / count) % 7] },
    })),
  };
}

/** Applique une transformation à une seule journée. */
function onDay(program: Program, dayId: string, change: (day: Day) => Day): Program {
  return {
    ...program,
    days: program.days.map((day) => (day.id === dayId ? change(day) : day)),
  };
}

export function addDay(program: Program): { program: Program; dayId: string } {
  const id = freeDayId(program);
  const day: Day = {
    id,
    code: `J${program.days.length + 1}`,
    title: "Nouvelle journée",
    description: "À composer",
    muscleTags: [],
    sections: [],
    restInfo: { duration: "60 min", warmup: "5–10 min", suggestedDay: "Lundi" },
    tips: [],
  };
  return {
    program: refreshCounts({ ...program, days: [...program.days, day] }),
    dayId: id,
  };
}

/**
 * Retire une journée. La dernière ne peut pas partir : un programme sans
 * journée n'a plus rien à afficher, et le schéma le refuse.
 */
export function removeDay(program: Program, dayId: string): Program {
  if (program.days.length <= 1) return program;
  return refreshCounts({ ...program, days: program.days.filter((d) => d.id !== dayId) });
}

export function renameDay(program: Program, dayId: string, title: string, description: string): Program {
  return onDay(program, dayId, (day) => ({ ...day, title, description }));
}

/** Les étiquettes de muscles affichées sous le titre, déduites des catégories. */
function refreshTags(day: Day): Day {
  const labels = [
    ...new Set(
      day.sections.flatMap((s) => (s.muscles ?? []).map((m) => MUSCLE_LABELS[m as Muscle] ?? m))
    ),
  ];
  return { ...day, muscleTags: labels.slice(0, 4) };
}

export function addSection(
  program: Program,
  dayId: string,
  title: string,
  muscles: string[]
): Program {
  const section: Section = { title, muscles, exercises: [] };
  return onDay(program, dayId, (day) =>
    refreshTags({ ...day, sections: [...day.sections, section] })
  );
}

export function renameSection(
  program: Program,
  dayId: string,
  index: number,
  title: string
): Program {
  return onDay(program, dayId, (day) => ({
    ...day,
    sections: day.sections.map((s, i) => (i === index ? { ...s, title } : s)),
  }));
}

export function removeSection(program: Program, dayId: string, index: number): Program {
  return onDay(program, dayId, (day) =>
    refreshTags({ ...day, sections: day.sections.filter((_, i) => i !== index) })
  );
}

/**
 * Ajoute un exercice du catalogue à une catégorie. Séries, répétitions et
 * repos reprennent les réglages du générateur selon la nature du mouvement :
 * un exercice posé à la main est programmé comme les autres.
 */
export function addExercise(
  program: Program,
  dayId: string,
  sectionIndex: number,
  entry: CatalogExercise
): Program {
  const compound = entry.mechanic === "compound";
  const day = program.days.find((d) => d.id === dayId);
  const slug = (day?.sections[sectionIndex]?.title ?? "exo").toLowerCase().replace(/\W+/g, "");
  const exercise: Exercise = {
    id: freeExerciseId(program, `${dayId}-${slug}`),
    name: entry.name,
    catalogId: entry.id,
    images: entry.images,
    ...catalogDetails(entry),
    ...setsAndReps("split", compound),
  };
  return onDay(program, dayId, (d) => ({
    ...d,
    sections: d.sections.map((s, i) =>
      i === sectionIndex ? { ...s, exercises: [...s.exercises, exercise] } : s
    ),
  }));
}

export function removeExercise(program: Program, dayId: string, exerciseId: string): Program {
  return onDay(program, dayId, (day) => ({
    ...day,
    sections: day.sections.map((s) => ({
      ...s,
      exercises: s.exercises.filter((e) => e.id !== exerciseId),
    })),
  }));
}

/** Séries et répétitions, réglées à la main. */
export function setSetsAndReps(
  program: Program,
  dayId: string,
  exerciseId: string,
  series: number,
  reps: string
): Program {
  return onDay(program, dayId, (day) => ({
    ...day,
    sections: day.sections.map((s) => ({
      ...s,
      exercises: s.exercises.map((e) =>
        e.id === exerciseId ? { ...e, series, reps } : e
      ),
    })),
  }));
}
