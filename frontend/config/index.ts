import type { Metadata } from "next";

export const siteConfig: Metadata = {
  title: "邓锦鑫 | 个人技术博客",
  description:
    "浙江财经大学软件工程 · 全栈开发者 | 算法竞赛爱好者。基于 sanidhyy/space-portfolio 开源模板改造。",
  keywords: [
    "邓锦鑫",
    "个人技术博客",
    "全栈开发",
    "算法竞赛",
    "space-portfolio",
    "Next.js",
    "Three.js",
  ] as Array<string>,
  authors: {
    name: "邓锦鑫",
    url: "https://github.com/djxqwq",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
} as const;
