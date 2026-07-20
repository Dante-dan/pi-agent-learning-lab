import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pi Agent 学习实验室",
  description: "用 Extension、SDK、事件轨迹与渐进练习掌握 Pi Agent 二次开发。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "Pi Agent 学习实验室", description: "从会用 Pi，到能改造 Pi", type: "website", images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Pi Agent 学习实验室" }] },
  twitter: { card: "summary_large_image", title: "Pi Agent 学习实验室", description: "从会用 Pi，到能改造 Pi", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
