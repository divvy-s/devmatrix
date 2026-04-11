import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const monospaceFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CastKit | Web3 Developer Showcase",
  description: "Stripe + Firebase + shadcn for Web3 social apps",
};

import { NavBar } from "@/components/global/NavBar";
import { Footer } from "@/components/global/Footer";
import { AuthProvider } from "@/components/global/AuthProvider";
import { CustomCursor } from "@/components/global/CustomCursor";
import { ParticleBackground } from "@/components/global/ParticleBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${monospaceFont.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <CustomCursor />
          <ParticleBackground />
          <NavBar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

