import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Hourglass AI | Predictive Execution OS",
  description:
    "Hourglass AI is an autonomous execution operating system that predicts failure, reorganizes your schedule, and protects commitments before they slip.",
  keywords: ["AI", "productivity", "deadline prediction", "Gemini", "execution OS", "commitment tracking"],
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full scroll-smooth">
      <body className="min-h-full bg-zinc-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
