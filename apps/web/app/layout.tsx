import type { Metadata } from "next";
import localFont from "next/font/local";

import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { AppFrame } from "@/components/app-frame";
import { Providers } from "./providers";
import { siteDescription, siteUrl } from "@/lib/site";

const satoshi = localFont({
  src: "../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "../public/fonts/JetBrainsMono-Regular.woff2",
  variable: "--font-jetbrains",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Credence — Verifiable Reputation for Prediction Markets", template: "%s | Credence" },
  description: siteDescription,
  applicationName: "Credence",
  openGraph: { type: "website", siteName: "Credence", title: "Credence — Know who actually knows.", description: siteDescription },
  twitter: { card: "summary_large_image", title: "Credence — Know who actually knows.", description: siteDescription },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${satoshi.variable} ${jetbrainsMono.variable} antialiased`}>
      <body>
        <Providers><AppFrame>{children}</AppFrame></Providers>
      </body>
    </html>
  );
}
