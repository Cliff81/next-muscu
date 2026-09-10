"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { exerciseImageUrl } from "@/lib/exerciseImages";

const PHASES = ["Départ", "Arrivée"];

/**
 * Les deux photos du mouvement. Le catalogue donne le début et la fin du geste
 * plutôt qu'une animation : les alterner suggère le mouvement, et la vue côte
 * à côte permet de comparer les deux positions à loisir.
 */
function PhotoPair({ images, name }: { images: string[]; name: string }) {
  const [frame, setFrame] = useState(0);
  const [animated, setAnimated] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!animated || errored || images.length < 2) return;
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % images.length);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [animated, errored, images.length]);

  if (errored) {
    return (
      <div className="flex aspect-[3/2] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface2 px-6 text-center text-sm text-muted">
        <span className="text-4xl">📷</span>
        <p className="mt-3">
          Photos indisponibles.
          <br />
          Elles sont chargées depuis Internet : vérifie ta connexion.
        </p>
      </div>
    );
  }

  return (
    <>
      {animated ? (
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-surface2">
          {/* Les deux photos sont chargées d'emblée et superposées : l'alternance
              se fait en opacité, sans le clignotement d'un changement de `src`. */}
          {images.map((path, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- source externe, hors optimiseur Next
            <img
              key={path}
              src={exerciseImageUrl(path)}
              alt={`${name} — ${PHASES[index] ?? `position ${index + 1}`}`}
              onError={() => setErrored(true)}
              // L'opacité est portée en style : c'est une valeur animée, elle
              // n'a pas à dépendre de la génération d'une classe utilitaire.
              style={{ opacity: index === frame ? 1 : 0 }}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            />
          ))}
          <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-[0.65rem] tracking-[0.08em] text-white uppercase">
            {PHASES[frame] ?? `Position ${frame + 1}`}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {images.map((path, index) => (
            <div key={path}>
              <div className="aspect-[3/2] overflow-hidden rounded-lg bg-surface2">
                {/* eslint-disable-next-line @next/next/no-img-element -- source externe, hors optimiseur Next */}
                <img
                  src={exerciseImageUrl(path)}
                  alt={`${name} — ${PHASES[index] ?? `position ${index + 1}`}`}
                  onError={() => setErrored(true)}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-1 text-center text-[0.65rem] tracking-[0.08em] text-muted uppercase">
                {PHASES[index] ?? `Position ${index + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <button
          type="button"
          onClick={() => setAnimated((on) => !on)}
          className="mt-3 self-start rounded-md border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
        >
          {animated ? "⏸ Comparer les deux positions" : "▶ Animer le mouvement"}
        </button>
      )}
    </>
  );
}

/** Le GIF déposé à la main dans `/public/exos`, quand il y en a un. */
function LocalGif({ demo, name }: { demo: string; name: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface2 px-6 text-center text-sm text-muted">
        <span className="text-4xl">🎬</span>
        <p className="mt-3">
          Démo à venir.
          <br />
          Ajoute le fichier <code className="text-accent">public/exos/{demo}</code>.
        </p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- GIF animé : next/image figerait l'animation
    <img
      src={`/exos/${demo}`}
      alt={`Démonstration de l'exercice ${name}`}
      onError={() => setErrored(true)}
      className="w-full rounded-lg bg-surface2"
    />
  );
}

type Props = {
  name: string;
  images?: string[];
  demo?: string;
  className?: string;
};

/**
 * Bouton (i) ouvrant l'explication du mouvement : les photos du catalogue en
 * priorité, sinon le GIF local s'il en existe un. Ne rend rien sans l'un ni
 * l'autre.
 */
export function ExerciseDemo({ name, images, demo, className }: Props) {
  const [open, setOpen] = useState(false);
  const hasPhotos = Boolean(images?.length);

  if (!hasPhotos && !demo) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Voir la démonstration : ${name}`}
        title="Voir la démonstration"
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/50 font-display text-[0.7rem] leading-none text-accent transition hover:bg-accent hover:text-bg ${className ?? ""}`}
      >
        i
      </button>

      {open && (
        <Modal title={name} onClose={() => setOpen(false)}>
          {hasPhotos && images ? (
            <PhotoPair images={images} name={name} />
          ) : (
            <LocalGif demo={demo as string} name={name} />
          )}
        </Modal>
      )}
    </>
  );
}
