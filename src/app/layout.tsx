import type { Metadata, Viewport } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { ConvexClient } from "@/components/ConvexClient";
import { SignInGate } from "@/components/SignInGate";
import { ModeBridge } from "@/components/ModeBridge";
import { ProgramRepairBridge } from "@/components/ProgramRepairBridge";
import { ServiceWorkerBridge } from "@/components/ServiceWorkerBridge";
import { SyncBridge } from "@/components/SyncBridge";
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
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <ConvexClient>
          <ModeBridge />
          <ServiceWorkerBridge />
          <ProgramRepairBridge />
          <SyncBridge />
          <SignInGate>
            <TopBar />
            {children}
          </SignInGate>
        </ConvexClient>
      </body>
    </html>
  );
}
