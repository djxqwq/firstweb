"use client";

import { useEffect, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { EDUCATION } from "@/constants";
import { fetchEducation } from "@/lib/api";

type Item = { period: string; title: string; detail: string };

function TimelineCard({ item, index }: { item: Item; index: number }) {
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
      <div className="text-sm tracking-wider text-cyan-300">{item.period}</div>
      <h3 className="mt-2 text-xl text-white">{item.title}</h3>
      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0.55,
          marginTop: open ? 8 : 4,
        }}
        className="overflow-hidden"
      >
        <p className={`text-gray-400 ${open ? "" : "line-clamp-1"}`}>
          {item.detail}
        </p>
      </motion.div>
    </motion.button>
  );
}

export const Education = () => {
  const [items, setItems] = useState<Item[]>(
    EDUCATION.map((e) => ({
      period: e.period,
      title: e.title,
      detail: e.detail,
    }))
  );

  useEffect(() => {
    fetchEducation().then((data) => {
      if (!data?.length) return;
      setItems(
        data.map((e) => ({
          period: e.summary?.split("·")[0]?.trim() || "经历",
          title: e.title,
          detail: e.summary || "",
        }))
      );
    });
  }, []);

  return (
    <section
      id="education"
      className="relative flex flex-col items-center justify-center px-6 py-20"
    >
      <h1 className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text py-10 text-[40px] font-semibold text-transparent">
        教育背景
      </h1>
      <div className="relative w-full max-w-3xl space-y-6 border-l border-purple-500/40 pl-8">
        {items.map((item, i) => (
          <TimelineCard key={`${item.title}-${i}`} item={item} index={i} />
        ))}
      </div>
    </section>
  );
};
