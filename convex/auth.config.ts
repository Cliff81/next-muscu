/**
 * Google comme fournisseur d'identité OIDC.
 *
 * Convex valide lui-même la signature des jetons émis par Google, contre les
 * clés publiques de Google. C'est ce qui transforme la connexion du navigateur
 * — qui ne faisait qu'identifier — en véritable contrôle d'accès : une fonction
 * ne voit que l'identité qu'elle a pu vérifier.
 *
 * `applicationID` doit valoir l'identifiant client OAuth, celui-là même que le
 * navigateur utilise. À déclarer dans les variables d'environnement du
 * déploiement Convex : `npx convex env set GOOGLE_CLIENT_ID <valeur>`.
 */
const authConfig = {
  providers: [
    {
      domain: "https://accounts.google.com",
      applicationID: process.env.GOOGLE_CLIENT_ID,
    },
  ],
};

export default authConfig;
