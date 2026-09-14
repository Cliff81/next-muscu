"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, Ref } from "react";

type Glissement = {
  /** Catégorie dans laquelle le geste a commencé. */
  section: number;
  id: string;
  /** Ordre au départ, pour savoir si quelque chose a bougé. */
  depart: string[];
  ordre: string[];
};

type ProprietesPoignee = {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  style: CSSProperties;
};

/**
 * Réordonner une liste au doigt ou à la souris.
 *
 * Écrit avec les événements « pointer » plutôt qu'avec l'API glisser-déposer
 * du navigateur : celle-ci ne se déclenche pas au toucher, et le programme se
 * modifie aussi depuis le téléphone.
 *
 * Un seul geste à la fois, et il retient l'index de sa catégorie : un exercice
 * ne peut donc pas changer de catégorie en glissant, seulement changer de rang
 * chez lui.
 *
 * L'ordre n'est enregistré qu'au relâchement, et seulement s'il a changé.
 * Pendant le geste il ne vit qu'ici : écrire dans le magasin à chaque
 * croisement déclencherait autant de synchronisations.
 */
export function useReorder(commit: (section: number, ordre: string[]) => void) {
  const [glissement, setGlissement] = useState<Glissement | null>(null);
  const [decalage, setDecalage] = useState(0);
  const lignes = useRef(new Map<string, HTMLElement>());
  // Ordonnée du pointeur au départ, corrigée à chaque échange pour que la
  // ligne reste sous le doigt malgré le saut de place.
  const origine = useRef(0);

  const noter = useCallback((id: string, element: HTMLElement | null) => {
    if (element) lignes.current.set(id, element);
    else lignes.current.delete(id);
  }, []);

  const arreter = () => {
    setGlissement(null);
    setDecalage(0);
  };

  const deplacer = (e: PointerEvent<HTMLElement>) => {
    if (!glissement) return;
    const soi = lignes.current.get(glissement.id);
    if (!soi) return;

    /*
     * Un geste rapide franchit plusieurs rangs entre deux événements : on
     * consomme les croisements en boucle plutôt qu'un seul par mouvement.
     *
     * Rien n'est réaffiché pendant la boucle, donc les lignes voisines gardent
     * leur position à l'écran : elles servent de mètre. Ce qui bouge, c'est la
     * place de la ligne tirée — suivie ici à la main.
     */
    let ordre = glissement.ordre;
    let reference = origine.current;
    let delta = e.clientY - reference;
    let place = soi.getBoundingClientRect().top - decalage;

    for (;;) {
      const index = ordre.indexOf(glissement.id);
      const sens = delta < 0 ? -1 : 1;
      const voisinId = ordre[index + sens];
      const voisin = voisinId ? lignes.current.get(voisinId) : undefined;
      if (!voisin) break;
      const pas = Math.abs(voisin.getBoundingClientRect().top - place);
      // Passé la moitié du voisin, les deux échangent leurs places.
      if (pas === 0 || Math.abs(delta) <= pas / 2) break;
      ordre = ordre.with(index, voisinId).with(index + sens, glissement.id);
      reference += sens * pas;
      place += sens * pas;
      delta = e.clientY - reference;
    }

    origine.current = reference;
    if (ordre !== glissement.ordre) setGlissement({ ...glissement, ordre });
    setDecalage(delta);
  };

  const poignee = (section: number, ids: string[], id: string): ProprietesPoignee => ({
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      origine.current = e.clientY;
      setDecalage(0);
      setGlissement({ section, id, depart: ids, ordre: ids });
    },
    onPointerMove: deplacer,
    onPointerUp: () => {
      if (!glissement) return;
      const bouge = glissement.ordre.some((x, i) => x !== glissement.depart[i]);
      if (bouge) commit(glissement.section, glissement.ordre);
      arreter();
    },
    // Geste interrompu par le navigateur : on ne garde rien.
    onPointerCancel: arreter,
    onKeyDown: (e) => {
      if (e.key === "Escape") return arreter();
      const sens = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      if (!sens) return;
      const index = ids.indexOf(id);
      const cible = index + sens;
      if (cible < 0 || cible >= ids.length) return;
      e.preventDefault();
      const ordre = [...ids];
      ordre[index] = ids[cible];
      ordre[cible] = id;
      commit(section, ordre);
    },
    style: { touchAction: "none" },
  });

  return {
    /** Ordre à afficher : celui du geste en cours, sinon celui du programme. */
    ordre: (section: number, ids: string[]): string[] =>
      glissement && glissement.section === section ? glissement.ordre : ids,
    poignee,
    ligne: (section: number, id: string) => {
      const actif = glissement?.section === section && glissement.id === id;
      return {
        ref: ((element: HTMLElement | null) => noter(id, element)) as Ref<HTMLDivElement>,
        style: actif
          ? ({ transform: `translateY(${decalage}px)`, position: "relative", zIndex: 10 } as const)
          : undefined,
        actif,
      };
    },
  };
}
