"use client";

import { HeroContent } from "@/components/sub/hero-content";
import { InteractiveBlackhole } from "@/components/main/interactive-blackhole";

export const Hero = () => {
  return (
    // z-[5]: blackhole top-[-340px] must paint above SnakeHub's opaque bg
    <div className="relative z-[5] flex h-full w-full flex-col">
      <InteractiveBlackhole />
      <HeroContent />
    </div>
  );
};
