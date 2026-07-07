import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { NetworkBanner } from "@/components/NetworkBanner";
import { LiveBackdrop } from "@/components/LiveBackdrop";
import { CONTRACT_ADDRESS, explorerAddressUrl } from "@/lib/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// Fraunces — warm, optically-sized old-style serif; the charter voice.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ESCRIVAN — On-chain grant stewardship",
  description:
    "Funders lock the grant, grantees deliver evidence, a GenLayer AI panel rules the progress qualitatively at every obligation — and tranches release only against approved reviews.",
  openGraph: {
    title: "ESCRIVAN — the accountability layer for grants",
    description:
      "Tranched escrow released by consensus-backed stewardship reviews. Every ruling a public record on GenLayer.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#fffaf0" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} ${fraunces.variable}`}>
      <body className="min-h-screen flex flex-col">
        <LiveBackdrop />
        <Providers>
          <Nav />
          <NetworkBanner />
          <main className="flex-1 relative">{children}</main>
          <footer className="mt-16 border-t border-hairline">
            <div className="mx-auto max-w-6xl px-5 py-6 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="eyebrow">Entered in the register · GenLayer Studionet</span>
              <span className="text-muted">
                Stewardship rulings by AI panel · tranches release in GEN ·{" "}
                <a
                  href={explorerAddressUrl(CONTRACT_ADDRESS)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-ivory"
                >
                  Verify on explorer ↗
                </a>
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
