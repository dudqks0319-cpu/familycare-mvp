# FamilyCare MVP

가족 돌봄 상황을 공유하고 체크인/복약 관리를 빠르게 시작하기 위한 MVP입니다.

## 구현 범위 (2주차 계획 반영 완료)

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

## 주요 라우트

- `/` : 홈
- `/auth` : 로그인/회원가입
- `/dashboard` : 돌봄 운영 대시보드
- `/settings` : 계정/프로필 설정
- `/api/dashboard` : 인증 사용자 대시보드 JSON

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
```

## Supabase SQL 적용

1. Supabase Dashboard → SQL Editor 이동
2. 아래 순서로 SQL 파일 실행
   - `supabase/migrations/202602200730_init_familycare.sql`
   - `supabase/migrations/202602200910_week2_features.sql`
3. Auth > Providers에서 이메일 로그인 활성화 확인

## 테스트/검증

```bash
npm test
npm run lint
npm run build
```

## 보안/운영 메모

- 현재 인증은 Supabase Auth REST + httpOnly 쿠키 기반 MVP 구조입니다.
- 운영 전 권장사항
  - 이메일 인증 정책 강화
  - 비밀번호 정책 강화
  - 알림 채널(SMS/푸시) 연결
  - 감사 로그/모니터링 추가
