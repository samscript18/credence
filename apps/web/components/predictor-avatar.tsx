"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function PredictorAvatar({
  address,
  name,
  avatarUrl,
  className,
}: {
  address: string;
  name?: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const label = name?.trim() ? name.trim().slice(0, 2) : address.slice(2, 4);
  const seed = [...address.toLowerCase()].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  const hue = 195 + (seed % 25);

  if (avatarUrl && !imgError) {
    return (
      <span
        className={cn(
          "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name ?? address}
          onError={() => setImgError(true)}
          className="size-full rounded-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        background: `conic-gradient(from ${seed % 360}deg, hsl(${hue} 35% 20%), hsl(${hue} 45% 43%), hsl(${hue + 25} 35% 18%), hsl(${hue} 35% 20%))`,
      }}
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 text-xs font-semibold uppercase text-white select-none",
        className,
      )}
    >
      <span className="absolute inset-1 rounded-full border border-white/15" />
      <span className="relative">{label}</span>
    </span>
  );
}
