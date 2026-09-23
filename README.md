# ApplyLog

> 채용공고의 마감일부터 현재 전형, 평가 방식, 준비할 일과 메모까지 한곳에서 관리하는 개인용 취업 지원 트래커

지원할 기업이 늘어나면 포스트잇이나 문서만으로는 **어디에 지원했는지**, **지금 어느 단계인지**, **무엇을 준비해야 하는지** 놓치기 쉽습니다. ApplyLog는 문서 작성보다 일정과 진행 상태 확인에 집중해, 취업 준비에 필요한 정보를 빠르게 등록하고 매일 확인할 수 있도록 만든 웹 애플리케이션입니다.

현재 버전은 브라우저에서 바로 사용할 수 있는 로컬 MVP입니다. 데이터는 `localStorage`에 자동 저장되며, 다음 단계에서 Supabase 기반 로그인과 클라우드 동기화를 추가할 예정입니다.

## 서비스 화면

> **스크린샷 플레이스홀더**
>
> `docs/images/dashboard.png` — 지원 현황 메인 화면

> **스크린샷 플레이스홀더**
>
> `docs/images/application-detail.png` — 지원 상세·체크리스트·메모 화면

이미지 파일명과 권장 크기는 [`docs/images/README.md`](./docs/images/README.md)에서 확인할 수 있습니다.

## 핵심 기능

### 지원 현황을 한눈에

- 진행 중인 지원, 3일 내 마감, 검사 진행, 면접 단계 요약
- 마감일 기준 자동 정렬 및 D-Day 계산
- 기업명과 직무명 검색
- 마감 임박·지원 준비·전형 진행·면접 필터

### 기업별 채용 프로세스 관리

- 기업명, 직무, 공고 링크, 마감일 등록
- 지원 준비부터 최종 합격·불합격까지 현재 단계 지정
- 코딩테스트, 인적성, AI 역량검사 복수 선택
- 목록에서 현재 단계 즉시 변경

### 지원 준비 기록

- 기업별 준비 체크리스트 생성·완료·삭제
- 체크리스트 기반 준비율 표시
- 서식과 크기 조절을 지원하는 리치 텍스트 메모
- 채용공고 원문 링크 바로가기

### 로컬 사용성

- 변경 사항을 브라우저 `localStorage`에 자동 저장
- 모바일과 데스크톱에 대응하는 반응형 화면
- 최초 실행 시 기능을 확인할 수 있는 샘플 데이터 제공

## 사용자 흐름

```text
지원 정보 등록
  → 마감일과 포함 전형 확인
  → 현재 단계 갱신
  → 체크리스트와 메모로 준비
  → 검색·필터로 오늘 할 지원 확인
```

## 기술 스택

| 영역 | 기술 | 선택 이유 |
| --- | --- | --- |
| Framework | Next.js 16 App Router | 화면과 추후 서버 기능을 하나의 프로젝트에서 확장하기 위해 선택 |
| UI | React 19, Tailwind CSS 4 | 상태 중심 UI 구성과 빠른 반응형 스타일링 |
| Language | TypeScript | 채용 단계와 평가 유형 등 도메인 값의 타입 안정성 확보 |
| Storage | Web Storage API | 인증·백엔드 도입 전 로컬 MVP를 빠르게 검증하기 위한 임시 저장소 |

## 데이터 모델

한 개의 지원 정보는 다음 데이터를 관리합니다.

```ts
type Job = {
  id: string;
  company: string;
  role: string;
  deadline: string;
  currentStep: ProcessStep;
  assessments: AssessmentType[];
  link: string;
  memo: string;
  tasks: JobTask[];
  createdAt: string;
};
```

지원 상태처럼 정확한 조회가 필요한 정보는 구조화된 데이터로 관리하고, 장문 메모는 리치 텍스트 HTML로 저장합니다.

## 로컬 실행

### 요구 사항

- Node.js 20.9 이상
- npm

저장소를 복제한 뒤 프로젝트 폴더에서 의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 자신의 Supabase 프로젝트 연결

ApplyLog는 특정 운영자의 Supabase 프로젝트에 종속되지 않도록 구성할 예정입니다. 저장소를 포크하거나 복제한 사용자는 자신의 프로젝트 URL과 Publishable Key를 설정해 독립적으로 사용할 수 있습니다.

1. [`.env.example`](./.env.example)을 `.env.local`로 복사
2. 본인의 Supabase Project URL과 Publishable Key 입력
3. [`docs/supabase/schema.sql`](./docs/supabase/schema.sql)을 SQL Editor에서 실행
4. Auth, Redirect URL, RLS 설정 검증

