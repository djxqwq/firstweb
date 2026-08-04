"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SiteSettings = {
  fx_cursor: string;
  fx_trail: string;
  fx_click_burst: string;
  fx_intensity: string;
  bgm_enabled: string;
  bgm_volume: string;
  eggs_enabled: string;
  leaderboard_enabled: string;
  maintenance: string;
  hero_tagline: string;
};

const defaults: SiteSettings = {
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

type Ctx = {
  settings: SiteSettings;
  on: (key: keyof SiteSettings) => boolean;
  refresh: () => void;
};

const SettingsContext = createContext<Ctx>({
  settings: defaults,
  on: () => true,
  refresh: () => undefined,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaults);

  const refresh = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => setSettings({ ...defaults, ...(j.settings || {}) }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      on: (key) => settings[key] !== "false",
      refresh,
    }),
    [settings, refresh],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SettingsContext);
}
