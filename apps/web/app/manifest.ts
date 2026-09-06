import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Credence", short_name: "Credence", description: "Reputation-powered prediction markets", start_url: "/app", display: "standalone", background_color: "#050607", theme_color: "#050607", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
