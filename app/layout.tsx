import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AURA_PUBLIC_URL ?? "http://localhost:3000"),
  title: {
    default: "AURA — Build skills. Create what matters.",
    template: "%s · AURA",
  },
  description:
    "AURA is the learning and innovation workspace for Guwahati University: understand a concept at your level, prove it with practice, then apply it in a real project with mentors, workshops and equipment.",
  applicationName: "AURA",
  authors: [{ name: "Automation & Robotics Association" }],
  openGraph: {
    type: "website",
    siteName: "AURA",
    title: "AURA — Build skills. Create what matters.",
    description:
      "Adaptive learning, practice and project evidence for the Guwahati University student innovation community.",
    images: [{ url: "/brand/aura-full-lockup.png", width: 1200, height: 630, alt: "AURA — Automation & Robotics Association" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AURA — Build skills. Create what matters.",
    description: "Adaptive learning and project evidence for Guwahati University.",
    images: ["/brand/aura-full-lockup.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
