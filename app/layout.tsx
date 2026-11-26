import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "spor",
  description: "Trips, planned and lived.",
  appleWebApp: { capable: true, title: "spor", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F5F6F8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
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
