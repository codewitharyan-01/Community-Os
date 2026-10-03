import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toaster";
import { PWAMeta } from "@/components/pwa/pwa-meta";
import "./globals.css";

const inter = localFont({
  src: "../public/fonts/inter-var.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Community OS — Everything your community needs",
    template: "%s · Community OS",
  },
  description:
    "One intelligent place to run your residential community — payments, maintenance, communication, security and governance, all connected.",
  applicationName: "Community OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Community OS" },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-background text-foreground min-h-screen">
        <PWAMeta />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
