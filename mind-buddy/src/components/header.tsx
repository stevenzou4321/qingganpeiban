"use client";

import { useTheme } from "./theme-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      <Link href="/" className="flex items-center gap-2">
        <span className="text-xl">🌿</span>
        <span
          className="font-semibold text-base"
          style={{ color: "var(--text-primary)" }}
        >
          MindBuddy
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        <NavLink href="/" active={pathname === "/"}>
          聊聊
        </NavLink>
        <NavLink href="/report" active={pathname === "/report"}>
          周报
        </NavLink>

        <button
          onClick={toggle}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
          style={{ background: "var(--accent-light)" }}
          aria-label="切换主题"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent-light)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {children}
    </Link>
  );
}
