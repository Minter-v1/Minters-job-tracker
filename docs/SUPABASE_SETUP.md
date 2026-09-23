# Supabase 연결 가이드

이 문서는 ApplyLog를 포크하거나 복제한 사용자가 **자신의 Supabase 프로젝트**를 연결하는 방법을 설명합니다.

> 현재 저장소의 로컬 MVP는 `localStorage`를 사용합니다. 아래 설정은 서비스 MVP에서 로그인과 클라우드 저장을 활성화하기 위한 준비 과정입니다.

## 1. 준비 사항

- Supabase 계정
- Node.js 20.9 이상
- 이 저장소를 복제한 로컬 프로젝트

프로젝트 루트에서 의존성을 설치합니다.

```bash
npm install
```

Supabase의 Next.js SSR 클라이언트 패키지를 설치합니다.

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 2. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인합니다.
2. `New project`를 선택합니다.
3. Organization과 프로젝트 이름을 지정합니다.
4. 안전한 Database Password를 생성해 별도의 비밀번호 관리자에 보관합니다.
5. Region은 주 사용자의 위치와 가까운 곳을 선택합니다.
6. 요금제를 확인한 후 프로젝트를 생성합니다.

프로젝트 생성은 클라우드 PostgreSQL, Auth, API 엔드포인트를 함께 준비합니다. 개인 프로젝트라면 먼저 무료 플랜의 제한을 확인하세요.

## 3. 환경변수 설정

Supabase Dashboard의 프로젝트 `Connect` 화면 또는 `Project Settings → API`에서 다음 값을 확인합니다.

- Project URL
- Publishable key

프로젝트 루트에서 예시 파일을 복사합니다.

```bash
cp .env.example .env.local
```

`.env.local`을 열어 본인의 값으로 교체합니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 브라우저에서 사용하는 공개 키입니다. 데이터 보호는 이 키를 숨기는 방식이 아니라 로그인과 Row Level Security 정책으로 수행합니다.

다음 값은 브라우저 환경변수에 넣거나 GitHub에 커밋하면 안 됩니다.

- Database Password
- `service_role` 키
- Secret key
- 개인 Access Token

## 4. 데이터베이스 생성

1. Supabase Dashboard에서 `SQL Editor`로 이동합니다.
2. `New query`를 선택합니다.
3. [`docs/supabase/schema.sql`](./supabase/schema.sql)의 전체 내용을 붙여 넣습니다.
4. 실행할 프로젝트가 맞는지 확인합니다.
5. `Run`을 선택합니다.

이 SQL은 다음 리소스를 생성합니다.

- `applications`: 기업·직무·마감일·현재 전형·메모
- `application_tasks`: 지원별 체크리스트
- 사용자별 조회 성능을 위한 인덱스
- `updated_at` 자동 갱신 트리거
- 로그인 사용자에게 자신의 데이터만 허용하는 RLS 정책

### 실행 후 확인

Dashboard에서 `Table Editor`를 열고 다음 테이블이 보여야 합니다.

```text
applications
application_tasks
```

각 테이블의 RLS 표시가 활성화되어 있는지도 확인합니다.

## 5. 인증 설정

### 이메일 로그인

1. `Authentication → Providers`로 이동합니다.
2. Email provider가 활성화되어 있는지 확인합니다.
3. 개발 단계에서 이메일 확인 절차를 사용할지 결정합니다.

이메일 확인을 끄면 테스트는 빠르지만, 운영 환경에서는 소유하지 않은 이메일로 가입할 수 있으므로 권장하지 않습니다.

### Google 로그인 선택 설정

Google OAuth를 사용할 경우 Google Cloud Console에서 OAuth Client를 먼저 만들고, Supabase의 `Authentication → Providers → Google`에 Client ID와 Client Secret을 입력해야 합니다.

OAuth Secret은 `.env.local`의 `NEXT_PUBLIC_` 변수로 저장하지 않습니다.

