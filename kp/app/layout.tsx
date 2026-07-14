import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "КП Генератор — 32°",
  description: "Быстрые коммерческие предложения для корпоративного мерча",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
