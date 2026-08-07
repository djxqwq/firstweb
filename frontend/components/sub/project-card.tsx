"use client";

import { motion } from "framer-motion";
import type { ProjectItem } from "@/components/sub/project-detail-modal";

type ProjectCardProps = ProjectItem & {
  index?: number;
  onOpen: () => void;
};

export const ProjectCard = ({
  src,
  title,
  description,
  tags = [],
  index = 0,
  onOpen,
}: {
  src: string;
  title: string;
  description: string;
  tags?: string[];
  index?: number;
  onOpen: () => void;
}) => {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative h-full w-full text-left"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#7042f861] bg-[#030014]/70 shadow-[0_0_40px_rgba(112,66,248,0.12)] transition duration-300 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_50px_rgba(34,211,238,0.25)]">
        <div className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            className="h-48 w-full object-cover transition duration-500 group-hover:scale-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030014] via-transparent to-transparent opacity-80" />
          <div className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
        </div>

        <div className="relative flex flex-1 flex-col p-5">
          <h1 className="text-xl font-semibold text-white md:text-2xl">
            {title}
          </h1>
          <p className="mt-2 flex-1 text-sm leading-6 text-gray-300 line-clamp-3">
            {description}
          </p>
          {!!tags.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] text-cyan-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs tracking-widest text-purple-300/80 transition group-hover:text-cyan-300">
            <span className="h-px w-4 bg-current transition-all group-hover:w-8" />
            DETAIL
          </div>
        </div>
      </div>
    </motion.button>
  );
};
