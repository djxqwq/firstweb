/**
 * Public API client — FastAPI backend
 * Falls back to local constants when API is offline.
 */
// 生产环境用相对路径（同源，由 nginx 反代）；开发环境回退到本地后端
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export type ApiProject = {
  id: number;
  title: string;
  summary: string;
  cover_url?: string;
  tags?: string[];
  body?: Record<string, unknown>;
  links?: { github?: string; demo?: string; docs?: string };
};

export type ApiItem = {
  id: number;
  title: string;
  summary: string;
  level?: number;
  links?: { related?: number[] } & Record<string, unknown>;
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchVisitStats() {
  return getJson<{ total: number; days: { day: string; count: number }[] }>(
    "/api/visits/stats"
  );
}

export async function fetchProjects() {
  return getJson<ApiProject[]>("/api/projects");
}

export async function fetchEducation() {
  return getJson<ApiItem[]>("/api/education");
}

export async function fetchHonors() {
  return getJson<ApiItem[]>("/api/honors");
}

export async function fetchSkills() {
  return getJson<ApiItem[]>("/api/skills");
}

export async function fetchProfile() {
  return getJson<Record<string, string>>("/api/profile");
}

export type PublicMusicTrack = {
  id?: string;
  title?: string;
  url?: string;
  src?: string;
};

export type PublicSettings = {
  site_title?: string;
  effects?: Record<string, boolean>;
  music?: {
    enabled?: boolean;
    volume?: number;
    tracks?: PublicMusicTrack[];
  };
  footer?: Record<string, string>;
};

export async function fetchPublicSettings() {
  return getJson<PublicSettings>("/api/settings/public");
}

export function resolveMediaUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/uploads/")) return `${API_BASE}${path}`;
  return path;
}

export function trackVisit(path = "/") {
  if (typeof window === "undefined") return;
  fetch(`${API_BASE}/api/visits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      referrer: document.referrer || "",
      device: /Mobile|Android|iPhone/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop",
    }),
  }).catch(() => {});
}

export async function sendMessage(name: string, content: string) {
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content }),
  });
  if (!res.ok) throw new Error("send failed");
  return res.json();
}

export type MessageItem = {
  id: number;
  name: string;
  content: string;
  is_admin: boolean;
  reply_to: number | null;
  created_at: string | null;
};

export async function fetchMessages(limit = 30): Promise<MessageItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/messages?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as MessageItem[];
  } catch {
    return [];
  }
}

export async function replyMessage(
  id: number,
  content: string,
  token: string
) {
  const res = await fetch(`${API_BASE}/api/admin/messages/${id}/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("reply failed");
  return res.json();
}

export { API_BASE };
