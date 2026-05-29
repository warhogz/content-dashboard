import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { Topbar } from "@/components/topbar";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Content Cards",
  description: "Приватный personal dashboard для карточек контента",
  robots: { index: false, follow: false, nocache: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={inter.className + " bg-transparent text-white"}>
        <ToastProvider>
          <Topbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
