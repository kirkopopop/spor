import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "spor",
    short_name: "spor",
    description: "Trips, planned and lived.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F5F2",
    theme_color: "#F6F5F2",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
