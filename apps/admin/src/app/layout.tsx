import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "챙김 — 고객을 챙기는 가장 빠른 방법",
  description: "영업맨을 위한 AI 모바일 비서 (관리자 페이지)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
