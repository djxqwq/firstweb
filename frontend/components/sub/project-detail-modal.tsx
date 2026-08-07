"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export type ProjectLinks = {
  github?: string;
  demo?: string;
  docs?: string;
};

export type ProjectItem = {
  title: string;
  description: string;
  detail?: string;
  image: string;
  tags?: string[];
  links?: ProjectLinks;
};

type Props = {
  project: ProjectItem | null;
  onClose: () => void;
};

const LINK_LABELS: { key: keyof ProjectLinks; label: string }[] = [
  { key: "demo", label: "在线预览" },
  { key: "docs", label: "相关文档" },
  { key: "github", label: "GitHub 源码" },
];

export function ProjectDetailModal({ project, onClose }: Props) {
  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [project, onClose]);

  const links = project?.links || {};
  const available = LINK_LABELS.filter(({ key }) => !!links[key]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.article
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-detail-title"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative z-[1] flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#7042f861] bg-[#0a0618] shadow-[0_0_60px_rgba(112,66,248,0.35)]"
          >
            <div className="relative h-44 w-full shrink-0 md:h-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.image}
                alt={project.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0618] via-[#0a0618]/40 to-transparent" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-sm text-gray-200 backdrop-blur hover:bg-black/60"
              >
                关闭 ✕
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-6 pt-2 md:px-8">
              <p className="font-mono text-[11px] tracking-[0.2em] text-cyan-400/80">
                PROJECT_DETAIL
              </p>
              <h2
                id="project-detail-title"
                className="mt-1 text-2xl font-semibold text-white md:text-3xl"
              >
                {project.title}
              </h2>

              {!!project.tags?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] text-cyan-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-3 text-sm leading-7 text-gray-300 md:text-base">
                <p className="text-purple-200/90">{project.description}</p>
                {project.detail && (
                  <p className="whitespace-pre-line text-gray-400">
                    {project.detail}
                  </p>
                )}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {available.length ? (
                  available.map(({ key, label }) => (
                    <a
                      key={key}
                      href={links[key]}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/10"
                    >
                      {label}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    暂无外链，可先浏览上方项目介绍。
                  </p>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5"
                >
                  返回列表
                </button>
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
