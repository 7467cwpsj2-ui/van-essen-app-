/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Voorkomt dat de op het beginscherm geïnstalleerde app (vooral op
  // iOS) een oude versie van een pagina lokaal blijft tonen — elke
  // keer opnieuw ophalen bij de server i.p.v. hergebruiken van een
  // bewaarde kopie. _next/static blijft wel lang gecachet (die
  // bestandsnamen veranderen toch al bij elke nieuwe versie).
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|icons/).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

module.exports = nextConfig;
