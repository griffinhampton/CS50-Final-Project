import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layouts/navbar";
import { Providers } from "../components/ui/providers"
import Footer from "@/components/ui/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home",
  description: "The home page for CS50 final project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className = "min-h-screen min-w-screen bg-zinc-50 dark:bg-black text-black dark:text-zinc-50">
        <Providers>
          <Navbar />
          {children}
		  <Footer />
        </Providers>
      </body>
    </html>
  );
}
