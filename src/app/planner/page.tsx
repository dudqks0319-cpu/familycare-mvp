import Link from "next/link";

import { PlannerClient } from "@/app/planner/planner-client";

export default function PlannerPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 bg-slate-50 px-4 py-6 md:px-6 md:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            FamilyCare MVP · Care Planner
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">돌봄 플래너</h1>
          <p className="mt-1 text-sm text-slate-600">
            베이비타임 느낌의 모바일 중심 기록 UX로 빠르게 확인하고 입력할 수 있게 개선했습니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            대시보드
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            설정
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            홈
          </Link>
        </div>
      </header>

      <PlannerClient />
    </main>
  );
}
