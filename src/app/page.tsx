import Link from "next/link";

import { getAuthSessionFromCookie } from "@/lib/auth-session";

const HOME_QUICK_MENUS = [
  {
    href: "/dashboard",
    label: "알림장",
    icon: "📔",
    toneClass: "bg-rose-100 text-rose-500",
  },
  {
    href: "/dashboard",
    label: "공지사항",
    icon: "📌",
    toneClass: "bg-amber-100 text-amber-500",
  },
  {
    href: "/planner",
    label: "기록",
    icon: "✏️",
    toneClass: "bg-indigo-100 text-indigo-500",
  },
  {
    href: "/planner",
    label: "일정표",
    icon: "📅",
    toneClass: "bg-red-100 text-red-500",
  },
  {
    href: "/dashboard",
    label: "체크인",
    icon: "🍽️",
    toneClass: "bg-lime-100 text-lime-500",
  },
  {
    href: "/dashboard",
    label: "복약",
    icon: "💊",
    toneClass: "bg-pink-100 text-pink-500",
  },
  {
    href: "/invite",
    label: "초대",
    icon: "👨‍👩‍👧",
    toneClass: "bg-sky-100 text-sky-500",
  },
  {
    href: "/settings",
    label: "설정",
    icon: "⚙️",
    toneClass: "bg-emerald-100 text-emerald-500",
  },
] as const;

const BENEFIT_MENUS = [
  { label: "데일리간식", icon: "🍓" },
  { label: "체험이벤트", icon: "🎿" },
  { label: "0원찬스", icon: "🪙" },
  { label: "키즈노트북", icon: "🎓" },
] as const;

const BOTTOM_NAV_ITEMS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/dashboard", label: "혜택", icon: "🎁" },
  { href: "/planner", label: "기록", icon: "📝" },
  { href: "/settings", label: "설정", icon: "⚙️" },
] as const;

function getProfileName(email?: string): string {
  if (!email) {
    return "게스트 사용자";
  }

  const [name] = email.split("@");
  return name || email;
}

export default async function Home() {
  const session = await getAuthSessionFromCookie();
  const profileName = getProfileName(session?.email);

  return (
    <main className="min-h-screen bg-slate-100 pb-28 md:pb-10">
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-4 md:max-w-5xl md:space-y-6 md:px-6 md:py-8">
        <header className="flex items-center justify-between rounded-2xl bg-transparent py-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-lg">
              👶
            </div>
            <div>
              <p className="text-sm text-slate-500">FamilyCare</p>
              <p className="text-2xl font-bold text-slate-900">{profileName}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-300 bg-white p-2 text-xl text-slate-700"
            aria-label="알림"
          >
            🔔
          </button>
        </header>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">우리 가족 돌봄 운영 앨범</p>
              <p className="mt-1 text-sm text-slate-600">오늘의 기록과 일정을 한 번에 확인해 보세요.</p>
            </div>
            <span className="text-2xl text-slate-400">›</span>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-sky-700">우리집 돌봄 허브</p>
                <p className="text-sm text-slate-600">한눈에 보는 오늘의 작업 바로가기</p>
              </div>
              <Link
                href="/settings"
                className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                편집
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {HOME_QUICK_MENUS.map((menu) => (
                <Link
                  key={menu.label}
                  href={menu.href}
                  className="flex flex-col items-center gap-2 rounded-xl px-1 py-1 text-center"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-sm ${menu.toneClass}`}
                    aria-hidden="true"
                  >
                    {menu.icon}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">{menu.label}</span>
                </Link>
              ))}
            </div>

            <div className="mt-3 flex justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="h-2 w-2 rounded-full bg-slate-300" />
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-amber-200 bg-amber-100/80 p-4">
          <p className="text-2xl font-bold text-amber-900">신학기 준비 체크리스트</p>
          <p className="mt-1 text-sm text-amber-900/80">식단표·복약·등하원 기록을 먼저 정리하면 사용성이 훨씬 좋아집니다.</p>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-4 gap-3">
            {BENEFIT_MENUS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex flex-col items-center gap-2 rounded-xl px-1 py-1 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                  {item.icon}
                </span>
                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="hidden rounded-2xl border border-slate-200 bg-white p-4 md:block">
          <p className="text-sm text-slate-600">
            {session
              ? `${session.email || session.userId} 계정으로 로그인 중입니다.`
              : "현재는 게스트 모드입니다. 로그인하면 가족 초대/저장 기능을 쓸 수 있습니다."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/auth?mode=login"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              로그인/회원가입
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              대시보드
            </Link>
            <Link
              href="/planner"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              돌봄 플래너
            </Link>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 md:hidden">
        <Link
          href="/planner"
          className="pointer-events-auto inline-flex w-full max-w-sm items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200"
        >
          오늘 기록 시작하기 ↓
        </Link>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-4 pt-2 backdrop-blur md:hidden">
        <div className="mx-auto grid w-full max-w-sm grid-cols-4 gap-1">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isHome = item.href === "/";

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold ${
                  isHome ? "text-sky-600" : "text-slate-500"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
