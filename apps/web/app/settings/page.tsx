import type { Metadata } from "next";
import { AutoClaimSettings } from "@/components/auto-claim-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <AutoClaimSettings />;
}
