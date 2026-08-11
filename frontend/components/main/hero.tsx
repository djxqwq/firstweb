"use client";

import { HeroContent } from "@/components/sub/hero-content";
import { InteractiveBlackhole } from "@/components/main/interactive-blackhole";

export const Hero = () => {
  return (
    <section className="relative z-[2] flex min-h-[100svh] w-full flex-col overflow-hidden">
      <InteractiveBlackhole />
      <HeroContent />
    </section>
  );
};
