import "server-only";

import type { AuthSession } from "@/lib/auth-session";
import { assertSupabaseConfigured } from "@/lib/supabase-rest";

type SupabaseErrorPayload = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  error?: string;
  error_description?: string;
};

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

type SupabaseRequestOptions = {
  method?: RequestMethod;
  query?: Record<string, string | undefined>;
  body?: unknown;
  prefer?: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

export type CareRecipient = {
  id: string;
  created_by: string;
  name: string;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipientMember = {
  recipient_id: string;
  user_id: string;
  relationship: string | null;
  can_edit: boolean;
  created_at: string;
};

export type MedicationSchedule = {
  id: string;
  recipient_id: string;
  medication_name: string;
  dosage: string;
  times_per_day: number;
  instructions: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MedicationLogStatus = "taken" | "skipped";

export type MedicationLog = {
  id: string;
  recipient_id: string;
  schedule_id: string | null;
  status: MedicationLogStatus;
  memo: string | null;
  logged_by: string;
  logged_at: string;
  created_at: string;
};

export type CheckinStatus = "ok" | "warning" | "critical";

export type Checkin = {
  id: string;
  recipient_id: string;
  checked_by: string;
  status: CheckinStatus;
  memo: string | null;
  checked_at: string;
  created_at: string;
};

export type RecipientBundle = {
  recipient: CareRecipient;
  members: RecipientMember[];
  medicationSchedules: MedicationSchedule[];
  medicationLogs: MedicationLog[];
  checkins: Checkin[];
};

export type DashboardData = {
  bundles: RecipientBundle[];
  stats: {
    recipientCount: number;
    memberCount: number;
    activeMedicationCount: number;
    todayCheckinCount: number;
    todayMedicationLogCount: number;
    todayMedicationTakenRate: number | null;
    recentAlertCount: number;
  };
  recentAlerts: Checkin[];
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseErrorMessage(payload: SupabaseErrorPayload | null): string {
  if (!payload) {
    return "Supabase 요청 중 오류가 발생했습니다.";
  }

  return (
    payload.message ??
    payload.error_description ??
    payload.error ??
    payload.details ??
    payload.hint ??
    "Supabase 요청 중 오류가 발생했습니다."
  );
}

function buildInFilter(values: string[]): string {
  const normalized = values
    .map((value) => value.trim())
    .filter((value) => UUID_REGEX.test(value));

  if (normalized.length === 0) {
    throw new Error("유효한 UUID 값이 없어 조회를 수행할 수 없습니다.");
  }

  return `in.(${normalized.join(",")})`;
}

function getTodayKstStartIso(): string {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }

      return acc;
    }, {});

  const year = dateParts.year;
  const month = dateParts.month;
  const day = dateParts.day;

  return `${year}-${month}-${day}T00:00:00+09:00`;
}

async function supabaseRequest<T>(
  session: AuthSession,
  table: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { url, anonKey } = assertSupabaseConfigured();

  const requestUrl = new URL(`${url}/rest/v1/${table}`);

  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0) {
      requestUrl.searchParams.set(key, value);
    }
  });

  const method = options.method ?? "GET";

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${session.accessToken}`,
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers.Prefer = options.prefer ?? "return=representation";
  }

  const response = await fetch(requestUrl, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return [] as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | T
    | SupabaseErrorPayload
    | null;

  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload as SupabaseErrorPayload | null));
  }

  return (payload ?? []) as T;
}

export async function getMyProfile(
  session: AuthSession,
): Promise<Profile | null> {
  const rows = await supabaseRequest<Profile[]>(session, "profiles", {
    query: {
      select: "id,full_name,phone,role,created_at,updated_at",
      id: `eq.${session.userId}`,
      limit: "1",
    },
  });

  return rows[0] ?? null;
}

export async function upsertMyProfile(
  session: AuthSession,
  input: {
    fullName?: string;
    phone?: string;
  },
): Promise<Profile> {
  const rows = await supabaseRequest<Profile[]>(session, "profiles", {
    method: "POST",
    query: {
      on_conflict: "id",
    },
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: session.userId,
      full_name: input.fullName?.trim() || null,
      phone: input.phone?.trim() || null,
      role: "guardian",
    },
  });

  const profile = rows[0];

  if (!profile) {
    throw new Error("프로필 저장에 실패했습니다.");
  }

  return profile;
}

export async function listRecipients(
  session: AuthSession,
): Promise<CareRecipient[]> {
  return supabaseRequest<CareRecipient[]>(session, "care_recipients", {
    query: {
      select: "id,created_by,name,birth_date,notes,created_at,updated_at",
      order: "created_at.desc",
    },
  });
}

export async function createRecipient(
  session: AuthSession,
  input: {
    name: string;
    birthDate?: string;
    notes?: string;
  },
): Promise<CareRecipient> {
  const rows = await supabaseRequest<CareRecipient[]>(session, "care_recipients", {
    method: "POST",
    body: {
      created_by: session.userId,
      name: input.name.trim(),
      birth_date: input.birthDate?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  const recipient = rows[0];

  if (!recipient) {
    throw new Error("피보호자 생성에 실패했습니다.");
  }

  await supabaseRequest<RecipientMember[]>(session, "recipient_members", {
    method: "POST",
    body: {
      recipient_id: recipient.id,
      user_id: session.userId,
      relationship: "owner",
      can_edit: true,
    },
  });

  return recipient;
}

export async function deleteRecipient(
  session: AuthSession,
  recipientId: string,
): Promise<void> {
  await supabaseRequest<CareRecipient[]>(session, "care_recipients", {
    method: "DELETE",
    query: {
      id: `eq.${recipientId}`,
    },
  });
}

export async function listRecipientMembers(
  session: AuthSession,
  recipientIds: string[],
): Promise<RecipientMember[]> {
  if (recipientIds.length === 0) {
    return [];
  }

  return supabaseRequest<RecipientMember[]>(session, "recipient_members", {
    query: {
      select: "recipient_id,user_id,relationship,can_edit,created_at",
      recipient_id: buildInFilter(recipientIds),
      order: "created_at.asc",
    },
  });
}

export async function addRecipientMember(
  session: AuthSession,
  input: {
    recipientId: string;
    userId: string;
    relationship?: string;
    canEdit: boolean;
  },
): Promise<void> {
  await supabaseRequest<RecipientMember[]>(session, "recipient_members", {
    method: "POST",
    body: {
      recipient_id: input.recipientId,
      user_id: input.userId,
      relationship: input.relationship?.trim() || null,
      can_edit: input.canEdit,
    },
  });
}

export async function updateRecipientMemberPermission(
  session: AuthSession,
  input: {
    recipientId: string;
    userId: string;
    canEdit: boolean;
  },
): Promise<void> {
  await supabaseRequest<RecipientMember[]>(session, "recipient_members", {
    method: "PATCH",
    query: {
      recipient_id: `eq.${input.recipientId}`,
      user_id: `eq.${input.userId}`,
    },
    body: {
      can_edit: input.canEdit,
    },
  });
}

export async function removeRecipientMember(
  session: AuthSession,
  input: {
    recipientId: string;
    userId: string;
  },
): Promise<void> {
  await supabaseRequest<RecipientMember[]>(session, "recipient_members", {
    method: "DELETE",
    query: {
      recipient_id: `eq.${input.recipientId}`,
      user_id: `eq.${input.userId}`,
    },
  });
}

export async function listMedicationSchedules(
  session: AuthSession,
  recipientIds: string[],
): Promise<MedicationSchedule[]> {
  if (recipientIds.length === 0) {
    return [];
  }

  return supabaseRequest<MedicationSchedule[]>(session, "medication_schedules", {
    query: {
      select:
        "id,recipient_id,medication_name,dosage,times_per_day,instructions,is_active,created_by,created_at,updated_at",
      recipient_id: buildInFilter(recipientIds),
      order: "created_at.desc",
    },
  });
}

export async function createMedicationSchedule(
  session: AuthSession,
  input: {
    recipientId: string;
    medicationName: string;
    dosage: string;
    timesPerDay: number;
    instructions?: string;
  },
): Promise<void> {
  await supabaseRequest<MedicationSchedule[]>(session, "medication_schedules", {
    method: "POST",
    body: {
      recipient_id: input.recipientId,
      medication_name: input.medicationName.trim(),
      dosage: input.dosage.trim(),
      times_per_day: input.timesPerDay,
      instructions: input.instructions?.trim() || null,
      is_active: true,
      created_by: session.userId,
    },
  });
}

export async function setMedicationScheduleActive(
  session: AuthSession,
  input: {
    medicationScheduleId: string;
    isActive: boolean;
  },
): Promise<void> {
  await supabaseRequest<MedicationSchedule[]>(session, "medication_schedules", {
    method: "PATCH",
    query: {
      id: `eq.${input.medicationScheduleId}`,
    },
    body: {
      is_active: input.isActive,
    },
  });
}

export async function listMedicationLogs(
  session: AuthSession,
  recipientIds: string[],
  options?: {
    since?: string;
    limit?: number;
  },
): Promise<MedicationLog[]> {
  if (recipientIds.length === 0) {
    return [];
  }

  return supabaseRequest<MedicationLog[]>(session, "medication_logs", {
    query: {
      select:
        "id,recipient_id,schedule_id,status,memo,logged_by,logged_at,created_at",
      recipient_id: buildInFilter(recipientIds),
      logged_at: options?.since ? `gte.${options.since}` : undefined,
      order: "logged_at.desc",
      limit: options?.limit ? String(options.limit) : undefined,
    },
  });
}

export async function createMedicationLog(
  session: AuthSession,
  input: {
    recipientId: string;
    scheduleId?: string;
    status: MedicationLogStatus;
    memo?: string;
  },
): Promise<void> {
  await supabaseRequest<MedicationLog[]>(session, "medication_logs", {
    method: "POST",
    body: {
      recipient_id: input.recipientId,
      schedule_id: input.scheduleId?.trim() || null,
      status: input.status,
      memo: input.memo?.trim() || null,
      logged_by: session.userId,
    },
  });
}

export async function listCheckins(
  session: AuthSession,
  recipientIds: string[],
  options?: {
    since?: string;
    limit?: number;
  },
): Promise<Checkin[]> {
  if (recipientIds.length === 0) {
    return [];
  }

  return supabaseRequest<Checkin[]>(session, "checkins", {
    query: {
      select: "id,recipient_id,checked_by,status,memo,checked_at,created_at",
      recipient_id: buildInFilter(recipientIds),
      checked_at: options?.since ? `gte.${options.since}` : undefined,
      order: "checked_at.desc",
      limit: options?.limit ? String(options.limit) : undefined,
    },
  });
}

export async function createCheckin(
  session: AuthSession,
  input: {
    recipientId: string;
    status: CheckinStatus;
    memo?: string;
  },
): Promise<void> {
  await supabaseRequest<Checkin[]>(session, "checkins", {
    method: "POST",
    body: {
      recipient_id: input.recipientId,
      checked_by: session.userId,
      status: input.status,
      memo: input.memo?.trim() || null,
    },
  });
}

export async function getDashboardData(
  session: AuthSession,
): Promise<DashboardData> {
  const recipients = await listRecipients(session);
  const recipientIds = recipients.map((recipient) => recipient.id);

  if (recipientIds.length === 0) {
    return {
      bundles: [],
      stats: {
        recipientCount: 0,
        memberCount: 0,
        activeMedicationCount: 0,
        todayCheckinCount: 0,
        todayMedicationLogCount: 0,
        todayMedicationTakenRate: null,
        recentAlertCount: 0,
      },
      recentAlerts: [],
    };
  }

  const todayKstStartIso = getTodayKstStartIso();

  const [
    members,
    medicationSchedules,
    medicationLogs,
    checkins,
    todayMedicationLogs,
    todayCheckins,
  ] = await Promise.all([
    listRecipientMembers(session, recipientIds),
    listMedicationSchedules(session, recipientIds),
    listMedicationLogs(session, recipientIds, { limit: 500 }),
    listCheckins(session, recipientIds, { limit: 500 }),
    listMedicationLogs(session, recipientIds, {
      since: todayKstStartIso,
      limit: 2000,
    }),
    listCheckins(session, recipientIds, {
      since: todayKstStartIso,
      limit: 2000,
    }),
  ]);

  const bundles = recipients.map((recipient) => {
    const memberRows = members.filter(
      (member) => member.recipient_id === recipient.id,
    );
    const medicationRows = medicationSchedules.filter(
      (medication) => medication.recipient_id === recipient.id,
    );
    const medicationLogRows = medicationLogs.filter(
      (medicationLog) => medicationLog.recipient_id === recipient.id,
    );
    const checkinRows = checkins.filter(
      (checkin) => checkin.recipient_id === recipient.id,
    );

    return {
      recipient,
      members: memberRows,
      medicationSchedules: medicationRows,
      medicationLogs: medicationLogRows,
      checkins: checkinRows,
    } satisfies RecipientBundle;
  });

  const todayTakenCount = todayMedicationLogs.filter(
    (log) => log.status === "taken",
  ).length;

  const todayMedicationTakenRate =
    todayMedicationLogs.length > 0
      ? Math.round((todayTakenCount / todayMedicationLogs.length) * 100)
      : null;

  const recentAlerts = checkins
    .filter((checkin) => checkin.status !== "ok")
    .sort((left, right) => right.checked_at.localeCompare(left.checked_at))
    .slice(0, 10);

  return {
    bundles,
    stats: {
      recipientCount: recipients.length,
      memberCount: members.length,
      activeMedicationCount: medicationSchedules.filter(
        (medication) => medication.is_active,
      ).length,
      todayCheckinCount: todayCheckins.length,
      todayMedicationLogCount: todayMedicationLogs.length,
      todayMedicationTakenRate,
      recentAlertCount: recentAlerts.length,
    },
    recentAlerts,
  };
}
