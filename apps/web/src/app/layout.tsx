import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as TorqueToaster } from "@/components/torque/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { QueryProvider } from "@/components/providers/query-provider";
import { ClerkAuthProvider } from "@/components/providers/clerk-auth-provider";
import { AuthBridge } from "@/components/providers/auth-bridge";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://evspark.in"),
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible } =
    PREFERENCE_DEFAULTS;
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1D6BFF",
        },
      }}
    >
      <html
        lang="en"
        className="light"
        style={{ colorScheme: "light" }}
        data-theme-mode="light"
        data-theme-preset={theme_preset}
        data-content-layout={content_layout}
        data-navbar-style={navbar_style}
        data-sidebar-variant={sidebar_variant}
        data-sidebar-collapsible={sidebar_collapsible}
        suppressHydrationWarning
      >
        <head>
          <ThemeBootScript />
        </head>
        <body
          className={`${sans.variable} ${mono.variable} font-sans min-h-screen antialiased bg-white text-[#0B1220] text-[16px] leading-[1.6]`}
        >
          <ClerkAuthProvider>
            <AuthBridge />
            <QueryProvider>
              <TooltipProvider>
                <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
                  {children}
                  <Toaster />
                  <TorqueToaster />
                </PreferencesStoreProvider>
              </TooltipProvider>
            </QueryProvider>
          </ClerkAuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
