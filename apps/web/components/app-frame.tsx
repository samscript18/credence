"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "./app-shell";

export function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/dev/")) return children;
  return <AppShell>{children}</AppShell>;
}
