"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { PublicData } from "@/components/universe/UniverseHub";

const VantaStarSky = dynamic(
  () => import("@/components/effects/VantaStarSky").then((m) => m.VantaStarSky),
  { ssr: false },
);

export function CosmosBackground({
  data,
  onHotspot,
  onMeteor,
}: {
  data: PublicData;
  onHotspot: (payload: { kind: string; id: string; label: string }) => void;
  onMeteor: () => void;
}) {
  const hotspots = useMemo(() => {
    const slots = [
      { x: "18%", y: "28%" },
      { x: "72%", y: "22%" },
      { x: "82%", y: "48%" },
      { x: "28%", y: "58%" },
      { x: "55%", y: "18%" },
      { x: "12%", y: "48%" },
      { x: "65%", y: "62%" },
    ];
    const list: Array<{ id: string; label: string; kind: string; x: string; y: string }> = [];
    data.projects.slice(0, 4).forEach((p, i) => {
      list.push({ id: p.id, label: p.title, kind: "project", ...slots[i]! });
    });
    data.honors.slice(0, 2).forEach((h, i) => {
      list.push({ id: h.id, label: h.title, kind: "honor", ...slots[4 + i]! });
    });
    list.push({
      id: "egg-terminal",
      label: "深空终端",
      kind: "egg",
      ...slots[6]!,
    });
    return list;
  }, [data]);

  return (
    <VantaStarSky
      className="absolute inset-0 h-full w-full"
      hotspots={hotspots}
      onHotspot={(h) => onHotspot({ kind: h.kind, id: h.id, label: h.label })}
      onMeteor={onMeteor}
    />
  );
}
