import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { ConvexClient } from "@/components/ConvexClient";
import { SignInGate } from "@/components/SignInGate";
import { ModeBridge } from "@/components/ModeBridge";
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
