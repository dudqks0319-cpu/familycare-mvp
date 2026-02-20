import Link from "next/link";

import { acceptRecipientInviteAction } from "@/app/invite/actions";
import { getAuthSessionFromCookie } from "@/lib/auth-session";
import { getRecipientInviteByToken, type RecipientInvite } from "@/lib/familycare-db";
import { PUBLIC_TEST_EMAIL, isPublicTestMode } from "@/lib/public-test-mode";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

type InvitePageProps = {
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

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "수락 대기";
    case "accepted":
      return "이미 수락됨";
    case "revoked":
      return "초대 취소됨";
    case "expired":
      return "만료됨";
    default:
      return status;
  }
}

function createMockInvite(token: string): RecipientInvite {
  const now = new Date();

  return {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    recipient_id: "11111111-1111-4111-8111-111111111111",
    invited_email: PUBLIC_TEST_EMAIL,
    relationship: "가족",
    can_edit: true,
    invite_token: token,
    invited_by: "00000000-0000-4000-8000-000000000001",
    status: "pending",
    expires_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
    accepted_user_id: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  const token = readParam(params, "token");
  const error = readParam(params, "error");
  const configured = isSupabaseConfigured();
  const publicTestMode = isPublicTestMode();

  const session = await getAuthSessionFromCookie();
  const useMockMode = publicTestMode || !configured || !session;

  if (!session && token && !useMockMode) {
    const loginUrl = `/auth?mode=login&redirect=${encodeURIComponent(
      `/invite?token=${token}`,
    )}`;

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <header className="space-y-2">
          <p className="text-sm font-medium text-sky-700">FamilyCare MVP · 초대 수락</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            가족 초대를 받으셨습니다
          </h1>
          <p className="text-sm text-slate-600">
            초대를 수락하려면 먼저 로그인해 주세요. 로그인 후 이 페이지로 다시 돌아옵니다.
          </p>
        </header>

        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center">
          <a
            href={loginUrl}
            className="inline-flex rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white hover:bg-sky-700"
          >
            로그인 / 회원가입 하기
          </a>
        </section>
      </main>
    );
  }

  const invite =
    token && useMockMode
      ? createMockInvite(token)
      : configured && token && session
        ? await getRecipientInviteByToken(session, token)
        : null;

  const isPending = invite?.status === "pending";
  const isExpired =
    invite?.expires_at ? new Date(invite.expires_at) <= new Date() : false;
  const emailMatches = useMockMode
    ? true
    : Boolean(session?.email) &&
      Boolean(invite?.invited_email) &&
      session?.email?.toLowerCase() === invite?.invited_email.toLowerCase();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium text-sky-700">FamilyCare MVP · 초대 수락</p>
        <h1 className="text-3xl font-semibold text-slate-900">가족 초대 확인</h1>
        <p className="text-sm text-slate-600">
          초대 이메일과 현재 로그인 계정이 일치하면 바로 수락할 수 있습니다.
        </p>
      </header>

      {useMockMode ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          공개 테스트 모드입니다. 초대 수락은 시뮬레이션으로 동작합니다.
        </section>
      ) : null}

      {!useMockMode && !session ? (
        <section className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          초대를 수락하려면 먼저 로그인해 주세요.
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </section>
      ) : null}

      {!token ? (
        <section className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          초대 토큰이 없습니다. 전달받은 초대 링크를 다시 확인해 주세요.
        </section>
      ) : null}

      {token && !invite ? (
        <section className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          유효한 초대 정보를 찾을 수 없습니다.
        </section>
      ) : null}

      {invite ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">초대 정보</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              <span className="font-medium">초대 이메일:</span> {invite.invited_email}
            </li>
            <li>
              <span className="font-medium">현재 계정:</span> {session?.email || PUBLIC_TEST_EMAIL}
            </li>
            <li>
              <span className="font-medium">관계:</span> {invite.relationship || "미지정"}
            </li>
            <li>
              <span className="font-medium">권한:</span> {invite.can_edit ? "편집 가능" : "조회 전용"}
            </li>
            <li>
              <span className="font-medium">상태:</span> {statusLabel(invite.status)}
            </li>
            <li>
              <span className="font-medium">만료:</span> {formatDateTime(invite.expires_at)}
            </li>
          </ul>

          {isPending && !isExpired ? (
            emailMatches ? (
              <form action={acceptRecipientInviteAction} className="mt-4">
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white hover:bg-sky-700"
                >
                  초대 수락하기
                </button>
              </form>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">이메일이 일치하지 않습니다.</p>
                <p className="mt-1">초대받은 이메일: {invite.invited_email}</p>
                <p>현재 계정: {session?.email || PUBLIC_TEST_EMAIL}</p>
              </div>
            )
          ) : null}

          {isPending && isExpired ? (
            <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
              이 초대는 만료되었습니다. 초대한 분께 새 초대를 요청해 주세요.
            </p>
          ) : null}

          {!isPending ? (
            <p className="mt-4 text-sm text-slate-600">
              이 초대는 이미 처리되었습니다.
            </p>
          ) : null}
        </section>
      ) : null}

      <div>
        <Link href="/dashboard" className="text-sm font-medium text-slate-900 underline">
          대시보드로 이동
        </Link>
      </div>
    </main>
  );
}
