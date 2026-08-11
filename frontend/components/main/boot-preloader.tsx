"use client";

import { useEffect, useState } from "react";

/**
 * SystemBreach Preloader — real gate: animation + API data must both finish.
 * Instant opaque cover via #site-boot-gate in root layout (no static flash).
 * https://github.com/ItsWanheda/SystemBreach-Preloader
 */

type Props = {
  onDone?: () => void;
  dataReady?: boolean;
};

export function BootPreloader({ onDone, dataReady = false }: Props) {
  const [animDone, setAnimDone] = useState(false);
  const [showIframe, setShowIframe] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Same-session revisit: keep opaque gate until dataReady, skip long anim
    const already = sessionStorage.getItem("boot_done") === "1";
    if (already) {
      setShowIframe(false);
      setAnimDone(true);
      return;
    }

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "boot-done") setAnimDone(true);
    };
    const failSafe = window.setTimeout(() => setAnimDone(true), 12000);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(failSafe);
    };
  }, []);

  useEffect(() => {
    if (finished) return;
    if (!animDone || !dataReady) return;

    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem("boot_done", "1");
      } catch {
        /* ignore */
      }
      // Remove HTML-first gate
      document.documentElement.classList.remove("booting");
      document.getElementById("site-boot-gate")?.remove();
      setFinished(true);
      onDone?.();
    }, 180);
    return () => window.clearTimeout(t);
  }, [animDone, dataReady, finished, onDone]);

  if (finished) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030014]">
      {showIframe ? (
        <iframe
          title="System boot"
          src="/boot/index.html"
          className="h-full w-full border-0"
          allow="autoplay"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-cyan-200/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
          <p className="font-mono text-xs tracking-widest">LOADING DATA…</p>
        </div>
      )}
    </div>
  );
}
