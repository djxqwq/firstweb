"use client";

import { useEffect } from "react";

/** Play looping section videos only while in viewport — cuts decode cost. */
export function LazyVideos() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLVideoElement>("video[data-lazy-video]")
    );
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            if (v.paused) void v.play().catch(() => {});
          } else if (!v.paused) {
            v.pause();
          }
        }
      },
      { rootMargin: "120px", threshold: 0.05 }
    );

    nodes.forEach((v) => io.observe(v));

    // also catch late-mounted videos
    const mo = new MutationObserver(() => {
      document.querySelectorAll<HTMLVideoElement>("video[data-lazy-video]").forEach((v) => {
        if (!(v as HTMLVideoElement & { __lazyObs?: boolean }).__lazyObs) {
          (v as HTMLVideoElement & { __lazyObs?: boolean }).__lazyObs = true;
          io.observe(v);
        }
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
