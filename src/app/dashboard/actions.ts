"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthSessionFromCookie } from "@/lib/auth-session";
import {
  addRecipientMember,
  createCheckin,
  createMedicationLog,
  createMedicationSchedule,
  createRecipient,
  createRecipientInvite,
  deleteRecipient,
  removeRecipientMember,
  revokeRecipientInvite,
  setMedicationScheduleActive,
  type CheckinStatus,
  type MedicationLogStatus,
  updateRecipientMemberPermission,
} from "@/lib/familycare-db";
import { isPublicTestMode } from "@/lib/public-test-mode";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function asUUID(value: FormDataEntryValue | null): string {
  const text = asString(value);

  if (!UUID_REGEX.test(text)) {
    return "";
  }

  return text;
}

function asEmail(value: FormDataEntryValue | null): string {
  const text = asString(value).toLowerCase();

  if (!EMAIL_REGEX.test(text)) {
    return "";
  }

  return text;
}

function asBoolean(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on";
}

function asPositiveInt(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

function fail(message: string): never {
  redirect(`/dashboard?error=${encodeURIComponent(message)}`);
}

function succeed(message: string): never {
  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent(message)}`);
}

async function getActionSessionOrTestMode(
  testMessage: string,
): Promise<NonNullable<Awaited<ReturnType<typeof getAuthSessionFromCookie>>>> {
  const session = await getAuthSessionFromCookie();

  if (isPublicTestMode() || !isSupabaseConfigured() || !session) {
    succeed(`테스트 모드: ${testMessage}`);
  }

  return session;
}

export async function createRecipientAction(formData: FormData): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "피보호자 등록을 시뮬레이션으로 처리했습니다.",
  );
  const name = asString(formData.get("name"));
  const birthDate = asString(formData.get("birthDate"));
  const notes = asString(formData.get("notes"));

  if (!name) {
    fail("피보호자 이름을 입력해 주세요.");
  }

  try {
    await createRecipient(session, {
      name,
      birthDate,
      notes,
    });
    succeed("피보호자를 등록했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function deleteRecipientAction(formData: FormData): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "피보호자 삭제를 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));

  if (!recipientId) {
    fail("삭제할 피보호자 정보가 없습니다.");
  }

  try {
    await deleteRecipient(session, recipientId);
    succeed("피보호자를 삭제했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function addRecipientMemberAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "돌봄 멤버 추가를 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));
  const userId = asUUID(formData.get("userId"));
  const relationship = asString(formData.get("relationship"));
  const canEdit = asBoolean(formData.get("canEdit"));

  if (!recipientId || !userId) {
    fail("멤버 추가에 필요한 UUID 값이 올바르지 않습니다.");
  }

  try {
    await addRecipientMember(session, {
      recipientId,
      userId,
      relationship,
      canEdit,
    });
    succeed("돌봄 멤버를 추가했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function createRecipientInviteAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "초대 링크 생성을 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));
  const invitedEmail = asEmail(formData.get("invitedEmail"));
  const relationship = asString(formData.get("relationship"));
  const canEdit = asBoolean(formData.get("canEdit"));

  if (!recipientId || !invitedEmail) {
    fail("초대에 필요한 recipientId/email 값을 확인해 주세요.");
  }

  try {
    await createRecipientInvite(session, {
      recipientId,
      invitedEmail,
      relationship,
      canEdit,
    });
    succeed("초대 링크를 생성했습니다. 아래 초대 목록에서 링크를 공유해 주세요.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function revokeRecipientInviteAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "초대 취소를 시뮬레이션으로 처리했습니다.",
  );
  const inviteId = asUUID(formData.get("inviteId"));

  if (!inviteId) {
    fail("초대 ID 형식이 올바르지 않습니다.");
  }

  try {
    await revokeRecipientInvite(session, inviteId);
    succeed("초대를 취소했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function updateRecipientMemberPermissionAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "멤버 권한 변경을 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));
  const userId = asUUID(formData.get("userId"));
  const canEdit = asBoolean(formData.get("canEdit"));

  if (!recipientId || !userId) {
    fail("권한 변경에 필요한 UUID 값이 올바르지 않습니다.");
  }

  try {
    await updateRecipientMemberPermission(session, {
      recipientId,
      userId,
      canEdit,
    });
    succeed("멤버 권한을 변경했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function removeRecipientMemberAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "돌봄 멤버 제거를 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));
  const userId = asUUID(formData.get("userId"));

  if (!recipientId || !userId) {
    fail("멤버 삭제에 필요한 UUID 값이 올바르지 않습니다.");
  }

  if (userId === session.userId) {
    fail("본인 계정은 이 화면에서 제거할 수 없습니다.");
  }

  try {
    await removeRecipientMember(session, {
      recipientId,
      userId,
    });
    succeed("돌봄 멤버를 제거했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function createMedicationScheduleAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "복약 일정 등록을 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));
  const medicationName = asString(formData.get("medicationName"));
  const dosage = asString(formData.get("dosage"));
  const timesPerDay = asPositiveInt(formData.get("timesPerDay"));
  const instructions = asString(formData.get("instructions"));

  if (!recipientId || !medicationName || !dosage || timesPerDay <= 0) {
    fail("복약 일정 생성에 필요한 값을 확인해 주세요.");
  }

  try {
    await createMedicationSchedule(session, {
      recipientId,
      medicationName,
      dosage,
      timesPerDay,
      instructions,
    });
    succeed("복약 일정을 등록했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function toggleMedicationScheduleAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "복약 일정 상태 변경을 시뮬레이션으로 처리했습니다.",
  );
  const medicationScheduleId = asUUID(formData.get("medicationScheduleId"));
  const isActive = asBoolean(formData.get("isActive"));

  if (!medicationScheduleId) {
    fail("복약 일정 ID 형식이 올바르지 않습니다.");
  }

  try {
    await setMedicationScheduleActive(session, {
      medicationScheduleId,
      isActive,
    });
    succeed(
      isActive
        ? "복약 일정을 활성화했습니다."
        : "복약 일정을 비활성화했습니다.",
    );
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function createMedicationLogAction(
  formData: FormData,
): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "복약 기록 저장을 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));
  const rawScheduleId = asString(formData.get("scheduleId"));
  const scheduleId = rawScheduleId
    ? asUUID(formData.get("scheduleId"))
    : undefined;
  const statusValue = asString(formData.get("status"));
  const memo = asString(formData.get("memo"));

  if (!recipientId) {
    fail("복약 기록 대상 UUID가 올바르지 않습니다.");
  }

  if (rawScheduleId && !scheduleId) {
    fail("복약 일정 UUID 형식이 올바르지 않습니다.");
  }

  if (statusValue !== "taken" && statusValue !== "skipped") {
    fail("복약 기록 상태 값이 올바르지 않습니다.");
  }

  const status = statusValue as MedicationLogStatus;

  try {
    await createMedicationLog(session, {
      recipientId,
      scheduleId,
      status,
      memo,
    });
    succeed("복약 기록을 저장했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}

export async function createCheckinAction(formData: FormData): Promise<void> {
  const session = await getActionSessionOrTestMode(
    "체크인 등록을 시뮬레이션으로 처리했습니다.",
  );
  const recipientId = asUUID(formData.get("recipientId"));
  const statusValue = asString(formData.get("status"));
  const memo = asString(formData.get("memo"));

  if (!recipientId) {
    fail("체크인 대상 UUID가 올바르지 않습니다.");
  }

  if (!["ok", "warning", "critical"].includes(statusValue)) {
    fail("체크인 상태가 올바르지 않습니다.");
  }

  const status = statusValue as CheckinStatus;

  try {
    await createCheckin(session, {
      recipientId,
      status,
      memo,
    });
    succeed("체크인을 등록했습니다.");
  } catch (error) {
    fail(getErrorMessage(error));
  }
}
