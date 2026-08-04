import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULTS: Record<string, string> = {
  fx_cursor: "true",
  fx_trail: "true",
  fx_click_burst: "true",
  fx_intensity: "1",
  bgm_enabled: "true",
  bgm_volume: "0.35",
  eggs_enabled: "true",
  leaderboard_enabled: "true",
  maintenance: "false",
  hero_tagline: "进入我的宇宙",
};

/** Public site settings (no secrets) */
export async function GET() {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: Object.keys(DEFAULTS) } },
    });
    const map = { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
    return NextResponse.json({ settings: map });
  } catch {
    return NextResponse.json({ settings: DEFAULTS });
  }
}
