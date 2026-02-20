import Link from "next/link";

import { createFridgeItemAction, deleteFridgeItemAction } from "@/app/fridge/actions";
import { getAuthSessionFromCookie } from "@/lib/auth-session";
import {
  getFridgeDashboardData,
  type FridgeItem,
  type RecipeRecommendation,
} from "@/lib/fridge-db";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

type FridgePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ExpiryMeta = {
  label: string;
  toneClassName: string;
  daysLeft: number | null;
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

function formatDateOnly(dateValue: string | null): string {
  if (!dateValue) {
    return "미입력";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${dateValue}T00:00:00+09:00`));
}

function getDaysLeft(dateValue: string | null): number | null {
  if (!dateValue) {
    return null;
  }

  const [yearText, monthText, dayText] = dateValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const expiryUtcMs = Date.UTC(year, month - 1, day);
  const now = new Date();
  const kstNowUtcMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return Math.floor((expiryUtcMs - kstNowUtcMs) / (1000 * 60 * 60 * 24));
}

function getExpiryMeta(item: FridgeItem): ExpiryMeta {
  const daysLeft = getDaysLeft(item.expires_on);

  if (daysLeft === null) {
    return {
      label: "유통기한 미입력",
      toneClassName: "border-slate-200 bg-slate-50 text-slate-700",
      daysLeft,
    };
  }

  if (daysLeft < 0) {
    return {
      label: `유통기한 경과 (${Math.abs(daysLeft)}일)` ,
      toneClassName: "border-rose-200 bg-rose-50 text-rose-800",
      daysLeft,
    };
  }

  if (daysLeft <= 3) {
    return {
      label: `3일 이내 (${daysLeft}일 남음)`,
      toneClassName: "border-orange-200 bg-orange-50 text-orange-800",
      daysLeft,
    };
  }

  if (daysLeft <= 7) {
    return {
      label: `7일 이내 (${daysLeft}일 남음)`,
      toneClassName: "border-amber-200 bg-amber-50 text-amber-800",
      daysLeft,
    };
  }

  return {
    label: `${daysLeft}일 남음`,
    toneClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    daysLeft,
  };
}

function normalizeIngredient(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "");
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}

function getSubstitutes(
  recommendation: RecipeRecommendation,
  ingredientName: string,
): string[] {
  const substituteMap = recommendation.recipe.substitute_map;

  if (!substituteMap || typeof substituteMap !== "object") {
    return [];
  }

  const direct = substituteMap[ingredientName];
  const directValues = toStringArray(direct);

  if (directValues.length > 0) {
    return directValues;
  }

  const target = normalizeIngredient(ingredientName);

  for (const [key, value] of Object.entries(substituteMap)) {
    if (normalizeIngredient(key) === target) {
      const values = toStringArray(value);

      if (values.length > 0) {
        return values;
      }
    }
  }

  return [];
}

function buildCoupangSearchUrl(query: string): string {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`;
}

function toDifficultyLabel(value: string): string {
  if (value === "easy") {
    return "쉬움";
  }

  if (value === "hard") {
    return "어려움";
  }

  return "보통";
}

export default async function FridgePage({ searchParams }: FridgePageProps) {
  const params = await searchParams;
  const message = readParam(params, "message");
  const error = readParam(params, "error");

  const configured = isSupabaseConfigured();
  const session = await getAuthSessionFromCookie();

  const dashboardData = configured && session
    ? await getFridgeDashboardData(session)
    : { items: [], recommendations: [] };

  const expiringSoonCount = dashboardData.items.filter((item) => {
    const meta = getExpiryMeta(item);

    return meta.daysLeft !== null && meta.daysLeft <= 7;
  }).length;

  return (
    <main className="min-h-screen bg-[var(--fc-bg)] pb-36 md:pb-10">
      <div className="mx-auto w-full max-w-md px-4 pt-6 md:max-w-6xl md:px-6 md:pt-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-blue-600">우리집 냉장고를 부탁해</p>
            <h1 className="mt-0.5 text-xl font-bold text-[var(--fc-text)] md:text-3xl">냉장고 관리 + 메뉴 추천</h1>
            <p className="mt-1 text-xs text-[var(--fc-text-sub)] md:text-sm">
              수동으로 식재료와 유통기한을 입력하면, 바로 만들 수 있는 레시피를 추천해 드립니다.
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
              href="/auth?mode=login&redirect=%2Ffridge"
              className="fc-btn fc-btn-primary px-3 text-xs"
            >
              로그인
            </Link>
          </div>
        </header>

        <div className="mt-4 space-y-2.5">
          {!configured ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              Supabase 연결 정보가 아직 설정되지 않았습니다. 먼저 .env.local을 입력해 주세요.
            </section>
          ) : null}

          {!session ? (
            <section className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              로그인 후 식재료를 저장하고 유통기한 알림/메뉴 추천을 받을 수 있습니다.
            </section>
          ) : null}

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
        </div>

        {configured && session ? (
          <>
            <section className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <article className="rounded-2xl border border-[var(--fc-border)] bg-white p-4 shadow-sm">
                <p className="text-[11px] font-medium text-[var(--fc-text-sub)]">등록 식재료</p>
                <p className="mt-1.5 text-2xl font-bold text-[var(--fc-text)]">{dashboardData.items.length}</p>
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-[11px] font-medium text-amber-700">7일 이내</p>
                <p className="mt-1.5 text-2xl font-bold text-amber-800">{expiringSoonCount}</p>
              </article>
              <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <p className="text-[11px] font-medium text-blue-700">추천 메뉴</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-800">{dashboardData.recommendations.length}</p>
              </article>
              <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-[11px] font-medium text-emerald-700">쿠팡 검색</p>
                <a
                  href={buildCoupangSearchUrl("냉장고 정리 용기")}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-semibold text-emerald-800 underline underline-offset-2"
                >
                  바로가기
                </a>
              </article>
            </section>

            <section className="fc-card mt-4 p-5">
              <h2 className="text-base font-bold text-[var(--fc-text)]">식재료 등록</h2>
              <p className="mt-1 text-xs text-[var(--fc-text-sub)]">큰술(T)/작은술(t) 레시피 매칭을 위해 이름을 정확히 입력해 주세요.</p>

              <form action={createFridgeItemAction} className="mt-4 grid gap-3 md:grid-cols-6">
                <label className="text-xs font-medium text-[var(--fc-text-sub)] md:col-span-2">
                  식재료명
                  <input
                    name="ingredientName"
                    className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="예: 양파, 계란, 진간장"
                    required
                  />
                </label>

                <label className="text-xs font-medium text-[var(--fc-text-sub)] md:col-span-1">
                  카테고리
                  <select
                    name="category"
                    defaultValue="채소"
                    className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {[
                      "채소",
                      "과일",
                      "육류",
                      "해산물",
                      "유제품",
                      "양념",
                      "가공식품",
                      "기타",
                    ].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-medium text-[var(--fc-text-sub)] md:col-span-1">
                  수량
                  <input
                    name="quantityText"
                    className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="예: 3개, 1팩"
                  />
                </label>

                <label className="text-xs font-medium text-[var(--fc-text-sub)] md:col-span-1">
                  유통기한
                  <input
                    type="date"
                    name="expiresOn"
                    className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-xs font-medium text-[var(--fc-text-sub)] md:col-span-1">
                  메모
                  <input
                    name="note"
                    className="mt-1 w-full rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)] px-3 py-2.5 text-sm text-[var(--fc-text)] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="예: 냉동실 보관"
                  />
                </label>

                <div className="md:col-span-6">
                  <button type="submit" className="fc-btn fc-btn-primary px-5 text-sm">식재료 저장</button>
                </div>
              </form>
            </section>

            <section className="fc-card mt-4 p-5">
              <h2 className="text-base font-bold text-[var(--fc-text)]">내 냉장고 식재료</h2>

              {dashboardData.items.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-[var(--fc-border)] bg-[var(--fc-bg)] p-4 text-sm text-[var(--fc-text-sub)]">
                  등록된 식재료가 없습니다. 위에서 식재료를 먼저 추가해 주세요.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dashboardData.items.map((item) => {
                    const expiryMeta = getExpiryMeta(item);

                    return (
                      <li key={item.id} className={`rounded-2xl border p-3 ${expiryMeta.toneClassName}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{item.ingredient_name}</p>
                            <p className="mt-0.5 text-[11px]">
                              {item.category}
                              {item.quantity_text ? ` · ${item.quantity_text}` : ""}
                              {item.note ? ` · ${item.note}` : ""}
                            </p>
                            <p className="mt-1 text-[11px]">유통기한: {formatDateOnly(item.expires_on)} · {expiryMeta.label}</p>
                          </div>

                          <form action={deleteFridgeItemAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              삭제
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="fc-card mt-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[var(--fc-text)]">추천 메뉴 (샘플 레시피)</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                  100개 레시피는 다음 단계에서 확장 예정
                </span>
              </div>

              {dashboardData.recommendations.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-[var(--fc-border)] bg-[var(--fc-bg)] p-4 text-sm text-[var(--fc-text-sub)]">
                  추천 가능한 레시피가 없습니다. 식재료를 더 추가해 주세요.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {dashboardData.recommendations.map((recommendation) => (
                    <li key={recommendation.recipe.id} className="rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-bg)] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--fc-text)]">{recommendation.recipe.name}</h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {toDifficultyLabel(recommendation.recipe.difficulty)}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          매칭률 {Math.round(recommendation.matchRate * 100)}%
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[var(--fc-text-sub)]">{recommendation.recipe.description}</p>

                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-xs font-semibold text-emerald-800">있는 재료</p>
                          {recommendation.matchedIngredients.length === 0 ? (
                            <p className="mt-1 text-[11px] text-emerald-700">매칭된 재료 없음</p>
                          ) : (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {recommendation.matchedIngredients.map((item) => (
                                <span key={`${recommendation.recipe.id}-have-${item}`} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-emerald-800">
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold text-amber-900">부족한 재료</p>
                          {recommendation.missingIngredients.length === 0 ? (
                            <p className="mt-1 text-[11px] text-amber-800">지금 바로 만들 수 있어요 🎉</p>
                          ) : (
                            <ul className="mt-1 space-y-1">
                              {recommendation.missingIngredients.map((item) => {
                                const substitutes = getSubstitutes(recommendation, item);

                                return (
                                  <li key={`${recommendation.recipe.id}-missing-${item}`} className="text-[11px] text-amber-900">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span>• {item}</span>
                                      <a
                                        href={buildCoupangSearchUrl(item)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold underline underline-offset-2"
                                      >
                                        쿠팡 검색
                                      </a>
                                    </div>
                                    {substitutes.length > 0 ? (
                                      <p className="ml-2 mt-0.5 text-[11px] text-amber-800">
                                        대체재: {substitutes.join(", ")}
                                      </p>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
