import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Hourglass AI — Predictive Execution Operating System",
  description:
    "Hourglass AI is an autonomous execution operating system that continuously predicts failure, reorganizes your schedule, and prevents you from missing commitments — before it's too late. Powered by Gemini 2.5 Flash and a 10-agent orchestration pipeline.",
  keywords: ["AI", "productivity", "deadline prediction", "Gemini", "execution OS", "commitment tracking"],
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-zinc-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
