"use client";

import { useEffect, useRef, useState } from "react";

const FLUID_CONFIG = {
  SIM_RESOLUTION: 96,
  DYE_RESOLUTION: 512,
  CAPTURE_RESOLUTION: 256,
  DENSITY_DISSIPATION: 1,
  VELOCITY_DISSIPATION: 0.2,
  PRESSURE: 0.7,
  PRESSURE_ITERATIONS: 12,
  CURL: 24,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 5000,
  SHADING: false,
  COLORFUL: true,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 30, g: 31, b: 33 },
  TRANSPARENT: false,
  BLOOM: false,
  BLOOM_ITERATIONS: 4,
  BLOOM_RESOLUTION: 128,
  BLOOM_INTENSITY: 0.3,
  BLOOM_THRESHOLD: 0.8,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: false,
  SUNRAYS_RESOLUTION: 96,
  SUNRAYS_WEIGHT: 0.8,
};

declare global {
  interface Window {
    config?: typeof FLUID_CONFIG;
    switchPage?: { switched: boolean };
    visibilityChangeEvent?: string;
    hiddenProperty?: string | null;
    initBackground?: () => void;
    rebindFluid?: () => void;
    pauseFluidLoop?: () => void;
    resumeFluidLoop?: () => void;
    __fluidHost?: HTMLCanvasElement;
    __fluidScript?: boolean;
    __fluidStop?: boolean;
  }
}

export function FluidIntro() {
  const [ready, setReady] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Persist one canvas across React StrictMode remounts
    let canvas = window.__fluidHost;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "background";
      canvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;display:block;";
      window.__fluidHost = canvas;
    }
    if (canvas.parentElement !== host) {
      host.innerHTML = "";
      host.appendChild(canvas);
    }

    window.config = FLUID_CONFIG;
    window.switchPage = { switched: false };
    window.hiddenProperty =
      "hidden" in document
        ? "hidden"
        : "webkitHidden" in document
          ? "webkitHidden"
          : "mozHidden" in document
            ? "mozHidden"
            : null;
    window.visibilityChangeEvent = (
      window.hiddenProperty || "hidden"
    ).replace(/hidden/i, "visibilitychange");

    const boot = () => {
      try {
        window.initBackground?.();
        window.rebindFluid?.();
      } catch {
        /* ignore */
      }
      setReady(true);
    };

    if (!window.__fluidScript) {
      window.__fluidScript = true;
      const script = document.createElement("script");
      script.src = `/effects/background.js?v=6`;
      script.onload = boot;
      script.onerror = () => setReady(true);
      document.body.appendChild(script);
    } else {
      boot();
    }

    const el = sectionRef.current;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 40) {
        if (window.switchPage) window.switchPage.switched = true;
        window.pauseFluidLoop?.();
        document.getElementById("hub")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    el?.addEventListener("wheel", onWheel, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
          if (window.switchPage) window.switchPage.switched = false;
          window.resumeFluidLoop?.();
        } else {
          if (window.switchPage) window.switchPage.switched = true;
          window.pauseFluidLoop?.();
        }
      },
      { threshold: [0, 0.2, 0.5] }
    );
    if (el) io.observe(el);

    return () => {
      el?.removeEventListener("wheel", onWheel);
      io.disconnect();
      window.pauseFluidLoop?.();
    };
  }, []);

  const goHub = () => {
    if (window.switchPage) window.switchPage.switched = true;
    window.pauseFluidLoop?.();
    document.getElementById("hub")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="intro"
      className="content-intro relative h-screen w-full snap-start overflow-hidden bg-[#1e1f21]"
    >
      <div className="content-inner absolute inset-0">
        <div ref={hostRef} className="absolute inset-0" />
      </div>
      <div
        className="shape-wrap pointer-events-none absolute inset-0 opacity-0"
        aria-hidden
      >
        <svg
          className="shape h-full w-full"
          viewBox="0 0 1440 800"
          preserveAspectRatio="none"
        >
          <path className="shape" fill="#030014" d="M0,0 H1440 V800 H0 Z" />
        </svg>
      </div>

      <div className="pointer-events-none relative z-[2] flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-light tracking-wide text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.35)] md:text-7xl">
          邓锦鑫
        </h1>
        <p
          className={`mt-4 text-sm tracking-[0.25em] text-white/70 transition duration-700 md:text-base ${
            ready ? "opacity-100" : "opacity-50"
          }`}
        >
          软件工程全栈开发者 · 算法竞赛爱好者
        </p>
        <button
          type="button"
          onClick={goHub}
          className="pointer-events-auto mt-10 cursor-pointer text-lg text-white transition hover:text-cyan-200"
        >
          进入
        </button>
        <button
          type="button"
          onClick={goHub}
          className="pointer-events-auto mt-8 flex flex-col items-center gap-1 text-white/60 hover:text-cyan-200"
          aria-label="向下滚动"
        >
          <span className="block h-3 w-3 animate-bounce rotate-45 border-b border-r border-current" />
          <span className="text-[11px] tracking-widest">继续下滑</span>
        </button>
      </div>
    </section>
  );
}
