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

/**
 * Marque de Healthier : une feuille.
 *
 * Pendant de l'haltère — un objet simple, reconnaissable au premier regard et
 * lisible en très petit. Une assiette ou une pomme se confondraient avec des
 * icônes d'application de recettes.
 */
export function LeafMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.5 3.2c-8 .2-13.4 3.4-14.9 8.6-.7 2.4-.2 4.7 1.1 6.5l-2.3 2.3a1.3 1.3 0 0 0 1.8 1.8l2.3-2.3c1.8 1.3 4.1 1.8 6.5 1.1 5.2-1.5 8.4-6.9 8.6-14.9a1.3 1.3 0 0 0-1.3-1.3z" />
      <path
        d="M8 19 L19.5 6"
        stroke="var(--accent-fg)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}

/**
 * Marque de Better : une courbe qui monte.
 *
 * J'avais écarté ce motif pour Stronger — trois barres ascendantes disaient
 * « statistiques » et non « force ». Ici c'est précisément le propos de la
 * page : ce qu'on y regarde, c'est une progression. Le motif est donc juste,
 * au même endroit où il était faux.
 */
export function TrendMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 17.5 L9 11 L13.5 15 L21 6.5" />
      <path d="M15.5 6.5 H21 V12" />
    </svg>
  );
}

type BrandMode = "stronger" | "healthier" | "better";

const BRAND_WORDS: Record<BrandMode, [string, string]> = {
  stronger: ["Strong", "er"],
  healthier: ["Health", "ier"],
  better: ["Bett", "er"],
};

/** Pastille et nom du visage demandé. */
export function Brand({ mode = "stronger" }: { mode?: BrandMode }) {
  const [debut, fin] = BRAND_WORDS[mode];
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
        {mode === "healthier" ? (
          <LeafMark className="size-[62%]" />
        ) : mode === "better" ? (
          <TrendMark className="size-[58%]" />
        ) : (
          <LogoMark className="size-[62%]" />
        )}
      </span>
      <span className="font-display text-xl leading-none tracking-[0.02em]">
        {debut}
        <span className="text-accent">{fin}</span>
      </span>
    </span>
  );
}
