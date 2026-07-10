import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navigation } from "@/components/Navigation";
import { Toaster } from "react-hot-toast";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethara Seat Allocation",
  description: "Seat Allocation Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="h-[100dvh] flex flex-col md:flex-row bg-background text-foreground overflow-hidden">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative scrollbar-thin">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
