import Link from "next/link";

import { getAuthSessionFromCookie } from "@/lib/auth-session";

const HOME_QUICK_MENUS = [
  { href: "/dashboard", label: "알림장", icon: "📔", tone: "bg-rose-50 text-rose-500" },
  { href: "/dashboard", label: "공지사항", icon: "📌", tone: "bg-amber-50 text-amber-500" },
  { href: "/planner", label: "기록", icon: "✏️", tone: "bg-indigo-50 text-indigo-500" },
  { href: "/planner", label: "일정표", icon: "📅", tone: "bg-red-50 text-red-500" },
  { href: "/dashboard", label: "체크인", icon: "🍽️", tone: "bg-lime-50 text-lime-500" },
  { href: "/dashboard", label: "복약", icon: "💊", tone: "bg-pink-50 text-pink-500" },
  { href: "/invite", label: "초대", icon: "👨‍👩‍👧", tone: "bg-sky-50 text-sky-500" },
  { href: "/settings", label: "설정", icon: "⚙️", tone: "bg-emerald-50 text-emerald-500" },
] as const;

const BOTTOM_TABS = [
  { href: "/", label: "홈", icon: "🏠", active: true },
  { href: "/dashboard", label: "대시보드", icon: "📊", active: false },
  { href: "/planner", label: "기록", icon: "📝", active: false },
  { href: "/settings", label: "설정", icon: "⚙️", active: false },
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

  const today = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[var(--fc-bg)] pb-36 md:pb-10">
      <div className="mx-auto w-full max-w-md px-4 pt-6 md:max-w-3xl md:px-6 md:pt-10">
        {/* ── 헤더 ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">
              👶
            </div>
            <div>
              <p className="text-xs text-[var(--fc-text-sub)]">{today}</p>
              <p className="text-lg font-bold text-[var(--fc-text)]">{profileName}님</p>
            </div>
          </div>
          <Link
            href={session ? "/settings" : "/auth?mode=login"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm"
            aria-label="알림"
          >
            🔔
          </Link>
        </header>

        {/* ── 오늘 한눈 요약 배너 ── */}
        <section className="fc-card mt-5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-sky-400 px-5 py-5 text-white">
            <p className="text-sm font-medium opacity-90">오늘의 돌봄 요약</p>
            <p className="mt-1 text-2xl font-bold">우리 가족 돌봄 허브</p>
            <p className="mt-1.5 text-sm opacity-80">기록과 일정을 한 번에 확인하세요</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[var(--fc-border)] px-2 py-3">
            <div className="text-center">
              <p className="text-xl font-bold text-[var(--fc-text)]">0</p>
              <p className="text-[11px] text-[var(--fc-text-sub)]">오늘 기록</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[var(--fc-text)]">0</p>
              <p className="text-[11px] text-[var(--fc-text-sub)]">복약 완료</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">-</p>
              <p className="text-[11px] text-[var(--fc-text-sub)]">다음 일정</p>
            </div>
          </div>
        </section>

        {/* ── 퀵 메뉴 그리드 ── */}
        <section className="fc-card mt-4 p-4">
          <p className="text-sm font-semibold text-[var(--fc-text)]">바로가기</p>
          <div className="mt-3 grid grid-cols-4 gap-y-4">
            {HOME_QUICK_MENUS.map((menu) => (
              <Link
                key={menu.label}
                href={menu.href}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${menu.tone}`}
                  aria-hidden="true"
                >
                  {menu.icon}
                </span>
                <span className="text-[11px] font-medium text-[var(--fc-text-sub)]">{menu.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 알림 배너 ── */}
        <section className="mt-4 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 px-5 py-4">
          <p className="text-base font-bold text-amber-900">신학기 준비 체크리스트</p>
          <p className="mt-1 text-xs text-amber-800/80">
            식단표·복약·등하원 기록을 먼저 정리하면 사용성이 훨씬 좋아져요.
          </p>
        </section>

        {/* ── 데스크톱 전용 로그인/바로가기 ── */}
        <section className="fc-card mt-4 hidden p-5 md:block">
          <p className="text-sm text-[var(--fc-text-sub)]">
            {session
              ? `${session.email || session.userId} 계정으로 로그인 중입니다.`
              : "게스트 모드입니다. 로그인하면 가족 초대/저장 기능을 쓸 수 있습니다."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/auth?mode=login" className="fc-btn fc-btn-primary px-4">
              로그인/회원가입
            </Link>
            <Link
              href="/dashboard"
              className="fc-btn border border-[var(--fc-border)] bg-white px-4 text-[var(--fc-text)]"
            >
              대시보드
            </Link>
            <Link
              href="/planner"
              className="fc-btn border border-[var(--fc-border)] bg-white px-4 text-[var(--fc-text)]"
            >
              돌봄 플래너
            </Link>
          </div>
        </section>
      </div>

      {/* ── 플로팅 CTA ── */}
      <div className="fc-float-cta w-[calc(100%-32px)] max-w-sm md:hidden">
        <Link
          href="/planner"
          className="fc-btn fc-btn-primary w-full rounded-full py-3.5 text-base"
        >
          오늘 기록 시작하기
        </Link>
      </div>

      {/* ── 하단 고정 탭바 ── */}
      <nav className="fc-bottom-nav md:hidden">
        <div className="mx-auto grid w-full max-w-sm grid-cols-4 px-2 py-1.5">
          {BOTTOM_TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold ${
                tab.active ? "text-blue-600" : "text-[var(--fc-text-sub)]"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
