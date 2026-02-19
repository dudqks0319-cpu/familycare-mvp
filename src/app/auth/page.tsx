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
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium text-sky-700">FamilyCare MVP · 인증</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          이메일 + 소셜 로그인
        </h1>
        <p className="text-sm text-slate-600">
          MVP 검증을 위해 이메일 로그인과 Google/카카오 소셜 로그인을 함께 제공합니다.
        </p>
      </header>

      {!configured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">환경변수 설정 필요</p>
          <p>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 값을 .env.local에 추가해 주세요.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section
          className={`rounded-2xl border p-6 shadow-sm ${
            mode === "login" ? "border-sky-300 bg-sky-50/60" : "border-slate-200"
          }`}
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">로그인</h2>
          <form action={loginAction} className="space-y-4">
            <label className="block text-sm text-slate-700">
              이메일
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                type="email"
                name="email"
                placeholder="guardian@example.com"
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              비밀번호
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                type="password"
                name="password"
                required
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              이메일 로그인
            </button>
          </form>

          <div className="my-4 h-px bg-slate-200" />

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">소셜 로그인 (Supabase OAuth)</p>
            <form action={startOAuthAction}>
              <input type="hidden" name="provider" value="google" />
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Google로 로그인
              </button>
            </form>
            <form action={startOAuthAction}>
              <input type="hidden" name="provider" value="kakao" />
              <button
                type="submit"
                className="w-full rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-900 hover:bg-yellow-100"
              >
                카카오로 로그인
              </button>
            </form>
            <p className="text-[11px] text-slate-500">
              네이버 로그인은 2단계(NextAuth 연동 브릿지)로 추가 예정입니다.
            </p>
          </div>
        </section>

        <section
          className={`rounded-2xl border p-6 shadow-sm ${
            mode === "signup"
              ? "border-indigo-300 bg-indigo-50/60"
              : "border-slate-200"
          }`}
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">회원가입</h2>
          <form action={signupAction} className="space-y-4">
            <label className="block text-sm text-slate-700">
              이메일
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                type="email"
                name="email"
                placeholder="family@example.com"
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              비밀번호 (8자 이상)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                type="password"
                name="password"
                minLength={8}
                required
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              회원가입
            </button>
          </form>
        </section>
      </div>

      <div className="text-sm text-slate-600">
        <Link className="font-medium text-slate-900 underline" href="/">
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
