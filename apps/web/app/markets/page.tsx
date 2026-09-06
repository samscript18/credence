import { MarketsScreen } from "@/components/markets-screen";

export const metadata = { title: "Markets", description: "Browse live DreamDEX Event Contracts and build your prediction track record.", alternates: { canonical: "/markets" } };

export default function MarketsPage() {
  return <MarketsScreen />;
}
