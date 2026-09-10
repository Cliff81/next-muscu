"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

/**
 * @param valider Contrôle facultatif de la valeur relue. Le `localStorage` est
 *   modifiable à la main et survit aux changements de format : sans ce filet,
 *   une donnée corrompue casse l'application au chargement, sans recours dans
 *   l'interface.
 */
export function createLocalStore<T>(
  key: string,
  defaultValue: T,
  valider?: (valeur: unknown) => T | null
) {
  let cached: T = defaultValue;
  let initialized = false;
  const listeners = new Set<Listener>();

  function readFromStorage(): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      const brut: unknown = JSON.parse(raw);
      if (!valider) return brut as T;
      const valide = valider(brut);
      if (valide !== null) return valide;
      // Donnée illisible : on repart du défaut plutôt que de planter, et on
      // écarte la valeur fautive pour ne pas la relire à chaque visite.
      console.warn(`[${key}] contenu invalide, réglage remis à sa valeur par défaut`);
      window.localStorage.removeItem(key);
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function getSnapshot(): T {
    if (!initialized) {
      cached = readFromStorage();
      initialized = true;
    }
    return cached;
  }

  function getServerSnapshot(): T {
    return defaultValue;
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        cached = readFromStorage();
        initialized = true;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function set(value: T) {
    cached = value;
    initialized = true;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    emit();
  }

  function clear() {
    cached = defaultValue;
    initialized = true;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
    emit();
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  return { useValue, set, clear, get: getSnapshot };
}
