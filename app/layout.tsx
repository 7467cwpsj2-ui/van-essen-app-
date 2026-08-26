import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";

// Zelf-gehost via next/font i.p.v. een @import naar fonts.googleapis.com
// in globals.css — dat laatste blokkeerde het opstarten van de app met
// een extra netwerk-rondje naar een externe domein (DNS/TLS-opzet erbij)
// vóórdat er ook maar tekst getoond kon worden. next/font haalt de
// bestanden al tijdens het bouwen op en serveert ze vanaf hetzelfde
// domein, cachebaar net als de rest van de statische bestanden.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Van Essen Bouw & Onderhoud",
  description: "Bouwmanagement-app voor Van Essen Bouw & Onderhoud",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Van Essen Bouw & Onderhoud",
  },
};

export const viewport: Viewport = {
  themeColor: "#33a8e8",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${inter.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
