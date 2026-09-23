# 지원관리

취업 지원 일정, 전형 방식, 현재 진행 단계를 관리하는 개인용 대시보드입니다.

## 기능

- 기업, 직무, 공고 링크, 마감일 등록
- D-Day 자동 계산 및 마감 임박 필터
- 코딩테스트, 인적성, AI 역량검사 복수 선택
- 지원 준비부터 면접과 최종 결과까지 현재 단계 지정
- 기업별 체크리스트와 메모
- 검색 및 진행 단계 필터
- 브라우저 `localStorage` 자동 저장
- 모바일/데스크톱 반응형 화면

## 실행

Node.js 20.9 이상이 필요합니다.

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 검증

```bash
npm run lint
npm run build
```

## 기술 구성

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4

GitHub 저장소에 올린 뒤 Vercel에서 저장소를 Import하면 기본 Next.js 설정으로 배포할 수 있습니다.
