import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { ConvexClient } from "@/components/ConvexClient";
import { SignInGate } from "@/components/SignInGate";
import { ModeBridge } from "@/components/ModeBridge";
import { ProgramRepairBridge } from "@/components/ProgramRepairBridge";
import { TrophyBridge } from "@/components/TrophyBridge";
import { ServiceWorkerBridge } from "@/components/ServiceWorkerBridge";
import { TokenRenewal } from "@/components/TokenRenewal";
import { SyncBridge } from "@/components/SyncBridge";
import { Toaster } from "@/components/Toaster";
import { TopBar } from "@/components/TopBar";
import { APP_NAME, APP_TAGLINE } from "@/lib/app";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  // Titre et barre d'état côté iOS. `capable` produit le nom standardisé
  // `mobile-web-app-capable`, honoré par Safari depuis iOS 15.4 ; Next écarte
  // volontairement l'ancien `apple-mobile-web-app-capable`.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0e0f13",
  // Le contenu passe sous l'encoche ; les marges sûres sont reprises en CSS.
  viewportFit: "cover",
  // La mise à l'échelle reste possible : la brider nuit à l'accessibilité.
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bebasNeue.variable} ${dmSans.variable} h-full antialiased`}
      // Le script ci-dessous pose `data-mode` avant que React reprenne la
      // main : l'attribut diffère donc du HTML rendu par le serveur, et c'est
      // voulu. Sans cette mention, React signale une hydratation divergente.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        {/*
          Le visage posé avant la première peinture.

          Les pages sont statiques : le serveur ne connaît pas la route au
          moment de rendre le gabarit, et React ne reprend la main qu'après
          l'affichage. Sans ces trois lignes, ouvrir directement Nutrition
          montrait la page en couleurs Stronger le temps d'une image — ce que
          voit surtout l'application installée, qui s'ouvre là où on l'a
          quittée. La règle est la même que dans `ModeBridge`.

          Passé par `next/script` plutôt qu'une balise nue : React 19 refuse
          d'exécuter un script rendu dans un composant.
        */}
        <Script id="visage" strategy="beforeInteractive">
          {"(function(){var p=location.pathname;" +
            "document.documentElement.dataset.mode=" +
            "p.indexOf('/nutrition')===0?'healthier':p.indexOf('/progress')===0?'better':'stronger';})()"}
        </Script>
        <ConvexClient>
          <ModeBridge />
          <ServiceWorkerBridge />
          <TokenRenewal />
          <ProgramRepairBridge />
          <TrophyBridge />
          <SyncBridge />
          <SignInGate>
            <TopBar />
            {children}
            <Toaster />
          </SignInGate>
        </ConvexClient>
      </body>
    </html>
  );
}
