import type { Metadata } from "next";

import "./globals.css";
import { AppFrame } from "@/components/app-frame";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Credence",
  description: "Reputation-powered predictions on DreamDEX Event Contracts",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers><AppFrame>{children}</AppFrame></Providers>
      </body>
    </html>
  );
}
