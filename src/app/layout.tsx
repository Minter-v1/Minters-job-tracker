import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "지원관리 | 채용 지원 대시보드",
  description: "취업 지원 일정, 전형 방식, 현재 단계를 한눈에 관리하세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
