"use client";

import { useEffect } from "react";
import { trackVisit } from "@/lib/api";

/** Fire-and-forget visit beacon */
export function VisitTracker() {
  useEffect(() => {
    trackVisit(window.location.pathname + window.location.hash);
  }, []);
  return null;
}
