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
import {
  fetchEducation,
  fetchHonors,
  fetchInternships,
  fetchProfile,
  fetchProjects,
  fetchPublicSettings,
  fetchSkills,
} from "@/lib/api";
import { useEffect, useState } from "react";

export default function Home() {
  const [dataReady, setDataReady] = useState(false);
  const [entered, setEntered] = useState(false);

  // 预加载关键 API；单请求超时后仍放行，避免开场卡死
  useEffect(() => {
    let cancelled = false;
    const cap = window.setTimeout(() => {
      if (!cancelled) setDataReady(true);
    }, 7000);

    Promise.all([
      fetchProfile(),
      fetchPublicSettings(),
      fetchProjects(),
      fetchSkills(),
      fetchEducation(),
      fetchHonors(),
      fetchInternships(),
    ])
      .then(() => {
        if (!cancelled) setDataReady(true);
      })
      .catch(() => {
        if (!cancelled) setDataReady(true);
      })
      .finally(() => window.clearTimeout(cap));

    return () => {
      cancelled = true;
      window.clearTimeout(cap);
    };
  }, []);

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
      <BootPreloader dataReady={dataReady} onDone={() => setEntered(true)} />
      {/* 未进入前不挂载重页面，避免空白静态内容抢先露出 */}
      {entered ? (
        <>
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
        </>
      ) : null}
    </main>
  );
}
