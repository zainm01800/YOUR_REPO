import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { appConfig } from "@/lib/config";

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const display = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${appConfig.name}`,
    default: `${appConfig.name} | Bookkeeping help for sole traders`,
  },
  description:
    "Bookkeeping, receipt matching, VAT record support, and tidy finance summaries for sole traders and small businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <ClerkProvider>
        <body className="min-h-full flex flex-col">{children}</body>
      </ClerkProvider>
    </html>
  );
}
