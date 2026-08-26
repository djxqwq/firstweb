import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

import "../admin/admin.css";
import "./tools.css";

/** Google Fonts — 工具区独立排版，不跟站点 Inter 混用 */
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-tools-display",
  weight: ["500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-tools-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "我的工具 · 邓锦鑫",
  robots: { index: false, follow: false },
};

export default function ToolsLayout({ children }: PropsWithChildren) {
  return (
    <div className={`${syne.variable} ${jetbrains.variable} tools-fonts`}>
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  );
}
