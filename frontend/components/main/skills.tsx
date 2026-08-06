"use client";

import { useEffect, useState } from "react";
import { SkillDataProvider } from "@/components/sub/skill-data-provider";
import { SkillText } from "@/components/sub/skill-text";
import { motion } from "framer-motion";
import { CORE_LEVELS, SKILL_GROUPS, PROJECTS } from "@/constants";
import { fetchSkills, type ApiItem } from "@/lib/api";

// 熟练度条组件 - 支持悬停展示项目案例
const SkillLevelBar = ({ skill, index }: { skill: { title: string; level: number }; index: number }) => {
  const [hovered, setHovered] = useState(false);
  
  // 根据技能标题匹配相关项目
  const getRelatedProjects = () => {
    const skillLower = skill.title.toLowerCase();
    return PROJECTS.filter(project => {
      const tags = project.tags.map(t => t.toLowerCase());
      return tags.some(tag => 
        skillLower.includes(tag) || tag.includes(skillLower)
      );
    }).slice(0, 2);
  };
  
  const relatedProjects = getRelatedProjects();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
      className="relative rounded-xl border border-[#7042f861] bg-[#030014]/60 p-4 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mb-2 flex items-center justify-between text-sm text-gray-200">
        <span className="font-medium">{skill.title}</span>
        <span className="font-mono text-cyan-300">{skill.level}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${skill.level}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.05 + index * 0.03 }}
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
        />
      </div>
      
      {/* 悬停展示项目案例 */}
      {hovered && relatedProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-cyan-400/30 bg-[#0a0a1a]/95 p-3 shadow-xl backdrop-blur-sm"
        >
          <div className="mb-2 text-xs font-medium text-cyan-300">相关项目：</div>
          <div className="space-y-2">
            {relatedProjects.map((project, idx) => (
              <div key={idx} className="rounded-md bg-white/5 p-2">
                <div className="text-xs font-medium text-white">{project.title}</div>
                <div className="mt-1 text-xs text-gray-400 line-clamp-2">{project.description}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export const Skills = () => {
  const [levels, setLevels] = useState(CORE_LEVELS);

  useEffect(() => {
    fetchSkills().then((data) => {
      if (!data?.length) return;
      const mapped = data
        .filter((s: ApiItem) => s.title)
        .map((s) => ({
          title: s.title,
          level: Math.min(100, Math.max(0, s.level || 0)),
        }))
        .sort((a, b) => b.level - a.level);
      if (mapped.length) setLevels(mapped);
    });
  }, []);

  return (
    <section
      id="skills"
      className="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden py-20"
    >
      <SkillText />

      {/* 技术栈图标 - 居中显示 */}
      <div className="relative z-[2] w-full flex flex-col items-center">
        {SKILL_GROUPS.map((group) => (
          <div key={group.title} className="w-full max-w-5xl px-4 mb-8 flex flex-col items-center">
            <div className="mb-4 text-center font-mono text-[11px] tracking-[0.35em] text-gray-500">
              {group.title}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {group.skills.map((skill, i) => (
                <SkillDataProvider
                  key={`${group.title}-${skill.skill_name}`}
                  src={skill.image}
                  name={skill.skill_name}
                  width={skill.width}
                  height={skill.height}
                  index={i}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 熟练度条 */}
      <div className="relative z-[2] mt-2 w-full max-w-4xl px-6">
        <div className="mb-4 text-center font-mono text-[11px] tracking-[0.35em] text-gray-500">
          熟练度
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {levels.map((s, i) => (
            <SkillLevelBar key={s.title} skill={s} index={i} />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-25">
        <video
          data-lazy-video
          className="h-auto w-full"
          playsInline
          loop
          muted
          preload="none"
        >
          <source src="/videos/skills-bg.webm" type="video/webm" />
        </video>
      </div>
    </section>
  );
};
