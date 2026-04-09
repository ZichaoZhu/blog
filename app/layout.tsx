import type { Metadata } from "next";
import { Inter, Klee_One } from "next/font/google";
import "./globals.css";
// LaTeX 论文风阅读主题(scoped 在 .theme-latex 下,默认不影响任何元素)
import "./latex-theme.css";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import { ClickEffect } from "@/components/ClickEffect";
import { ReadingThemeProvider } from "@/components/ReadingTheme";

// KaTeX CSS
import "katex/dist/katex.min.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Klee One: 日式楷风手写字体,覆盖日文+英文,作为系统楷体的 fallback
const kleeOne = Klee_One({
  variable: "--font-klee",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "我的博客 - 分享技术，记录成长",
  description: "一个基于 Next.js 构建的现代化个人博客，分享前端开发、编程技术和学习笔记",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${kleeOne.variable} antialiased`}
      >
        <Providers>
          <ReadingThemeProvider>
            <Navigation />
            {children}
            <ClickEffect />
          </ReadingThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
