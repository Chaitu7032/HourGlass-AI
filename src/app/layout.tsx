import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Hourglass AI - Predict Missed Deadlines Before They Happen",
  description:
    "The AI that predicts missed deadlines before they happen. An autonomous execution operating system powered by Gemini.",
  keywords: ["AI", "productivity", "deadline prediction", "Gemini", "Google"],
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
