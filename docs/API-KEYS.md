# API 키/시크릿 설정 가이드 (노출 금지)

영빈님 요청 기준으로 **어디에 어떤 키를 넣는지**와 **노출 위험도**를 색상으로 정리했습니다.

## 1) 색상 규칙

- 🟩 **PUBLIC**: 브라우저에 노출되어도 되는 값 (`NEXT_PUBLIC_*`)
- 🟨 **MODE**: 동작 모드 값(키 아님)
- 🟥 **SECRET**: 절대 외부 노출/커밋 금지 값

---

## 2) 지금 이 프로젝트에서 입력해야 하는 값

| 변수명 | 등급 | 설명 | 어디에 넣나 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 🟩 PUBLIC | Supabase 프로젝트 URL | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🟩 PUBLIC | Supabase anon key (공개키) | `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | 🟩 PUBLIC | 앱 기본 URL (OAuth callback 생성) | `.env.local` |
| `SESSION_ENCRYPTION_KEY` | 🟥 SECRET | 세션 쿠키 암호화 키(32자+ 랜덤) | `.env.local` |
| `PUBLIC_TEST_MODE` | 🟨 MODE | 공개 테스트 모드 on/off | `.env.local` |

---

## 3) 실제로 열어야 하는 파일

### 로컬 개발
1. `familycare-mvp/.env.example` 열기 (샘플 확인)
2. `familycare-mvp/.env.local` 파일 생성
3. 아래 형식으로 값 입력

```dotenv
# 🟩 [PUBLIC] Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co

# 🟩 [PUBLIC] Supabase anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 🟩 [PUBLIC] 사이트 URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 🟥 [SECRET] 절대 노출 금지
SESSION_ENCRYPTION_KEY=랜덤문자열_32자이상

# 🟨 [MODE]
PUBLIC_TEST_MODE=on
```

### 배포(Vercel)
- Vercel Dashboard → Project → **Settings → Environment Variables**
- 위와 동일한 키 이름으로 등록
- 🟥 `SESSION_ENCRYPTION_KEY`는 절대 로그/스크린샷/채팅에 그대로 공유 금지

---

## 4) Supabase Edge Functions를 쓸 때(푸시 알림 등)

Edge Function은 서버 측에서 실행되므로, **비밀키를 클라이언트에 노출하지 않고** 사용할 수 있습니다.

추가로 들어갈 수 있는 값(예시):
- 🟥 `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
- 🟥 `WEB_PUSH_PRIVATE_KEY`
- 🟩 `WEB_PUSH_PUBLIC_KEY` (클라이언트 전달 가능)

설정 위치:
- Supabase Dashboard → **Edge Functions → Secrets**
- 또는 CLI: `supabase secrets set KEY=VALUE`

> 핵심: `SERVICE_ROLE_KEY`를 `NEXT_PUBLIC_*`로 절대 넣으면 안 됩니다.

---

## 5) 키 노출 방지 체크리스트

- [ ] `.env.local` 파일은 git에 커밋하지 않기 (`.gitignore`로 차단됨)
- [ ] `NEXT_PUBLIC_*`에는 공개 가능한 값만 넣기
- [ ] 🟥 SECRET은 서버 코드(Edge Function/Route Handler)에서만 사용
- [ ] 커밋 전 `git diff`로 키 문자열 포함 여부 확인
- [ ] 로그/스크린샷 공유 시 키 마스킹(`abcd...wxyz`) 처리

---

필요하시면 다음 단계로, 제가 **푸시 알림용 Edge Function 템플릿**까지 만들어서
`어디에 어떤 SECRET을 넣는지` 같은 형식으로 바로 이어서 작성해드리겠습니다.
