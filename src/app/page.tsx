import Link from "next/link";

import { getAuthSessionFromCookie } from "@/lib/auth-session";

const HOME_QUICK_MENUS = [
  { href: "/planner", label: "오늘 기록", icon: "✏️", tone: "bg-indigo-50 text-indigo-500" },
  { href: "/planner", label: "일정·접종", icon: "📅", tone: "bg-red-50 text-red-500" },
  { href: "/dashboard", label: "돌봄 관리", icon: "📊", tone: "bg-sky-50 text-sky-500" },
  { href: "/dashboard", label: "복약 체크", icon: "💊", tone: "bg-pink-50 text-pink-500" },
  { href: "/invite", label: "가족 초대", icon: "👨‍👩‍👧", tone: "bg-lime-50 text-lime-500" },
  { href: "/settings", label: "설정", icon: "⚙️", tone: "bg-emerald-50 text-emerald-500" },
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
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">👶</div>
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

        <section className="fc-card mt-5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-sky-400 px-5 py-5 text-white">
            <p className="text-sm font-medium opacity-90">오늘의 돌봄</p>
            <p className="mt-1 text-2xl font-bold">한눈에 보고 바로 기록</p>
            <p className="mt-1.5 text-sm opacity-90">기록 시작 버튼 하나로 오늘 타임라인을 바로 입력하세요.</p>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            <Link href="/planner" className="fc-btn fc-btn-primary flex-1 rounded-xl px-4 text-sm">
              오늘 기록 시작하기
            </Link>
            <Link
              href="/dashboard"
              className="fc-btn rounded-xl border border-[var(--fc-border)] bg-white px-4 text-sm text-[var(--fc-text)]"
            >
              돌봄 관리 보기
            </Link>
          </div>
        </section>

        <section className="fc-card mt-4 p-4">
          <p className="text-sm font-semibold text-[var(--fc-text)]">바로가기</p>
          <div className="mt-3 grid grid-cols-3 gap-y-4">
            {HOME_QUICK_MENUS.map((menu) => (
              <Link key={menu.label} href={menu.href} className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${menu.tone}`}
                  aria-hidden="true"
                >
                  {menu.icon}
                </span>
                <span className="text-[11px] font-medium text-[var(--fc-text-sub)]">{menu.label}</span>
              </Link>
            ))}
          </div>
        </section>

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

      <div className="fc-float-cta w-[calc(100%-32px)] max-w-sm md:hidden">
        <Link href="/planner" className="fc-btn fc-btn-primary w-full rounded-full py-3.5 text-base">
          오늘 기록 시작하기
        </Link>
      </div>
    </main>
  );
}
