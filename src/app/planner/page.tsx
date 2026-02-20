import Link from "next/link";

import { PlannerClient } from "@/app/planner/planner-client";

export default function PlannerPage() {
  return (
    <main className="min-h-screen bg-[var(--fc-bg)] pb-8 md:pb-10">
      <div className="mx-auto w-full max-w-md px-4 pt-6 md:max-w-5xl md:px-6 md:pt-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
              FamilyCare MVP · Care Planner
            </p>
            <h1 className="mt-2 text-xl font-bold text-[var(--fc-text)] md:text-3xl">돌봄 플래너</h1>
            <p className="mt-1 text-xs text-[var(--fc-text-sub)] md:text-sm">
              한눈 요약 → 빠른 기록 → 상세 분석 순서로 바로 사용할 수 있게 정리했습니다.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="fc-btn border border-[var(--fc-border)] bg-white px-3 text-xs text-[var(--fc-text)]"
            >
              홈
            </Link>
            <Link
              href="/dashboard"
              className="fc-btn border border-[var(--fc-border)] bg-white px-3 text-xs text-[var(--fc-text)]"
            >
              대시보드
            </Link>
            <Link
              href="/settings"
              className="fc-btn border border-[var(--fc-border)] bg-white px-3 text-xs text-[var(--fc-text)]"
            >
              설정
            </Link>
          </div>
        </header>

        <div className="mt-4">
          <PlannerClient />
        </div>
      </div>
    </main>
  );
}
