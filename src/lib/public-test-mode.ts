export const PUBLIC_TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
export const PUBLIC_TEST_EMAIL = "guest@familycare.test";

// 임시 테스트 기본값: on
// 배포에서 끄려면 PUBLIC_TEST_MODE=off 설정
export function isPublicTestMode(): boolean {
  return process.env.PUBLIC_TEST_MODE !== "off";
}
