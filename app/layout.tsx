import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ReadingThemeProvider } from "@/components/ReadingTheme";
import { SearchDialog } from "@/components/SearchDialog";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  absoluteUrl,
  isPreviewDeployment,
  siteConfig,
} from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [
    {
      name: siteConfig.primaryAuthorName,
      url: absoluteUrl(`/authors/${siteConfig.primaryAuthorId}`),
    },
  ],
  creator: siteConfig.primaryAuthorName,
  publisher: siteConfig.primaryAuthorName,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": absoluteUrl("/rss.xml"),
    },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: isPreviewDeployment
    ? {
        index: false,
        follow: false,
        nocache: true,
      }
    : {
        index: true,
        follow: true,
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <ReadingThemeProvider>
            <a className="skip-link" href="#main-content">跳到正文</a>
            <Navigation />
            <main id="main-content">{children}</main>
            <Footer />
            <SearchDialog />
            <SpeedInsights />
          </ReadingThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
