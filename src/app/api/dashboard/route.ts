import { NextResponse } from "next/server";

import { getAuthSessionFromCookie } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/familycare-db";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "대시보드 데이터를 불러오지 못했습니다.";
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Supabase 환경변수가 설정되지 않았습니다.",
      },
      { status: 503 },
    );
  }

  const session = await getAuthSessionFromCookie();

  if (!session) {
    return NextResponse.json(
      {
        error: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  try {
    const dashboardData = await getDashboardData(session);

    return NextResponse.json(
      {
        userId: session.userId,
        email: session.email,
        generatedAt: new Date().toISOString(),
        dashboard: dashboardData,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}
