import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hourglass AI — Predict Missed Deadlines Before They Happen",
  description:
    "The AI that predicts missed deadlines before they happen. An autonomous execution operating system powered by Gemini.",
  keywords: ["AI", "productivity", "deadline prediction", "Gemini", "Google"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="min-h-full antialiased bg-zinc-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
