"use client";

import { useEffect, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { fetchInternships } from "@/lib/api";

type InternshipItem = {
  period: string;
  company: string;
  role: string;
  description: string;
  tags: string[];
};

function InternshipCard({
  item,
  index,
}: {
  item: InternshipItem;
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const transform = useMotionTemplate`translate(${x}px, ${y}px)`;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      style={{ transform }}
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.04);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.04);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={() => setOpen((v) => !v)}
      className="relative w-full rounded-2xl border border-[#7042f861] bg-[#030014]/70 p-6 text-left text-gray-200 shadow-[0_0_30px_rgba(112,66,248,0.1)] transition hover:border-cyan-400/40"
    >
      {/* 时间线圆点 */}
      <motion.span
        className="absolute -left-[2.35rem] top-7 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
        animate={{
          scale: open ? [1, 1.35, 1] : 1,
          boxShadow: open
            ? [
                "0 0 12px #22d3ee",
                "0 0 22px #a855f7",
                "0 0 12px #22d3ee",
              ]
            : "0 0 12px #22d3ee",
        }}
        transition={{ duration: 1.6, repeat: open ? Infinity : 0 }}
      />

      {/* 时间段 */}
      <div className="text-sm tracking-wider text-cyan-300">
        {item.period}
      </div>

      {/* 公司 + 职位 */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-xl text-white">{item.company}</h3>
        <span className="text-sm text-purple-300">{item.role}</span>
      </div>

      {/* 描述 + 技术栈（展开/收起） */}
      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0.55,
          marginTop: open ? 8 : 4,
        }}
        className="overflow-hidden"
      >
        <p
          className={`text-gray-400 ${open ? "" : "line-clamp-1"}`}
        >
          {item.description}
        </p>
        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </motion.button>
  );
}

export const Internship = () => {
  const [items, setItems] = useState<InternshipItem[]>([]);

  useEffect(() => {
    fetchInternships().then((data) => {
      if (!data?.length) return;
      setItems(
        data.map((e) => {
          // body_json 中可能存了 description / tags 等扩展字段
          const body = (e.body as Record<string, unknown> | null) ?? {};
          const tagsRaw =
            (e.tags as string[] | string | undefined) ??
            (body.tags as string[] | undefined);
          const tags = Array.isArray(tagsRaw)
            ? tagsRaw
            : typeof tagsRaw === "string" && tagsRaw
              ? tagsRaw.split(/[,，、]/).map((t) => t.trim()).filter(Boolean)
              : [];
          return {
            period: e.summary?.split("·")[0]?.trim() || "实习经历",
            company: e.title,
            role:
              (body.role as string) ||
              e.summary?.split("·")[1]?.trim() ||
              "",
            description:
              (body.description as string) ||
              (body.detail as string) ||
              e.summary ||
              "",
            tags,
          };
        })
      );
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      id="internship"
      className="relative flex flex-col items-center justify-center px-6 py-20"
    >
      <h1 className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text py-10 text-[40px] font-semibold text-transparent">
        实习经历
      </h1>
      <div className="relative w-full max-w-3xl space-y-6 border-l border-purple-500/40 pl-8">
        {items.map((item, i) => (
          <InternshipCard key={`${item.company}-${i}`} item={item} index={i} />
        ))}
      </div>
    </section>
  );
};
