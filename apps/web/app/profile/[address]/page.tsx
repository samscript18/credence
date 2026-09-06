import { ProfileScreen } from "@/components/profile-screen";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return { title: `${address.slice(0, 6)}…${address.slice(-4)}`, description: "Explore this predictor's Credence reputation, active insight and public record of resolved predictions.", alternates: { canonical: `/profile/${encodeURIComponent(address.toLowerCase())}` } };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <ProfileScreen address={address} />;
}
