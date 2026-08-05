import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Van Essen Bouw & Onderhoud",
  description: "Bouwmanagement-app voor Van Essen Bouw & Onderhoud",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
