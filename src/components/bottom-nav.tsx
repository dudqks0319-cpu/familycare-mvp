"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/fridge", label: "냉장고", icon: "🧊" },
  { href: "/dashboard", label: "관리", icon: "📊" },
  { href: "/planner", label: "기록", icon: "📝" },
  { href: "/settings", label: "설정", icon: "⚙️" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fc-bottom-nav md:hidden" aria-label="하단 내비게이션">
      <div
        className="mx-auto grid w-full max-w-sm gap-1 px-2 py-1.5"
        style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
      >
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold ${
                active ? "text-blue-600" : "text-[var(--fc-text-sub)]"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
