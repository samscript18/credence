import { ProfileScreen } from "@/components/profile-screen";

export default async function PublicProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <ProfileScreen address={address} />;
}
