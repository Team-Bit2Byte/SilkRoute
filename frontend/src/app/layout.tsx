import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using user rule for Google Fonts
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SilkRoute - Multilingual Marketplace",
  description: "Connect, Negotiate, and Trade in your language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
