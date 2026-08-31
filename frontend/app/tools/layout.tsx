import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

import { ToolsStarfield } from "@/components/sub/tools-starfield";
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
      <Suspense fallback={null}>
        {/* 用 fixed -z-10 挂载星空，避免与各页面 .tools-shell relative 结构打架 */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <ToolsStarfield />
        </div>
        {children}
      </Suspense>
    </div>
  );
}
