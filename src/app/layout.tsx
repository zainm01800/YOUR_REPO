import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { appConfig } from "@/lib/config";

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${appConfig.name}`,
    default: `${appConfig.name} | Reconciliation for finance teams`,
  },
  description:
    "Upload transactions and receipts, reconcile them, review exceptions, and export finance-ready outputs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <ClerkProvider>
        <body className="min-h-full flex flex-col">{children}</body>
      </ClerkProvider>
    </html>
  );
}
