/**
 * Marque de Stronger : un haltère vu de côté, deux disques par bras.
 *
 * Le premier essai empilait trois barres ascendantes — lisible jusqu'à 16 px,
 * mais c'est le motif de toutes les applications de statistiques : il disait
 * « graphiques » et non « force ». L'haltère est reconnaissable au premier
 * regard et propre au domaine.
 *
 * Dessinée dans une grille de 24, en `currentColor` : la marque prend la
 * couleur de son contexte, sans variante de fichier à maintenir.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* disque extérieur, disque intérieur, barre, puis miroir */}
      <rect x="2" y="7" width="3.5" height="10" rx="1.4" />
      <rect x="6.5" y="4.5" width="3.5" height="15" rx="1.4" />
      <rect x="10" y="10.5" width="4" height="3" />
      <rect x="14" y="4.5" width="3.5" height="15" rx="1.4" />
      <rect x="18.5" y="7" width="3.5" height="10" rx="1.4" />
    </svg>
  );
}

/** Marque dans sa tuile, pour les emplacements où elle doit tenir seule. */
export function LogoTile({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl bg-accent text-accent-fg ${className}`}
    >
      <LogoMark className="size-[62%]" />
    </span>
  );
}

/** Marque et nom, tels qu'ils apparaissent dans le bandeau. */
export function Logo({ tile = "size-8" }: { tile?: string }) {
  return (
    <span className="flex items-center gap-2">
      <LogoTile className={tile} />
      <span className="font-display text-xl leading-none tracking-[0.02em]">
        Strong<span className="text-accent">er</span>
      </span>
    </span>
  );
}
