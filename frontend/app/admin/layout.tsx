import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import "./admin.css";

export const metadata: Metadata = {
  title: "管理后台 · 邓锦鑫",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: PropsWithChildren) {
  return children;
}
