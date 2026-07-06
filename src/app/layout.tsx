import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SocialPilot — Social Media Publishing & Scheduling",
  description: "Schedule, publish, and track your social media posts from one dashboard.",
};

const noFlashScript = `
(function () {
  try {
    var theme = window.localStorage.getItem("sp-theme") || "SYSTEM";
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = theme === "DARK" || (theme === "SYSTEM" && prefersDark);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const settings = user ? await prisma.userSettings.findUnique({ where: { userId: user.id } }) : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {noFlashScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider initialTheme={settings?.theme ?? "SYSTEM"}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
