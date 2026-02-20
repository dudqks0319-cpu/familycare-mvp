import Link from "next/link";

import { getAuthSessionFromCookie } from "@/lib/auth-session";

export default async function Home() {
  const session = await getAuthSessionFromCookie();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-4">
        <p className="text-sm font-medium text-sky-700">FamilyCare MVP · Week1-2 완료</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          가족 돌봄 운영 MVP
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          인증, 피보호자/멤버 관리, 복약 일정/기록, 체크인 알림, 설정, API 노출까지
          2주차 계획 범위를 연결한 버전입니다.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <FeatureCard
          title="Week1 Day1"
          description="Supabase Auth + 세션 쿠키 + 초기 스키마"
        />
        <FeatureCard
          title="Week1 Day2-5"
          description="피보호자/복약/체크인 핵심 플로우"
        />
        <FeatureCard
          title="Week2 Day6-9"
          description="복약 로그, 알림 보드, 프로필 설정"
        />
        <FeatureCard
          title="Week2 Day10"
          description="인증 기반 /api/dashboard JSON 제공"
        />
        <FeatureCard
          title="Care Planner"
          description="24시간 기록 + 도넛 차트 + 주중/주말 + 달력"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">현재 로그인 상태</h2>
        <p className="mt-2 text-sm text-slate-700">
          {session
            ? `${session.email || session.userId} 계정으로 로그인되어 있습니다.`
            : "아직 로그인되어 있지 않습니다."}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
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
          href="/settings"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          설정
        </Link>
        <Link
          href="/planner"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          돌봄 플래너
        </Link>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </article>
  );
}
