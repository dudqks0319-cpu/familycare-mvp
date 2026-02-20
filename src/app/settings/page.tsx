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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sky-700">FamilyCare MVP · Week2</p>
          <h1 className="text-3xl font-semibold text-slate-900">설정</h1>
          <p className="mt-1 text-sm text-slate-600">
            계정 프로필과 운영 정보를 관리합니다.
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
            href="/"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            홈
          </Link>
          <Link
            href="/planner"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            돌봄 플래너
          </Link>
          {session && !useMockMode ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                로그아웃
              </button>
            </form>
          ) : (
            <Link
              href="/auth?mode=login&redirect=%2Fsettings"
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              로그인 전환
            </Link>
          )}
        </div>
      </header>

      {message ? (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          {message}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </section>
      ) : null}

      {useMockMode ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          공개 테스트 모드입니다. 저장 버튼은 시뮬레이션으로 동작합니다.
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">기본 프로필</h2>
        <p className="mt-1 text-sm text-slate-600">
          알림·기록 작성자 정보를 구분하기 위해 사용됩니다.
        </p>

        <form action={saveProfileAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            이름
            <input
              name="fullName"
              defaultValue={profile?.full_name ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="예: 정영빈"
            />
          </label>
          <label className="text-sm text-slate-700">
            연락처
            <input
              name="phone"
              defaultValue={profile?.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="예: 010-1234-5678"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              저장
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">계정 정보</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-medium">이메일:</span> {accountEmail}
          </li>
          <li>
            <span className="font-medium">User ID:</span> {accountUserId}
          </li>
          <li>
            <span className="font-medium">세션 만료:</span>{" "}
            {formatDateTime(accountExpiresAtIso)}
          </li>
        </ul>
      </section>
    </main>
  );
}
