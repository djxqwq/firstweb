"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HONORS } from "@/constants";
import { fetchHonors } from "@/lib/api";

export const Honors = () => {
  const [items, setItems] = useState<string[]>([...HONORS]);
  const [flipped, setFlipped] = useState<number | null>(null);

  useEffect(() => {
    fetchHonors().then((data) => {
      if (!data?.length) return;
      setItems(data.map((h) => h.title || h.summary).filter(Boolean));
    });
  }, []);

  return (
    <section
      id="honors"
      className="relative flex flex-col items-center justify-center px-6 py-20"
    >
      <h1 className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text py-10 text-[40px] font-semibold text-transparent">
        荣誉证书
      </h1>
      <div className="grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const isFlip = flipped === i;
          return (
            <motion.button
              key={`${item}-${i}`}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFlipped(isFlip ? null : i)}
              className="group relative h-[148px] text-left [perspective:1000px]"
            >
              <motion.div
                className="relative h-full w-full rounded-2xl border border-[#7042f861] bg-[#030014]/70 p-5 text-gray-200 shadow-[0_0_28px_rgba(112,66,248,0.08)] [transform-style:preserve-3d]"
                animate={{
                  rotateY: isFlip ? 180 : 0,
                  boxShadow: isFlip
                    ? "0 0 36px rgba(34,211,238,0.28)"
                    : "0 0 28px rgba(112,66,248,0.08)",
                }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
              >
                <div className="absolute inset-0 p-5 [backface-visibility:hidden]">
                  <div className="mb-2 text-[10px] tracking-[0.2em] text-amber-300">
                    AWARD_{String(i + 1).padStart(2, "0")}
                  </div>
                  <p className="text-sm leading-6">{item}</p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-violet-900/80 to-cyan-900/50 p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="font-mono text-xs tracking-[0.3em] text-cyan-200">
                    CERTIFIED
                  </div>
                  <div className="mt-3 text-2xl font-light text-white">
                    #{String(i + 1).padStart(2, "0")}
                  </div>
                  <AnimatePresence>
                    {isFlip && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-4 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
