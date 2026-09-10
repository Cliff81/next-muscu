/*
 * Service worker de Stronger.
 *
 * L'application est déjà « locale d'abord » : le programme et l'historique
 * vivent dans le localStorage. Ce qui manquait pour tenir hors ligne, c'est la
 * coquille — le HTML, le JavaScript, le catalogue et les photos. C'est ce que
 * ce fichier met en cache, avec une stratégie par nature de ressource plutôt
 * qu'une liste figée : les fragments Next portent un condensé dans leur nom,
 * les énumérer à l'installation serait à refaire à chaque déploiement.
 *
 * Écrit à la main et servi tel quel : pas d'étape de compilation à ajouter.
 */

const VERSION = "v2";
const SHELL = `stronger-shell-${VERSION}`;
const ASSETS = `stronger-assets-${VERSION}`;
const DATA = `stronger-data-${VERSION}`;
// Les photos ne changent jamais pour une URL donnée : leur cache survit aux
// versions, sinon chaque déploiement obligerait à les retélécharger.
const PHOTOS = "stronger-photos";
const PHOTOS_MAX = 300;

const CURRENT = [SHELL, ASSETS, DATA, PHOTOS];
const PHOTO_ORIGIN = "https://cdn.jsdelivr.net";
const SHELL_ROUTES = ["/", "/progress", "/nutrition"];

// Convex (données, temps réel) et Google (connexion) ne doivent jamais passer
// par un cache : une réponse d'authentification rejouée serait fausse.
const NEVER_CACHE = /(\.convex\.(cloud|site)|accounts\.google\.com|apis\.google\.com|www\.googleapis\.com)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Une route en échec ne doit pas faire échouer l'installation entière,
      // d'où les mises en cache une par une.
      await Promise.all(
        SHELL_ROUTES.map((route) =>
          fetch(route, { cache: "reload" })
            .then((response) => (response.ok ? cache.put(route, response) : null))
            .catch(() => null)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(
        noms
          .filter((nom) => nom.startsWith("stronger-") && !CURRENT.includes(nom))
          .map((nom) => caches.delete(nom))
      );
      await self.clients.claim();
    })()
  );
});

/** Réseau d'abord, cache en secours : la navigation reste à jour si le réseau répond. */
async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Une route jamais visitée : la page d'accueil sert de porte d'entrée.
    const accueil = await cache.match("/");
    if (accueil) return accueil;
    throw new Error("hors ligne");
  }
}

/** Cache d'abord : réservé aux ressources dont l'URL change quand le contenu change. */
async function cacheFirst(request, nomCache) {
  const cache = await caches.open(nomCache);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Cache immédiat, rafraîchi en arrière-plan : pour ce qui garde la même URL. */
async function staleWhileRevalidate(request, nomCache) {
  const cache = await caches.open(nomCache);
  const cached = await cache.match(request);
  const reseau = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const response = await reseau;
  if (response) return response;
  throw new Error("hors ligne");
}

/**
 * Photos d'exercices. La requête d'origine vient d'une balise `img`, donc en
 * mode `no-cors` : la réponse serait opaque et son échec indétectable. On la
 * rejoue en CORS — jsDelivr l'autorise — pour ne mettre en cache que ce qui a
 * réellement abouti.
 */
async function photoFirst(request) {
  const cache = await caches.open(PHOTOS);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  try {
    const response = await fetch(new Request(request.url, { mode: "cors", credentials: "omit" }));
    if (response.ok) {
      await cache.put(request.url, response.clone());
      void trimPhotos(cache);
    }
    return response;
  } catch {
    return fetch(request);
  }
}

/** Le catalogue compte 1 746 photos : on borne le cache aux plus récemment vues. */
async function trimPhotos(cache) {
  const cles = await cache.keys();
  if (cles.length <= PHOTOS_MAX) return;
  await Promise.all(cles.slice(0, cles.length - PHOTOS_MAX).map((cle) => cache.delete(cle)));
}

/*
 * Toucher la notification de fin de repos ramène à la séance : on réutilise
 * l'onglet déjà ouvert plutôt que d'en empiler un nouveau, sinon la séance en
 * cours se retrouverait dans un onglet resté en arrière.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const ouverte = fenetres.find((c) => c.url.startsWith(self.location.origin));
      if (ouverte) {
        await ouverte.focus();
        return;
      }
      await self.clients.openWindow("/");
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (NEVER_CACHE.test(url.hostname)) return;

  if (url.origin === PHOTO_ORIGIN) {
    event.respondWith(photoFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  // Fragments Next : le nom contient un condensé, le contenu ne bouge jamais.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  event.respondWith(staleWhileRevalidate(request, DATA));
});
