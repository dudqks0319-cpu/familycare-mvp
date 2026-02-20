# FamilyCare MVP

가족 돌봄 상황을 공유하고 체크인/복약 관리를 빠르게 시작하기 위한 MVP입니다.

## 구현 범위 (2주차 계획 반영 + 소셜 로그인 확장)

### Week1

- Day1: Supabase 스키마 + 인증 뼈대
- Day2: 피보호자 등록/삭제 + owner 멤버 자동 연결
- Day3: 복약 일정 등록/활성화 제어
- Day4: 체크인(정상/주의/위험) 기록
- Day5: 대시보드 통계 카드

### Week2

- Day6: 복약 로그(복약 완료/누락) 기록
- Day7: 위험/주의 알림 보드
- Day8: 돌봄 멤버 추가/권한 제어/제거
- Day9: 설정 페이지(프로필 저장)
- Day10: 인증 기반 `/api/dashboard` JSON API
- Day11: Supabase OAuth (Google / Kakao) 연동
- Day12: 이메일/초대링크 기반 가족 멤버 초대/수락

## 주요 라우트

- `/` : 홈
- `/auth` : 이메일 로그인/회원가입 + Google/Kakao 소셜 로그인
- `/auth/callback` : OAuth 콜백 처리 라우트
- `/dashboard` : 돌봄 운영 대시보드
- `/planner` : 영유아/어르신 맞춤 돌봄 플래너 (원탭 기록/복약 체크리스트/접종 D-day/도넛 차트/달력/주중·주말)
- `/invite` : 이메일 초대 링크 수락
- `/settings` : 계정/프로필 설정
- `/api/dashboard` : 대시보드 JSON (테스트 모드/인증 모드)

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 `/auth`에서 로그인/회원가입을 테스트할 수 있습니다.

## 환경변수

`.env.local`에 아래 값을 넣어 주세요.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SESSION_ENCRYPTION_KEY=<32자 이상 랜덤 문자열>
# 임시 공개 테스트 모드 (기본 on, 잠글 때 off)
PUBLIC_TEST_MODE=on
```

`NEXT_PUBLIC_SITE_URL`은 OAuth callback URL 생성에 사용됩니다.
`SESSION_ENCRYPTION_KEY`는 인증 세션 쿠키 암호화에 사용됩니다.
`PUBLIC_TEST_MODE`가 on이면 로그인 없이 전체 테스트가 가능합니다.

## Supabase SQL 적용

1. Supabase Dashboard → SQL Editor 이동
2. 아래 순서로 SQL 파일 실행
   - `supabase/migrations/202602200730_init_familycare.sql`
   - `supabase/migrations/202602200910_week2_features.sql`
   - `supabase/migrations/202602200920_recipient_delete_policy.sql`
   - `supabase/migrations/202602201045_recipient_invites.sql`
   - `supabase/migrations/202602201105_prevent_duplicate_pending_invites.sql`
   - `supabase/migrations/202602201220_care_planner_domain.sql`

## Supabase Provider 설정 (Google / Kakao)

1. Supabase Dashboard → Authentication → Providers 이동
2. Google, Kakao를 각각 Enable
3. 각 Provider의 Client ID/Secret 입력
4. 각 Provider 콘솔에서 Supabase Callback URL 등록
   - 형식: `https://<project-ref>.supabase.co/auth/v1/callback`
5. 프로젝트 URL(`NEXT_PUBLIC_SITE_URL`)과 Redirect URL allow list를 함께 점검

## 테스트/검증

```bash
npm test
npm run lint
npm run build
```

## 기획 참고

- Opus 리서치 반영 실행 계획: `research/opus-execution-plan-20260220.md`

## 보안/운영 메모

- 현재 인증은 Supabase Auth REST + httpOnly 쿠키 기반 MVP 구조입니다.
- Google/Kakao는 Supabase OAuth로 연동되어 있으며, 네이버는 2단계(NextAuth 브릿지)로 확장 예정입니다.
- 운영 전 권장사항
  - 이메일 인증 정책 강화
  - 비밀번호 정책 강화
  - 알림 채널(SMS/푸시) 연결
  - 감사 로그/모니터링 추가
