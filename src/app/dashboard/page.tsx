import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import {
  createCheckinAction,
  createMedicationLogAction,
  createMedicationScheduleAction,
  createRecipientAction,
  createRecipientInviteAction,
  deleteRecipientAction,
  removeRecipientMemberAction,
  revokeRecipientInviteAction,
  toggleMedicationScheduleAction,
  updateRecipientMemberPermissionAction,
} from "@/app/dashboard/actions";
import { CopyButton } from "@/app/dashboard/components/copy-button";
import { getAuthSessionFromCookie, requireAuthSession } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/familycare-db";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CHECKIN_STATUS_META = {
  ok: {
    label: "정상",
    className: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    label: "주의",
    className: "bg-amber-100 text-amber-700",
  },
  critical: {
    label: "위험",
    className: "bg-rose-100 text-rose-700",
  },
} as const;

const MEDICATION_LOG_STATUS_META = {
  taken: {
    label: "복약 완료",
    className: "bg-emerald-100 text-emerald-700",
  },
  skipped: {
    label: "복약 누락",
    className: "bg-rose-100 text-rose-700",
  },
} as const;

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

function formatDateOnly(dateValue: string | null): string {
  if (!dateValue) {
    return "미입력";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "수락 대기";
    case "accepted":
      return "수락 완료";
    case "revoked":
      return "취소됨";
    case "expired":
      return "만료";
    default:
      return status;
  }
}

function toMaskedUserId(userId: string): string {
  if (userId.length <= 10) {
    return userId;
  }

  return `${userId.slice(0, 6)}...${userId.slice(-4)}`;
}

function buildInviteUrl(token: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  return `${baseUrl}/invite?token=${token}`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getAuthSessionFromCookie();
  const params = await searchParams;
  const error = readParam(params, "error");
  const message = readParam(params, "message");

  const configured = isSupabaseConfigured();
  const isGuest = !session;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-sky-700">FamilyCare MVP · Week1-2</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            돌봄 운영 대시보드
          </h1>
          <p className="text-sm text-slate-600">
            피보호자 관리, 복약 일정/기록, 체크인 알림을 한 화면에서 운영합니다.
          </p>
          <p className="text-xs text-slate-500">
            {session
              ? `로그인 계정: ${session.email || session.userId}`
              : "비회원 미리보기 모드입니다. 실제 데이터 확인/수정은 로그인 후 가능합니다."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            홈
          </Link>

          {session ? (
            <>
              <Link
                href="/settings"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                설정
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth?mode=login&redirect=%2Fdashboard"
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              로그인/회원가입
            </Link>
          )}
        </div>
      </header>

      {session && !configured ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Supabase 환경변수를 먼저 설정해 주세요.</p>
          <p>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 값을 <code>.env.local</code>에 넣은 뒤
            다시 시도해 주세요.
          </p>
        </section>
      ) : null}

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

      {isGuest ? <GuestDashboardPreview /> : null}
      {session && configured ? <DashboardContent sessionUserId={session.userId} /> : null}
    </main>
  );
}

function GuestDashboardPreview() {
  return (
    <section className="space-y-6">
      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
        <h2 className="text-lg font-semibold text-sky-900">비회원 체험 모드</h2>
        <p className="mt-2 text-sm text-sky-800">
          로그인 없이도 화면 구성을 확인하실 수 있도록 샘플 데이터를 보여드립니다.
          실제 가족 데이터는 안전하게 로그인 사용자에게만 노출됩니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/auth?mode=login&redirect=%2Fdashboard"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            내 데이터로 시작하기
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
          >
            홈으로 이동
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="피보호자" value="2명" />
        <StatCard label="활성 복약 일정" value="5개" variant="success" />
        <StatCard label="오늘 체크인" value="3건" variant="success" />
        <StatCard label="오늘 복약 완료율" value="80%" variant="success" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">체험에서 확인 가능한 항목</h3>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>대시보드 레이아웃 및 통계 카드 시각 구조</li>
          <li>초대/복약/체크인 화면의 주요 섹션 구성</li>
          <li>모바일/PC 반응형 UI 동작</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          데이터 생성/수정, 초대 수락, API 응답 확인은 로그인 후 이용 가능합니다.
        </p>
      </section>
    </section>
  );
}

