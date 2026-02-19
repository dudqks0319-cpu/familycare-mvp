import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { requireAuthSession } from "@/lib/auth-session";

function toKstDateTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

export default async function DashboardPage() {
  const session = await requireAuthSession();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium text-sky-700">FamilyCare MVP · Dashboard</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          인증 성공 후 진입 화면
        </h1>
        <p className="text-sm text-slate-600">
          Day1에서는 로그인 세션 확인 및 기본 사용자 컨텍스트 표시까지 제공합니다.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">세션 상태</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-medium">User ID:</span> {session.userId}
          </li>
          <li>
            <span className="font-medium">Email:</span> {session.email || "(없음)"}
          </li>
          <li>
            <span className="font-medium">만료 시각(KST):</span>{" "}
            {toKstDateTime(session.expiresAt)}
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">다음 단계 제안</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700">
          <li>Supabase 테이블 생성 SQL 실행</li>
          <li>가족/피보호자 관계(RLS)와 CRUD API 연결</li>
          <li>복약 체크·안부 체크인 화면 구현</li>
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          href="/"
        >
          홈
        </Link>
        <Link
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          href="/auth?mode=login"
        >
          인증 화면
        </Link>
        <form action={logoutAction}>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            type="submit"
          >
            로그아웃
          </button>
        </form>
      </div>
    </main>
  );
}
