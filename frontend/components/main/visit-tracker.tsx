"use client";

import { useEffect } from "react";
import { trackVisit } from "@/lib/api";

/** Fire-and-forget visit beacon — tracks initial load and hash/route changes */
export function VisitTracker() {
  useEffect(() => {
    const fire = () => trackVisit(window.location.pathname + window.location.hash);
    fire();
    // 也监听 hash 变化，确保切换锚点时也能记录
    window.addEventListener("hashchange", fire);
    return () => window.removeEventListener("hashchange", fire);
  }, []);
  return null;
}
