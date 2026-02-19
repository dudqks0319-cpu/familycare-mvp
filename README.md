# FamilyCare MVP

가족 돌봄 상황을 공유하고 체크인/복약 관리를 빠르게 시작하기 위한 MVP입니다.

## Day1 구현 범위

- Supabase 스키마 초안 (`supabase/migrations/202602200730_init_familycare.sql`)
- 인증 뼈대 (회원가입/로그인/로그아웃)
- 서버 페이지 보호용 세션 쿠키 처리
- 기본 대시보드 화면

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
2. `supabase/migrations/202602200730_init_familycare.sql` 내용 실행
3. Auth > Providers에서 이메일 로그인 활성화 확인

## 테스트/검증

```bash
npm test
npm run lint
npm run build
```

## 참고 사항

- 현재 인증은 **Supabase Auth REST 호출 기반 스켈레톤**입니다.
- 액세스/리프레시 토큰을 httpOnly 쿠키에 저장하는 MVP 구조이며, 이후 단계에서 갱신 로직·에러 복구를 보강해야 합니다.
- 실제 운영 전에는 비밀번호 정책/이메일 인증 정책/감사 로그를 추가해 주세요.