## 6. Redirect URL 설정

`Authentication → URL Configuration`에서 URL을 등록합니다.

개발 환경:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/**
```

Vercel 배포 후에는 실제 주소도 추가합니다.

```text
https://YOUR_PROJECT.vercel.app/**
```

커스텀 도메인을 사용하면 해당 HTTPS 주소도 등록합니다. Redirect URL이 누락되면 로그인 후 로컬 주소로 이동하거나 OAuth 오류가 발생할 수 있습니다.

## 7. 애플리케이션 연결 구조

서비스 MVP에서는 다음 구조로 Supabase 클라이언트를 분리합니다.

```text
src/lib/supabase/
├── client.ts   # Client Component와 브라우저 요청
├── server.ts   # Server Component, Route Handler, Server Action
└── proxy.ts    # 인증 쿠키 갱신
```

브라우저 클라이언트와 서버 클라이언트를 분리하는 이유는 Next.js App Router의 서버 렌더링 과정에서 인증 쿠키를 안전하게 읽고 갱신하기 위해서입니다.

서버에서 인증 상태를 신뢰해야 하는 작업은 세션 문자열만 읽지 말고 Supabase가 검증한 claims를 기준으로 처리합니다. 데이터 접근의 최종 방어선은 반드시 PostgreSQL RLS 정책이어야 합니다.

## 8. 로컬 연결 확인

개발 서버를 다시 시작합니다. Next.js는 시작 시 환경변수를 읽으므로 `.env.local`을 수정한 뒤에는 재시작해야 합니다.

```bash
npm run dev
```

구현 완료 후에는 다음 사용자 흐름을 확인합니다.

- [ ] 새 사용자가 가입할 수 있다.
- [ ] 로그인과 로그아웃이 동작한다.
- [ ] 사용자가 지원 정보를 생성·조회·수정·삭제할 수 있다.
- [ ] 새로고침 후에도 데이터가 유지된다.
- [ ] 다른 계정으로 로그인하면 이전 계정의 데이터가 보이지 않는다.
- [ ] 로그아웃 상태에서 보호된 데이터에 접근할 수 없다.
- [ ] localStorage 데이터 가져오기가 한 번만 실행된다.

특히 **두 개의 테스트 계정**으로 사용자 데이터가 서로 보이지 않는지 확인해야 RLS 검증이 완료됩니다.

## 9. Vercel 환경변수

GitHub 저장소를 Vercel에 Import한 뒤 다음 경로로 이동합니다.

```text
Project → Settings → Environment Variables
```

아래 두 값을 각각 등록합니다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Production, Preview, Development 중 필요한 환경을 선택합니다. 값을 추가하거나 변경한 뒤에는 새 Deployment가 필요합니다.

## 10. 자주 확인할 문제

### 환경변수를 읽지 못함

- 파일명이 `.env.local`인지 확인합니다.
- 프로젝트 루트에 있는지 확인합니다.
- 개발 서버를 재시작합니다.
- 변수 이름의 오탈자를 확인합니다.

### 로그인 후 잘못된 주소로 이동함

- Supabase의 Site URL을 확인합니다.
- localhost와 Vercel Redirect URL이 모두 등록됐는지 확인합니다.
- `http`와 `https`를 구분합니다.

### 데이터 조회 결과가 비어 있음

- 사용자가 로그인되어 있는지 확인합니다.
- 행의 `user_id`가 현재 사용자의 ID와 일치하는지 확인합니다.
- Table Editor에서 RLS와 정책이 활성화되어 있는지 확인합니다.
- 브라우저 DevTools의 Network 탭에서 Supabase 응답 상태와 오류 메시지를 확인합니다.

### 다른 사용자의 데이터가 보임

즉시 운영 사용을 중단하고 RLS가 활성화되어 있는지 확인합니다. `service_role` 키를 브라우저에서 사용하면 RLS를 우회하므로 절대 사용하면 안 됩니다.

## 참고 자료

- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
