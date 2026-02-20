import Link from "next/link";

import { loginAction, signupAction, startOAuthAction } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

type AuthPageProps = {
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

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const mode = readParam(params, "mode") === "signup" ? "signup" : "login";
  const error = readParam(params, "error");
  const message = readParam(params, "message");
  const redirectTo = readParam(params, "redirect");
  const configured = isSupabaseConfigured();

  return (
    <main className="min-h-screen bg-[var(--fc-bg)] pb-20">
      <div className="mx-auto w-full max-w-md px-4 pt-8 md:max-w-5xl md:px-6 md:pt-12">
        <header className="space-y-1">
          <p className="text-xs font-medium text-blue-600">FamilyCare MVP · 인증</p>
          <h1 className="text-2xl font-bold text-[var(--fc-text)]">이메일 + 소셜 로그인</h1>
          <p className="text-sm text-[var(--fc-text-sub)]">
            이메일 로그인과 Google/카카오 소셜 로그인을 함께 제공합니다.
          </p>
        </header>

        <div className="mt-4 space-y-2.5">
          {!configured ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <p className="font-semibold">환경변수 설정 필요</p>
              <p>
                <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 값을
                .env.local에 추가해 주세요.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              {message}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section
            className={`fc-card p-5 ${mode === "login" ? "ring-2 ring-blue-100" : ""}`}
            aria-current={mode === "login" ? "true" : undefined}
          >
            <h2 className="mb-4 text-base font-bold text-[var(--fc-text)]">로그인</h2>
            <form action={loginAction} className="space-y-3">
              {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
              <label className="block text-xs font-medium text-[var(--fc-text-sub)]">
                이메일
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  type="email"
                  name="email"
                  placeholder="guardian@example.com"
                  required
                />
              </label>
              <label className="block text-xs font-medium text-[var(--fc-text-sub)]">
                비밀번호
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  type="password"
                  name="password"
                  required
                />
              </label>
              <button type="submit" className="fc-btn fc-btn-primary w-full rounded-xl text-sm">
                이메일 로그인
              </button>
            </form>

            <div className="my-4 h-px bg-[var(--fc-border)]" />

            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--fc-text-sub)]">소셜 로그인 (Supabase OAuth)</p>
              <form action={startOAuthAction}>
                <input type="hidden" name="provider" value="google" />
                {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
                <button
                  type="submit"
                  className="fc-btn w-full rounded-xl border border-[var(--fc-border)] bg-white px-4 text-sm text-[var(--fc-text)] hover:bg-slate-50"
                >
                  Google로 로그인
                </button>
              </form>
              <form action={startOAuthAction}>
                <input type="hidden" name="provider" value="kakao" />
                {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
                <button
                  type="submit"
                  className="fc-btn w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 text-sm text-yellow-900 hover:bg-yellow-100"
                >
                  카카오로 로그인
                </button>
              </form>
              <p className="text-[11px] text-[var(--fc-text-sub)]">
                네이버 로그인은 2단계(NextAuth 연동 브릿지)로 추가 예정입니다.
              </p>
            </div>
          </section>

          <section
            className={`fc-card p-5 ${mode === "signup" ? "ring-2 ring-indigo-100" : ""}`}
            aria-current={mode === "signup" ? "true" : undefined}
          >
            <h2 className="mb-4 text-base font-bold text-[var(--fc-text)]">회원가입</h2>
            <form action={signupAction} className="space-y-3">
              {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
              <label className="block text-xs font-medium text-[var(--fc-text-sub)]">
                이메일
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  type="email"
                  name="email"
                  placeholder="family@example.com"
                  required
                />
              </label>
              <label className="block text-xs font-medium text-[var(--fc-text-sub)]">
                비밀번호 (8자 이상)
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  type="password"
                  name="password"
                  minLength={8}
                  required
                />
              </label>
              <button
                type="submit"
                className="fc-btn w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                회원가입
              </button>
            </form>
          </section>
        </div>

        <div className="mt-4 text-sm text-[var(--fc-text-sub)]">
          <Link className="font-semibold text-[var(--fc-text)] underline underline-offset-2" href="/">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
