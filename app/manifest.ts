import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tur",
    short_name: "tur",
    description: "Trips, planned and lived.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F6F8",
    theme_color: "#F5F6F8",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
