import type { Job } from "@/types/job";
function addDays(days: number) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
export function createSampleJobs(): Job[] {
  const createdAt = new Date().toISOString();
  return [
    { id: "sample-1", company: "라인플러스", role: "Backend Engineer", startDate: null, deadline: addDays(2), status: "준비 중", currentStep: "지원 준비", assessments: ["코딩테스트"], link: "https://careers.linecorp.com/ko/jobs", memo: "프로젝트에서 트래픽 처리 경험을 중심으로 정리하기", tasks: [{ id: "task-1", label: "이력서 직무 맞춤 수정", done: true }, { id: "task-2", label: "자기소개서 최종 검토", done: false }, { id: "task-3", label: "포트폴리오 링크 확인", done: false }], stages: [], createdAt },
    { id: "sample-2", company: "카카오페이", role: "서버 개발자", startDate: null, deadline: addDays(5), status: "관심", currentStep: "서류 심사", assessments: ["코딩테스트", "인적성"], link: "https://www.kakaopay.com/careers", memo: "결제 도메인과 장애 대응 경험 조사", tasks: [{ id: "task-4", label: "채용공고 다시 읽기", done: true }, { id: "task-5", label: "지원서 작성", done: true }], stages: [], createdAt },
    { id: "sample-3", company: "무신사", role: "Backend Engineer (주니어)", startDate: null, deadline: addDays(8), status: "지원 완료", currentStep: "코딩테스트", assessments: ["코딩테스트", "AI 역량검사"], link: "https://www.musinsacareers.com/", memo: "코딩테스트 안내 메일 확인하기", tasks: [{ id: "task-6", label: "지원서 제출", done: true }, { id: "task-7", label: "코딩테스트 준비", done: false }], stages: [], createdAt },
    { id: "sample-4", company: "당근", role: "Software Engineer, Backend", startDate: null, deadline: addDays(14), status: "서류 합격", currentStep: "1차 면접", assessments: ["코딩테스트"], link: "https://about.daangn.com/jobs/", memo: "1차 인터뷰: 다음 주 수요일 14:00", tasks: [{ id: "task-8", label: "예상 질문 정리", done: true }, { id: "task-9", label: "프로젝트 설명 연습", done: false }], stages: [], createdAt },
  ];
}
