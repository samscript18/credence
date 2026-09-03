import { notFound } from "next/navigation";

import { DreamDexProof } from "@/components/dev/dreamdex-proof";

export default function DreamDexProofPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DreamDexProof />;
}
