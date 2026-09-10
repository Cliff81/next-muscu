import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/app";

/**
 * Manifeste d'application installable.
 *
 * `display: standalone` fait disparaître la barre d'adresse : sur un téléphone
 * posé sur un banc, l'écran entier sert à la séance. Les couleurs sont celles
 * du thème Stronger — le manifeste ne peut en porter qu'une, et c'est le
 * visage par défaut de l'application (ModeBridge ajuste la barre d'état quand
 * on passe sur Healthier).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_TAGLINE,
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0f13",
    theme_color: "#0e0f13",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android recadre l'icône dans une forme qui lui est propre : cette
      // variante garde l'haltère dans la zone sûre plutôt que rognée.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Programme", url: "/" },
      { name: "Progression", url: "/progress" },
      { name: "Nutrition", url: "/nutrition" },
    ],
  };
}
