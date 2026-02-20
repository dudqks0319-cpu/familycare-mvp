"use server";

import { redirect } from "next/navigation";

import { getAuthSessionFromCookie } from "@/lib/auth-session";
import { createFridgeItem, deleteFridgeItem } from "@/lib/fridge-db";

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function toRedirectErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function createFridgeItemAction(formData: FormData): Promise<never> {
  const session = await getAuthSessionFromCookie();

  if (!session) {
    redirect("/auth?mode=login&redirect=%2Ffridge&error=로그인%20후%20사용해%20주세요.");
  }

  try {
    await createFridgeItem(session, {
      ingredientName: readField(formData, "ingredientName"),
      category: readField(formData, "category"),
      quantityText: readField(formData, "quantityText"),
      expiresOn: readField(formData, "expiresOn"),
      note: readField(formData, "note"),
    });

    redirect("/fridge?message=식재료가%20저장되었습니다.");
  } catch (error) {
    const message = encodeURIComponent(toRedirectErrorMessage(error));
    redirect(`/fridge?error=${message}`);
  }
}

export async function deleteFridgeItemAction(formData: FormData): Promise<never> {
  const session = await getAuthSessionFromCookie();

  if (!session) {
    redirect("/auth?mode=login&redirect=%2Ffridge&error=로그인%20후%20사용해%20주세요.");
  }

  try {
    await deleteFridgeItem(session, readField(formData, "itemId"));
    redirect("/fridge?message=식재료를%20삭제했습니다.");
  } catch (error) {
    const message = encodeURIComponent(toRedirectErrorMessage(error));
    redirect(`/fridge?error=${message}`);
  }
}
