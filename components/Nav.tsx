import Link from "next/link";
import { IdentityBadge } from "./IdentityBadge";

const links = [
  { href: "/", label: "首页" },
  { href: "/train", label: "情景模拟" },
  { href: "/baishitong", label: "百事通" },
  { href: "/history", label: "历史与反馈" },
  { href: "/admin", label: "管理" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-wide"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-500 text-xs text-[#07111f]">
            星
          </span>
          <span className="text-sm text-white sm:text-base">
            启星AI<span className="hidden sm:inline"> · 首席内训官</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-0.5 text-xs text-slate-300 sm:gap-1 sm:text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap rounded-lg px-2 py-1.5 transition hover:bg-white/10 hover:text-white sm:px-2.5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <IdentityBadge />
        </div>
      </div>
    </header>
  );
}
