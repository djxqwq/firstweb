"use client";

import { HeroContent } from "@/components/sub/hero-content";
import { InteractiveBlackhole } from "@/components/main/interactive-blackhole";

export const Hero = () => {
  return (
    <div className="relative flex h-full w-full flex-col">
      <InteractiveBlackhole />
      <HeroContent />
    </div>
  );
};