콘솔 클릭 경로와 보안 주의사항을 포함한 전체 과정은 **[Supabase 연결 가이드](./docs/SUPABASE_SETUP.md)**를 참고하세요.

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

`service_role` 또는 Secret key는 브라우저 환경변수에 넣거나 저장소에 커밋하면 안 됩니다.

## 품질 확인

ESLint로 정적 검사를 실행합니다.

```bash
npm run lint
```

프로덕션 빌드를 확인합니다.

```bash
npm run build
```

## 현재 범위와 한계

현재는 UI와 로컬 데이터 관리에 집중한 1차 MVP입니다.

- 데이터가 현재 브라우저에만 저장됩니다.
- 로그인과 사용자별 데이터 분리가 없습니다.
- 다른 브라우저나 기기와 데이터가 동기화되지 않습니다.
- 브라우저 저장 데이터를 삭제하면 지원 정보도 함께 삭제됩니다.

민감한 개인정보를 메모에 저장하지 않는 것을 권장합니다.

## 로드맵

### Phase 1 — 로컬 MVP `완료`

- [x] 지원 정보 등록 및 삭제
- [x] D-Day와 마감 임박 표시
- [x] 전형 단계와 평가 방식 관리
- [x] 체크리스트와 리치 텍스트 메모
- [x] 검색, 필터, 반응형 UI
- [x] localStorage 자동 저장

### Phase 2 — 서비스 MVP `다음 작업`

- [ ] Supabase Auth 로그인
- [ ] PostgreSQL 기반 지원 정보 CRUD
- [ ] Row Level Security를 통한 사용자별 데이터 격리
- [ ] 기존 localStorage 데이터 1회 마이그레이션
- [ ] GitHub 연동 및 Vercel 배포
- [ ] 모바일·운영 환경 사용자 흐름 검증

### Phase 3 — AI 확장 `백로그`

- [ ] JD와 기업 분석 문서 저장
- [ ] Amazon S3 문서 동기화
- [ ] Amazon Bedrock Knowledge Bases 기반 RAG
- [ ] 반복 요구 역량과 면접 회고 검색

AI 기능은 핵심 지원 관리가 안정화되고 실제 데이터가 쌓인 뒤 도입합니다. 마감일이나 현재 단계처럼 정확성이 필요한 값은 데이터베이스에서 조회하고, JD·메모·면접 회고와 같은 비정형 문서만 RAG 검색 대상으로 분리할 계획입니다.

## 기술 선택 원칙

이 프로젝트는 기술의 개수보다 다음 기준을 우선합니다.

1. 실제 취업 준비에 매일 사용할 수 있을 것
2. 빠르게 배포하고 작은 비용으로 운영할 수 있을 것
3. 사용자 데이터가 안전하게 분리될 것
4. 구조화 데이터와 AI 검색 대상을 구분할 것
5. 선택한 기술과 대안을 설명할 수 있을 것

서비스 MVP는 `Vercel + Supabase`로 완성하고, AI 기능은 핵심 트랜잭션 시스템과 분리된 AWS 실험 영역으로 확장할 예정입니다.

## 프로젝트 구조

```text
docs/
├── SUPABASE_SETUP.md        # Supabase 프로젝트 연결 가이드
├── images/                  # 서비스 스크린샷 위치
└── supabase/
    └── schema.sql           # 테이블, 인덱스, RLS 정책
src/
├── app/
│   ├── globals.css          # 디자인 토큰과 공통 스타일
│   ├── layout.tsx           # 루트 레이아웃
│   └── page.tsx             # 메인 페이지
├── components/
│   ├── job-dashboard.tsx    # 지원 관리 화면과 상태 로직
│   ├── rich-text-editor.tsx # 기업별 메모 편집기
│   └── icons.tsx            # UI 아이콘
├── data/
│   └── sample-jobs.ts       # 최초 실행용 샘플 데이터
└── types/
    └── job.ts               # 지원 정보 도메인 타입
.env.example                 # 커밋 가능한 환경변수 템플릿
```

## 배포 계획

1. 현재 로컬 MVP를 GitHub 기준점으로 저장
2. Supabase Auth, PostgreSQL, RLS 연동
3. 로컬 데이터 마이그레이션과 CRUD 검증
4. GitHub에 서비스 MVP 반영
5. Vercel에서 저장소를 Import하고 환경변수 등록
6. 배포 URL에서 로그인·등록·수정·삭제 흐름 검증

---

ApplyLog는 취업 준비 과정에서 실제로 겪은 일정 관리 문제를 해결하고, 사용 과정에서 축적된 데이터를 이후 AI 기능으로 확장하기 위해 시작한 개인 프로젝트입니다.
