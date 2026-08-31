import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "启星AI · 首席内训官",
  description: "运营星大脑第一阶段：情景模拟、智能考核、百事通",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
          启星AI 第一阶段 MVP · 模拟与考核期 · 班班的私人教练
        </footer>
      </body>
    </html>
  );
}
