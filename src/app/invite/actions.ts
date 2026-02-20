"use server";

import { redirect } from "next/navigation";

import { requireAuthSession } from "@/lib/auth-session";
import { acceptRecipientInvite } from "@/lib/familycare-db";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "초대 수락 중 오류가 발생했습니다.";
}

export async function acceptRecipientInviteAction(
  formData: FormData,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect(
      "/auth?mode=login&error=Supabase%20환경변수가%20설정되지%20않았습니다.",
    );
  }

  const session = await requireAuthSession();
  const token = asString(formData.get("token"));

  if (!UUID_REGEX.test(token)) {
    redirect("/invite?error=초대%20토큰이%20유효하지%20않습니다.");
  }

  try {
    await acceptRecipientInvite(session, token);
    redirect("/dashboard?message=가족%20초대를%20수락했습니다.");
  } catch (error) {
    redirect(
      `/invite?token=${encodeURIComponent(token)}&error=${encodeURIComponent(
        getErrorMessage(error),
      )}`,
    );
  }
}
