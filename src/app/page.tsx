import Link from "next/link";

import { getAuthSessionFromCookie } from "@/lib/auth-session";

export default async function Home() {
  const session = await getAuthSessionFromCookie();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="space-y-4">
        <p className="text-sm font-medium text-sky-700">FamilyCare MVP</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          가족 돌봄 앱 MVP 시작점
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          오늘 구현한 Day1 범위는 <strong>Supabase 스키마 + 인증 뼈대</strong>입니다.
          회원가입/로그인/로그아웃 플로우와 대시보드 진입 골격을 먼저 만들었습니다.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">인증</h2>
          <p className="mt-2 text-sm text-slate-600">
            Supabase Auth REST 기반으로 로그인/회원가입 동작을 구성했습니다.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">세션</h2>
          <p className="mt-2 text-sm text-slate-600">
            httpOnly 쿠키에 세션 정보를 저장해 서버 페이지 보호를 적용했습니다.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">DB 스키마</h2>
          <p className="mt-2 text-sm text-slate-600">
            피보호자, 구성원 권한, 복약 일정, 체크인 테이블 SQL 초안을 포함했습니다.
          </p>
        </article>
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
          대시보드 보기
        </Link>
      </div>
    </main>
  );
}
