import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Credence",
  description: "Reputation-powered predictions on DreamDEX Event Contracts",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
