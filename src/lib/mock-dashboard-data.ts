import type { DashboardData } from "@/lib/familycare-db";
import { PUBLIC_TEST_USER_ID } from "@/lib/public-test-mode";

const NOW = new Date();
const minusHours = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();

export function getMockDashboardData(): DashboardData {
  const recipientId = "11111111-1111-4111-8111-111111111111";
  const scheduleA = "22222222-2222-4222-8222-222222222222";
  const scheduleB = "33333333-3333-4333-8333-333333333333";

  return {
    bundles: [
      {
        recipient: {
          id: recipientId,
          created_by: PUBLIC_TEST_USER_ID,
          name: "김영순",
          birth_date: "1942-03-12",
          notes: "고혈압/당뇨 관리 필요",
          created_at: minusHours(72),
          updated_at: minusHours(2),
        },
        members: [
          {
            recipient_id: recipientId,
            user_id: PUBLIC_TEST_USER_ID,
            relationship: "owner",
            can_edit: true,
            created_at: minusHours(72),
          },
          {
            recipient_id: recipientId,
            user_id: "44444444-4444-4444-8444-444444444444",
            relationship: "딸",
            can_edit: true,
            created_at: minusHours(48),
          },
        ],
        invites: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            recipient_id: recipientId,
            invited_email: "family@example.com",
            relationship: "간병인",
            can_edit: false,
            invite_token: "66666666-6666-4666-8666-666666666666",
            invited_by: PUBLIC_TEST_USER_ID,
            status: "pending",
            expires_at: new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            accepted_at: null,
            accepted_user_id: null,
            created_at: minusHours(6),
            updated_at: minusHours(6),
          },
        ],
        medicationSchedules: [
          {
            id: scheduleA,
            recipient_id: recipientId,
            medication_name: "혈압약",
            dosage: "1정",
            times_per_day: 2,
            instructions: "식후 30분",
            is_active: true,
            created_by: PUBLIC_TEST_USER_ID,
            created_at: minusHours(36),
            updated_at: minusHours(12),
          },
          {
            id: scheduleB,
            recipient_id: recipientId,
            medication_name: "당뇨약",
            dosage: "1정",
            times_per_day: 1,
            instructions: "아침 식전",
            is_active: true,
            created_by: PUBLIC_TEST_USER_ID,
            created_at: minusHours(30),
            updated_at: minusHours(5),
          },
        ],
        medicationLogs: [
          {
            id: "77777777-7777-4777-8777-777777777777",
            recipient_id: recipientId,
            schedule_id: scheduleA,
            status: "taken",
            memo: "정상 복용",
            logged_by: PUBLIC_TEST_USER_ID,
            logged_at: minusHours(4),
            created_at: minusHours(4),
          },
          {
            id: "88888888-8888-4888-8888-888888888888",
            recipient_id: recipientId,
            schedule_id: scheduleB,
            status: "skipped",
            memo: "식사 누락으로 미복용",
            logged_by: PUBLIC_TEST_USER_ID,
            logged_at: minusHours(2),
            created_at: minusHours(2),
          },
        ],
        checkins: [
          {
            id: "99999999-9999-4999-8999-999999999999",
            recipient_id: recipientId,
            checked_by: PUBLIC_TEST_USER_ID,
            status: "ok",
            memo: "오전 상태 양호",
            checked_at: minusHours(3),
            created_at: minusHours(3),
          },
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            recipient_id: recipientId,
            checked_by: PUBLIC_TEST_USER_ID,
            status: "warning",
            memo: "어지럼 증상 보고",
            checked_at: minusHours(1),
            created_at: minusHours(1),
          },
        ],
      },
    ],
    stats: {
      recipientCount: 1,
      memberCount: 2,
      activeMedicationCount: 2,
      todayCheckinCount: 2,
      todayMedicationLogCount: 2,
      todayMedicationTakenRate: 50,
      recentAlertCount: 1,
    },
    recentAlerts: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        recipient_id: recipientId,
        checked_by: PUBLIC_TEST_USER_ID,
        status: "warning",
        memo: "어지럼 증상 보고",
        checked_at: minusHours(1),
        created_at: minusHours(1),
      },
    ],
  };
}
