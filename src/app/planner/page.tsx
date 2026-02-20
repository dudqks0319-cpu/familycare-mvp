import Link from "next/link";

import { PlannerClient } from "@/app/planner/planner-client";

export default function PlannerPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sky-700">FamilyCare MVP · Care Planner</p>
          <h1 className="text-3xl font-semibold text-slate-900">돌봄 플래너</h1>
          <p className="mt-1 text-sm text-slate-600">
            영유아/어르신 돌봄 시나리오를 24시간 기준으로 기록하고 시각화합니다.
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
