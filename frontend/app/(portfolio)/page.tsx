"use client";

import { BootPreloader } from "@/components/main/boot-preloader";
import { Contact } from "@/components/main/contact";
import { Education } from "@/components/main/education";
import { Encryption } from "@/components/main/encryption";
import { FluidIntro } from "@/components/main/fluid-intro";
import { Hero } from "@/components/main/hero";
import { Honors } from "@/components/main/honors";
import { Internship } from "@/components/main/internship";
import { Projects } from "@/components/main/projects";
import { Skills } from "@/components/main/skills";
import { SnakeHub } from "@/components/main/snake-hub";
import { VisitTracker } from "@/components/main/visit-tracker";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const onScroll = () => {
      const intro = document.getElementById("intro");
      const sp = (window as unknown as { switchPage?: { switched: boolean } })
        .switchPage;
      if (!intro || !sp) return;
      sp.switched = intro.getBoundingClientRect().bottom < 80;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="h-full w-full snap-y snap-proximity">
      <BootPreloader />
      <VisitTracker />
      <FluidIntro />
      <SnakeHub />
      <div id="about-me" className="flex snap-start flex-col gap-16 md:gap-20">
        <Hero />
        <Skills />
        <Encryption />
        <Projects />
        <Education />
        <Internship />
        <Honors />
        <Contact />
      </div>
    </main>
  );
}
