"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthSessionFromCookie } from "@/lib/auth-session";
import { upsertMyProfile } from "@/lib/familycare-db";
import { isPublicTestMode } from "@/lib/public-test-mode";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "설정 저장 중 오류가 발생했습니다.";
}

export async function saveProfileAction(formData: FormData): Promise<void> {
  const session = await getAuthSessionFromCookie();

  if (isPublicTestMode() || !isSupabaseConfigured() || !session) {
    redirect("/settings?message=테스트%20모드에서%20프로필%20저장을%20시뮬레이션했습니다.");
  }

  const fullName = asString(formData.get("fullName"));
  const phone = asString(formData.get("phone"));

  try {
    await upsertMyProfile(session, {
      fullName,
      phone,
    });
    revalidatePath("/settings");
    redirect("/settings?message=프로필을%20저장했습니다.");
  } catch (error) {
    redirect(`/settings?error=${encodeURIComponent(getErrorMessage(error))}`);
  }
}
