import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

import "../admin/admin.css";

export const metadata: Metadata = {
  title: "工作台 · 邓锦鑫",
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: PropsWithChildren) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
