import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { saveProfileAction } from "@/app/settings/actions";
import { getAuthSessionFromCookie } from "@/lib/auth-session";
import { getMyProfile } from "@/lib/familycare-db";
import {
  PUBLIC_TEST_EMAIL,
  PUBLIC_TEST_USER_ID,
  isPublicTestMode,
} from "@/lib/public-test-mode";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return "";
}

function formatDateTime(dateTime: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(dateTime));
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getAuthSessionFromCookie();
  const params = await searchParams;
  const message = readParam(params, "message");
  const error = readParam(params, "error");
  const configured = isSupabaseConfigured();
  const useMockMode = isPublicTestMode() || !configured || !session;

  const profile =
    !useMockMode && session
      ? await getMyProfile(session)
      : {
          full_name: "테스트 사용자",
          phone: "010-0000-0000",
        };

  const accountEmail = session?.email || PUBLIC_TEST_EMAIL;
  const accountUserId = session?.userId || PUBLIC_TEST_USER_ID;
  const accountExpiresAtIso = session
    ? new Date(session.expiresAt * 1000).toISOString()
    : "2099-01-01T00:00:00.000Z";

  return (
    <main className="min-h-screen bg-[var(--fc-bg)] pb-32 md:pb-10">
      <div className="mx-auto w-full max-w-md px-4 pt-6 md:max-w-5xl md:px-6 md:pt-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-blue-600">FamilyCare MVP</p>
            <h1 className="mt-0.5 text-xl font-bold text-[var(--fc-text)]">설정</h1>
            <p className="mt-0.5 text-xs text-[var(--fc-text-sub)]">계정 프로필과 운영 정보를 관리합니다.</p>
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
              href="/planner"
              className="fc-btn border border-[var(--fc-border)] bg-white px-3 text-xs text-[var(--fc-text)]"
            >
              플래너
            </Link>
            {session && !useMockMode ? (
              <form action={logoutAction}>
                <button type="submit" className="fc-btn bg-slate-900 px-3 text-xs text-white">
                  로그아웃
                </button>
              </form>
            ) : (
              <Link
                href="/auth?mode=login&redirect=%2Fsettings"
                className="fc-btn fc-btn-primary px-3 text-xs"
              >
                로그인
              </Link>
            )}
          </div>
        </header>

        <div className="mt-4 space-y-2.5">
          {message ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              {message}
            </section>
          ) : null}

          {error ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
              {error}
            </section>
          ) : null}

          {useMockMode ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              공개 테스트 모드입니다. 저장 버튼은 시뮬레이션으로 동작합니다.
            </section>
          ) : null}
        </div>

        <section className="fc-card mt-4 p-5">
          <h2 className="text-base font-bold text-[var(--fc-text)]">기본 프로필</h2>
          <p className="mt-1 text-xs text-[var(--fc-text-sub)]">알림·기록 작성자 정보를 구분하기 위해 사용됩니다.</p>

          <form action={saveProfileAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-[var(--fc-text-sub)]">
              이름
              <input
                name="fullName"
                defaultValue={profile?.full_name ?? ""}
                className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="예: 정영빈"
              />
            </label>
            <label className="text-xs font-medium text-[var(--fc-text-sub)]">
              연락처
              <input
                name="phone"
                defaultValue={profile?.phone ?? ""}
                className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="예: 010-1234-5678"
              />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="fc-btn fc-btn-primary px-4 text-sm">
                저장
              </button>
            </div>
          </form>
        </section>

        <section className="fc-card mt-4 p-5">
          <h2 className="text-base font-bold text-[var(--fc-text)]">계정 정보</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--fc-text)]">
            <li>
              <span className="font-semibold">이메일:</span> {accountEmail}
            </li>
            <li>
              <span className="font-semibold">User ID:</span> {accountUserId}
            </li>
            <li>
              <span className="font-semibold">세션 만료:</span> {formatDateTime(accountExpiresAtIso)}
            </li>
          </ul>
        </section>
      </div>

    </main>
  );
}
