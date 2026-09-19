import type { Metadata, Viewport } from "next";
import { ConfigBanner } from "@/components/ConfigBanner";
import { IdentityPrompt } from "@/components/IdentityPrompt";
import { Nav } from "@/components/Nav";
import "./globals.css";

// 配置横幅需按请求读取环境变量，避免 build 时把 Key 状态写死进静态页
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "启星AI · 首席内训官",
  description: "运营星大脑第一阶段：情景模拟、智能考核、百事通",
};

// 移动端 H5：禁止用户缩放留给系统默认，适配刘海屏安全区
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-3 py-4 sm:px-4 sm:py-8">
          <ConfigBanner />
          {children}
        </main>
        <IdentityPrompt />
        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
          启星AI · 首席内训官 · 情景模拟与智能考核 · 班班的私人教练
        </footer>
      </body>
    </html>
  );
}
