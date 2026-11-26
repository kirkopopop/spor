import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { RegisterSW } from "@/components/RegisterSW";
import { THEME_SCRIPT } from "@/lib/themeScript";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "tur",
  description: "Trips, planned and lived.",
  appleWebApp: { capable: true, title: "tur", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F14" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme before paint, so React must accept the attribute it finds.
    <html lang="en" data-theme="light" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <RegisterSW />
        {/* Every screen is private, per-user data read at request time, so it all streams. */}
        <Suspense>
          <div className="min-h-dvh">{children}</div>
        </Suspense>
      </body>
    </html>
  );
}
