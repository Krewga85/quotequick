import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://quotequick.uk'),
  title: "QuoteQuick | Professional Quotes for UK Trades",
  description: "Fast, clean quoting tool for UK tradespeople. Create professional quotes with VAT, save customers, and generate beautiful PDFs — in seconds.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "QuoteQuick | Professional Quotes for UK Trades",
    description: "Fast, clean quoting and invoicing tool for UK tradespeople. Create professional VAT-ready documents in seconds.",
    images: [{ url: '/og-image.png' }], // Optional: add if you create one later
  },
  alternates: {
    canonical: 'https://quotequick.uk',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
