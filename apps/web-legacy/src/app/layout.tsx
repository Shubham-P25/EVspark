import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { QueryProvider } from '@/components/providers/QueryProvider';
import './globals.css';
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'EVspark — AI-Powered EV Charging Network & Digital Twin',
  description: "Real-time AI wait time predictions, smart routing, and digital twin simulation across Maharashtra's EV charging stations.",
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0B0F17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("dark bg-[#0B0F17]", "font-sans", figtree.variable)}>
      <body className="antialiased bg-[#0B0F17] text-white min-h-screen">
        <QueryProvider>{children}</QueryProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
