import { FeedScreen } from "@/components/feed-screen";

export const metadata = { title: "Signals", description: "Discover public predictions and locked insight from the Credence network.", robots: { index: false, follow: true } };

export default function SignalsPage() { return <FeedScreen />; }