async function DashboardContent({ sessionUserId }: { sessionUserId: string }) {
  const session = await requireAuthSession();
  const dashboardData = await getDashboardData(session);

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="피보호자" value={`${dashboardData.stats.recipientCount}명`} />
        <StatCard
          label="활성 복약 일정"
          value={`${dashboardData.stats.activeMedicationCount}개`}
          variant={
            dashboardData.stats.activeMedicationCount > 0 ? "default" : "warning"
          }
        />
        <StatCard
          label="오늘 체크인"
          value={`${dashboardData.stats.todayCheckinCount}건`}
          variant={dashboardData.stats.todayCheckinCount > 0 ? "success" : "warning"}
        />
        <StatCard
          label="오늘 복약 완료율"
          value={
            dashboardData.stats.todayMedicationTakenRate === null
              ? "기록 없음"
              : `${dashboardData.stats.todayMedicationTakenRate}%`
          }
          variant={
            dashboardData.stats.todayMedicationTakenRate === null
              ? "default"
              : dashboardData.stats.todayMedicationTakenRate >= 80
                ? "success"
                : dashboardData.stats.todayMedicationTakenRate >= 50
                  ? "warning"
                  : "danger"
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">피보호자 등록</h2>
        <p className="mt-1 text-sm text-slate-600">
          Day2 기능: 새 피보호자를 등록하면 자동으로 본인이 owner 권한 멤버로 연결됩니다.
        </p>

        <form action={createRecipientAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-700 md:col-span-1">
            이름
            <input
              name="name"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="예: 김영순"
              required
            />
          </label>
          <label className="text-sm text-slate-700 md:col-span-1">
            생년월일
            <input
              type="date"
              name="birthDate"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700 md:col-span-2">
            메모
            <input
              name="notes"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="질환, 주의사항 등"
            />
          </label>
          <div className="md:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              피보호자 등록
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {dashboardData.bundles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">아직 등록된 피보호자가 없습니다.</p>
              <p className="mt-2">처음 시작은 아래 3단계만 진행해 주세요.</p>
              <ol className="mt-3 list-inside list-decimal space-y-1">
                <li>먼저 피보호자 1명을 등록합니다.</li>
                <li>복약 일정 1개를 등록합니다.</li>
                <li>체크인(정상/주의/위험) 1건을 기록합니다.</li>
              </ol>
            </div>
          ) : (
            dashboardData.bundles.map((bundle) => (
              <article
                key={bundle.recipient.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {bundle.recipient.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      생년월일: {formatDateOnly(bundle.recipient.birth_date)} · 등록일:{" "}
                      {formatDateTime(bundle.recipient.created_at)}
                    </p>
                    {bundle.recipient.notes ? (
                      <p className="mt-2 text-sm text-slate-700">메모: {bundle.recipient.notes}</p>
                    ) : null}
                  </div>
                  <form action={deleteRecipientAction} className="flex flex-col items-end gap-2">
                    <input type="hidden" name="recipientId" value={bundle.recipient.id} />
                    <label className="flex items-center gap-2 text-xs text-rose-700">
                      <input type="checkbox" required />
                      삭제를 확인했습니다
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      피보호자 삭제
                    </button>
                  </form>
                </header>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">돌봄 멤버</h4>
                    <ul className="mt-3 space-y-2 text-xs text-slate-700">
                      {bundle.members.length === 0 ? (
                        <li className="text-slate-500">등록된 멤버가 없습니다.</li>
                      ) : (
                        bundle.members.map((member) => (
                          <li
                            key={`${member.recipient_id}-${member.user_id}`}
                            className="rounded-lg border border-slate-200 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium">{toMaskedUserId(member.user_id)}</p>
                                <p className="text-slate-500">
                                  관계: {member.relationship || "미정"} · 권한:{" "}
                                  {member.can_edit ? "편집 가능" : "조회 전용"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <form action={updateRecipientMemberPermissionAction}>
                                  <input
                                    type="hidden"
                                    name="recipientId"
                                    value={member.recipient_id}
                                  />
                                  <input type="hidden" name="userId" value={member.user_id} />
                                  <input
                                    type="hidden"
                                    name="canEdit"
                                    value={member.can_edit ? "false" : "true"}
                                  />
                                  <button
                                    type="submit"
                                    className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-50"
                                  >
                                    {member.can_edit ? "편집권한 해제" : "편집권한 부여"}
                                  </button>
                                </form>
                                {member.user_id !== sessionUserId ? (
                                  <form action={removeRecipientMemberAction}>
                                    <input
                                      type="hidden"
                                      name="recipientId"
                                      value={member.recipient_id}
                                    />
                                    <input type="hidden" name="userId" value={member.user_id} />
                                    <button
                                      type="submit"
                                      className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                                    >
                                      제거
                                    </button>
                                  </form>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>

                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-800">초대 링크 목록</p>
                      <ul className="mt-2 space-y-2 text-[11px] text-slate-700">
                        {bundle.invites.length === 0 ? (
                          <li className="text-slate-500">아직 생성된 초대 링크가 없습니다.</li>
                        ) : (
                          bundle.invites.slice(0, 5).map((invite) => {
                            const inviteUrl = buildInviteUrl(invite.invite_token);
                            const isPending = invite.status === "pending";

                            return (
                              <li
                                key={invite.id}
                                className="rounded border border-slate-200 bg-white p-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="font-medium">{invite.invited_email}</p>
                                    <p className="text-slate-500">
                                      상태: {statusLabel(invite.status)} · 만료: {formatDateTime(invite.expires_at)}
                                    </p>
                                  </div>
                                  {isPending ? (
                                    <form action={revokeRecipientInviteAction}>
                                      <input type="hidden" name="inviteId" value={invite.id} />
                                      <button
                                        type="submit"
                                        className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                                      >
                                        초대 취소
                                      </button>
                                    </form>
                                  ) : null}
                                </div>
                                <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] break-all">
                                  {inviteUrl}
                                </div>
                                <CopyButton text={inviteUrl} />
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>

                    <form action={createRecipientInviteAction} className="mt-3 space-y-2">
                      <input type="hidden" name="recipientId" value={bundle.recipient.id} />
                      <input
                        type="email"
                        name="invitedEmail"
                        placeholder="초대할 가족 이메일"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        required
                      />
                      <input
                        name="relationship"
                        placeholder="관계 (예: 딸, 간병인)"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="canEdit" /> 편집 권한 허용
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        이메일 초대 링크 생성
                      </button>
                    </form>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">복약 일정</h4>
                    <ul className="mt-3 space-y-2 text-xs text-slate-700">
                      {bundle.medicationSchedules.length === 0 ? (
                        <li className="text-slate-500">등록된 복약 일정이 없습니다.</li>
                      ) : (
                        bundle.medicationSchedules.map((schedule) => (
                          <li key={schedule.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {schedule.medication_name}
                                </p>
                                <p className="text-slate-500">
                                  {schedule.dosage} · 하루 {schedule.times_per_day}회
                                </p>
                                {schedule.instructions ? (
                                  <p className="text-slate-500">{schedule.instructions}</p>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                    schedule.is_active
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {schedule.is_active ? "활성" : "비활성"}
                                </span>
                                <form action={toggleMedicationScheduleAction}>
                                  <input
                                    type="hidden"
                                    name="medicationScheduleId"
                                    value={schedule.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="isActive"
                                    value={schedule.is_active ? "false" : "true"}
                                  />
                                  <button
                                    type="submit"
                                    className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-50"
                                  >
                                    {schedule.is_active ? "비활성화" : "활성화"}
                                  </button>
                                </form>
                              </div>
                            </div>

                            <form
                              action={createMedicationLogAction}
                              className="mt-3 flex flex-wrap items-center gap-2"
                            >
                              <input
                                type="hidden"
                                name="recipientId"
                                value={bundle.recipient.id}
                              />
                              <input type="hidden" name="scheduleId" value={schedule.id} />
                              <select
                                name="status"
                                className="rounded border border-slate-300 px-2 py-1 text-[11px]"
                                defaultValue="taken"
                              >
                                <option value="taken">복약 완료</option>
                                <option value="skipped">복약 누락</option>
                              </select>
                              <input
                                name="memo"
                                placeholder="복약 메모"
                                className="min-w-40 flex-1 rounded border border-slate-300 px-2 py-1 text-[11px]"
                              />
                              <button
                                type="submit"
                                className="rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                              >
                                기록
                              </button>
                            </form>
                          </li>
                        ))
                      )}
                    </ul>

                    <form action={createMedicationScheduleAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="recipientId" value={bundle.recipient.id} />
                      <input
                        name="medicationName"
                        placeholder="약 이름"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="dosage"
                          placeholder="용량 (예: 1정)"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                          required
                        />
                        <input
                          type="number"
                          min={1}
                          name="timesPerDay"
                          defaultValue={1}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                          required
                        />
                      </div>
                      <input
                        name="instructions"
                        placeholder="복약 지시사항"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        복약 일정 추가
                      </button>
                    </form>
                  </section>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">체크인</h4>
                    <form action={createCheckinAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="recipientId" value={bundle.recipient.id} />
                      <select
                        name="status"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        defaultValue="ok"
                      >
                        <option value="ok">정상</option>
                        <option value="warning">주의</option>
                        <option value="critical">위험</option>
                      </select>
                      <input
                        name="memo"
                        placeholder="체크인 메모"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        체크인 등록
                      </button>
                    </form>

                    <ul className="mt-3 space-y-2 text-xs text-slate-700">
                      {bundle.checkins.length === 0 ? (
                        <li className="text-slate-500">체크인 기록이 없습니다.</li>
                      ) : (
                        bundle.checkins.slice(0, 5).map((checkin) => {
                          const statusMeta = CHECKIN_STATUS_META[checkin.status];

                          return (
                            <li key={checkin.id} className="rounded-lg border border-slate-200 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                                >
                                  {statusMeta.label}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {formatDateTime(checkin.checked_at)}
                                </span>
                              </div>
                              {checkin.memo ? (
                                <p className="mt-1 text-slate-600">{checkin.memo}</p>
                              ) : null}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">최근 복약 기록</h4>
                    <ul className="mt-3 space-y-2 text-xs text-slate-700">
                      {bundle.medicationLogs.length === 0 ? (
                        <li className="text-slate-500">복약 기록이 없습니다.</li>
                      ) : (
                        bundle.medicationLogs.slice(0, 5).map((log) => {
                          const statusMeta = MEDICATION_LOG_STATUS_META[log.status];

                          return (
                            <li key={log.id} className="rounded-lg border border-slate-200 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                                >
                                  {statusMeta.label}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {formatDateTime(log.logged_at)}
                                </span>
                              </div>
                              {log.memo ? (
                                <p className="mt-1 text-slate-600">{log.memo}</p>
                              ) : null}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">알림 보드</h3>
            <p className="mt-1 text-xs text-slate-600">
              Week2 기능: 위험/주의 체크인만 모아 빠르게 확인합니다.
            </p>

            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              {dashboardData.recentAlerts.length === 0 ? (
                <li className="text-slate-500">최근 위험/주의 알림이 없습니다.</li>
              ) : (
                dashboardData.recentAlerts.map((alert) => {
                  const statusMeta = CHECKIN_STATUS_META[alert.status];
                  const recipientName =
                    dashboardData.bundles.find(
                      (bundle) => bundle.recipient.id === alert.recipient_id,
                    )?.recipient.name ?? "알 수 없음";

                  return (
                    <li key={alert.id} className="rounded-lg border border-slate-200 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatDateTime(alert.checked_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700">{recipientName}</p>
                      {alert.memo ? (
                        <p className="mt-1 text-slate-600">{alert.memo}</p>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">API</h3>
            <p className="mt-1 text-xs text-slate-600">
              인증 후 <code>/api/dashboard</code>로 대시보드 요약 JSON을 받을 수 있습니다.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantClassMap = {
    default: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
  } as const;

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${variantClassMap[variant]}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
