import { NextResponse } from "next/server";

import { getAuthSessionFromCookie } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/familycare-db";
import { getMockDashboardData } from "@/lib/mock-dashboard-data";
import {
  PUBLIC_TEST_EMAIL,
  PUBLIC_TEST_USER_ID,
  isPublicTestMode,
} from "@/lib/public-test-mode";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "대시보드 데이터를 불러오지 못했습니다.";
}

export async function GET() {
  const session = await getAuthSessionFromCookie();
  const useMockMode = isPublicTestMode() || !isSupabaseConfigured() || !session;

  if (useMockMode) {
    return NextResponse.json(
      {
        mode: "public-test",
        userId: session?.userId || PUBLIC_TEST_USER_ID,
        email: session?.email || PUBLIC_TEST_EMAIL,
        generatedAt: new Date().toISOString(),
        dashboard: getMockDashboardData(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const dashboardData = await getDashboardData(session);

    return NextResponse.json(
      {
        mode: "authenticated",
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
