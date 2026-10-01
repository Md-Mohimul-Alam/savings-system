import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fames.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Fames Organization",
    template: "%s | Fames Organization",
  },
  description:
    "Fames Organization — empowering people and communities through innovation, creativity, and meaningful impact.",
  keywords: [
    "Fames Organization",
    "Fames",
    "nonprofit",
    "community",
    "innovation",
  ],
  authors: [{ name: "Fames Organization" }],
  creator: "Fames Organization",
  publisher: "Fames Organization",
  applicationName: "Fames Organization",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Fames Organization",
    title: "Fames Organization",
    description:
      "Empowering people and communities through innovation, creativity, and meaningful impact.",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fames Organization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fames Organization",
    description:
      "Empowering people and communities through innovation, creativity, and meaningful impact.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}