import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import { Web3Provider } from "@/components/Web3Provider";
import "./globals.css";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://temple-sprint.vercel.app").replace(/\/$/, "");

const FARCASTER_EMBED = {
  version: "next",
  imageUrl: `${APP_URL}/og.png`,
  button: {
    title: "🏃 Play TempleSprint",
    action: {
      type: "launch_miniapp",
      name: "TempleSprint",
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#0d0a05",
    },
  },
};

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TempleSprint | Ancient Temple Endless Runner",
  description:
    "Sprint through ancient temples, dodge deadly traps, and claim your place on the Wall of Champions. Earn on-chain badges on Sepolia!",
  openGraph: {
    title: "TempleSprint",
    description: "Run the temple. Beat the leaderboard. Earn on-chain badges.",
    url: APP_URL,
    siteName: "TempleSprint",
    images: [{ url: `${APP_URL}/og.png`, width: 1200, height: 630 }],
    type: "website",
  },
  // Farcaster Mini App metadata (fc:miniapp is latest, fc:frame for compatibility)
  other: {
    "fc:miniapp": JSON.stringify(FARCASTER_EMBED),
    "fc:frame": JSON.stringify(FARCASTER_EMBED),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${inter.variable} min-h-screen antialiased`}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
