import { LeaderboardScreen } from "@/components/leaderboard-screen";

export const metadata = { title: "Leaderboard", description: "Discover Credence predictors ranked by reputation, accuracy and resolved prediction history.", alternates: { canonical: "/leaderboard" } };

export default function LeaderboardPage() {
  return <LeaderboardScreen />;
}
