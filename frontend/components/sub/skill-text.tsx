"use client";

import { SparklesIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

import {
  slideInFromLeft,
  slideInFromRight,
  slideInFromTop,
} from "@/lib/motion";

export const SkillText = () => {
  return (
    <div className="flex h-auto w-full flex-col items-center justify-center">
      <motion.div
        variants={slideInFromTop}
        className="Welcome-box border border-[#7042f88b] px-[7px] py-[8px] opacity-[0.9]"
      >
        <SparklesIcon className="mr-[10px] h-5 w-5 text-[#b49bff]" />
        <h1 className="Welcome-text text-[13px]">
          C/C++ · Python · Java · 全栈
        </h1>
      </motion.div>

      <motion.div
        variants={slideInFromLeft(0.5)}
        className="mb-[15px] mt-[10px] text-center text-[30px] font-medium text-white"
      >
        用现代技术栈构建可靠系统
      </motion.div>

      <motion.div
        variants={slideInFromRight(0.5)}
        className="cursive mb-10 mt-[10px] text-center text-[20px] text-gray-200"
      >
        算法竞赛 · 物联网 · 人工智能
      </motion.div>
    </div>
  );
};
