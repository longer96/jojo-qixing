import Link from "next/link";

const links = [
  { href: "/", label: "首页" },
  { href: "/train", label: "情景模拟" },
  { href: "/baishitong", label: "百事通" },
  { href: "/history", label: "历史与反馈" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-wide">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-500 text-xs text-[#07111f]">
            星
          </span>
          <span className="text-sm text-white sm:text-base">启星AI · 首席内训官</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm text-slate-300">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-2.5 py-1.5 transition hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
