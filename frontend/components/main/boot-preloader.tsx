"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SystemBreach Preloader — 始终播放开场动画；进度条在数据就绪后再走完。
 * Instant opaque cover via #site-boot-gate in root layout (no static flash).
 * https://github.com/ItsWanheda/SystemBreach-Preloader
 */

type Props = {
  onDone?: () => void;
  dataReady?: boolean;
};

export function BootPreloader({ onDone, dataReady = false }: Props) {
  const [animDone, setAnimDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const revisitRef = useRef(false);
  const dataReadyRef = useRef(dataReady);
  dataReadyRef.current = dataReady;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      revisitRef.current = sessionStorage.getItem("boot_done") === "1";
    } catch {
      revisitRef.current = false;
    }

    const postToBoot = (msg: object) => {
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    };

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "boot-done") setAnimDone(true);
      if (e.data?.type === "boot-ready") {
        if (revisitRef.current) postToBoot({ type: "boot-fast" });
        if (dataReadyRef.current) postToBoot({ type: "boot-data-ready" });
      }
    };
    const failSafe = window.setTimeout(() => setAnimDone(true), 14000);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(failSafe);
    };
  }, []);

  // 数据就绪后通知 iframe，让进度条冲到 100%
  useEffect(() => {
    if (!dataReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "boot-data-ready" },
      "*"
    );
  }, [dataReady]);

  useEffect(() => {
    if (finished) return;
    if (!animDone || !dataReady) return;

    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem("boot_done", "1");
      } catch {
        /* ignore */
      }
      document.documentElement.classList.remove("booting");
      const gate = document.getElementById("site-boot-gate");
      if (gate) gate.setAttribute("data-done", "1");
      setFinished(true);
      onDone?.();
    }, 120);
    return () => window.clearTimeout(t);
  }, [animDone, dataReady, finished, onDone]);

  if (finished) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030014]">
      <iframe
        ref={iframeRef}
        title="System boot"
        src="/boot/index.html"
        className="h-full w-full border-0"
        allow="autoplay"
      />
    </div>
  );
}
