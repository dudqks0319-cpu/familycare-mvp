import Link from "next/link";

import { acceptRecipientInviteAction } from "@/app/invite/actions";
import { requireAuthSession } from "@/lib/auth-session";
import { getRecipientInviteByToken } from "@/lib/familycare-db";
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

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  const token = readParam(params, "token");
  const error = readParam(params, "error");
  const configured = isSupabaseConfigured();

  const session = await requireAuthSession();
  const invite = configured && token ? await getRecipientInviteByToken(session, token) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium text-sky-700">FamilyCare MVP · 초대 수락</p>
        <h1 className="text-3xl font-semibold text-slate-900">가족 초대 확인</h1>
        <p className="text-sm text-slate-600">
          로그인 계정과 초대 이메일이 일치하면 바로 수락할 수 있습니다.
        </p>
      </header>

      {!configured ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase 환경변수가 설정되지 않았습니다.
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
              <span className="font-medium">현재 로그인:</span> {session.email || session.userId}
            </li>
            <li>
              <span className="font-medium">관계:</span> {invite.relationship || "미지정"}
            </li>
            <li>
              <span className="font-medium">권한:</span> {invite.can_edit ? "편집 가능" : "조회 전용"}
            </li>
            <li>
              <span className="font-medium">상태:</span> {invite.status}
            </li>
            <li>
              <span className="font-medium">만료:</span> {formatDateTime(invite.expires_at)}
            </li>
          </ul>

          {invite.status === "pending" ? (
            <form action={acceptRecipientInviteAction} className="mt-4">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                초대 수락하기
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              이 초대는 이미 처리되었거나 만료되었습니다.
            </p>
          )}
        </section>
      ) : null}

      <div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-900 underline"
        >
          대시보드로 이동
        </Link>
      </div>
    </main>
  );
}
