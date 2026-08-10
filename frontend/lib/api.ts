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
  body?: Record<string, unknown>;
  tags?: string[] | string;
  cover_url?: string;
  sort_order?: number;
  published?: boolean;
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

export type MyInfo = {
  ip: string;
  country: string;
  region: string;
  city: string;
  district?: string;
  isp: string;
  device: string;
  os: string;
  browser: string;
  ua: string;
};

export async function fetchMyInfo() {
  return getJson<MyInfo>("/api/visits/myinfo");
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

export async function fetchInternships() {
  return getJson<ApiItem[]>("/api/internships");
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

/**
 * 获取（必要时生成）浏览器本地访客 ID。
 *
 * 持久化策略：localStorage + Cookie 双写互备。
 * - localStorage 读取快，但浏览器可能在 7 天后自动回收（Safari ITP / Chrome 存储压力）
 * - Cookie 设 400 天过期，比 localStorage 更持久，作为备份恢复渠道
 * - 两者都清空时（换浏览器/无痕模式），后端按 IP+UA 指纹兜底聚合
 */
const VISITOR_KEY = "visitor_id_v1";
const VISITOR_COOKIE = "vid_v1";

function getCookie(name: string): string {
  try {
    const m = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)")
    );
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

function setCookie(name: string, value: string, days: number): void {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function generateUUID(): string {
  return (
    (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    // 1. 优先从 localStorage 读
    let id = localStorage.getItem(VISITOR_KEY);
    // 2. localStorage 没有则从 Cookie 恢复（localStorage 被浏览器回收但 Cookie 还在）
    if (!id) {
      id = getCookie(VISITOR_COOKIE);
      if (id) {
        // 恢复到 localStorage
        localStorage.setItem(VISITOR_KEY, id);
      }
    }
    // 3. 都没有才生成新 ID，双写到 localStorage + Cookie
    if (!id) {
      id = generateUUID();
      localStorage.setItem(VISITOR_KEY, id);
      setCookie(VISITOR_COOKIE, id, 400);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * 生成轻量浏览器指纹（UA + 屏幕 + 时区 + 语言）。
 * 不做强唯一标识，仅作为后端兜底：当 visitor_id 丢失时，
 * 后端可用 IP + 此指纹辅助判断是否同一人。
 */
export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  try {
    const parts = [
      navigator.userAgent,
      String(screen.width || 0) + "x" + String(screen.height || 0),
      String(screen.colorDepth || 0),
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      navigator.language || "",
      String(navigator.hardwareConcurrency || 0),
    ];
    return parts.join("|");
  } catch {
    return "";
  }
}

export function trackVisit(path = "/") {
  if (typeof window === "undefined") return;
  const currentId = getVisitorId();
  fetch(`${API_BASE}/api/visits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      referrer: document.referrer || "",
      device: /Mobile|Android|iPhone/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop",
      visitor_id: currentId,
      fingerprint: getFingerprint(),
    }),
  })
    .then((res) => res.json())
    .then((data: { visitor_id?: string }) => {
      // 后端指纹兜底可能返回与本地不同的 visitor_id（localStorage 被清的场景）
      // 同步到本地，下次访问就直接用正确的 ID
      if (data.visitor_id && data.visitor_id !== currentId) {
        try {
          localStorage.setItem(VISITOR_KEY, data.visitor_id);
          setCookie(VISITOR_COOKIE, data.visitor_id, 400);
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {});
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
  likes: number;
  liked: boolean;
  replies?: MessageItem[];
};

export type MessagePage = {
  items: MessageItem[];
  total: number;
  page: number;
  has_more: boolean;
};

export async function fetchMessages(page = 1, size = 10): Promise<MessagePage> {
  try {
    const res = await fetch(
      `${API_BASE}/api/messages?page=${page}&size=${size}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { items: [], total: 0, page: 1, has_more: false };
    return (await res.json()) as MessagePage;
  } catch {
    return { items: [], total: 0, page: 1, has_more: false };
  }
}

export async function likeMessage(id: number) {
  const res = await fetch(`${API_BASE}/api/messages/${id}/like`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("like failed");
  return (await res.json()) as {
    ok: boolean;
    liked: boolean;
    likes: number;
  };
}

export async function replyMessagePublic(
  parentId: number,
  name: string,
  content: string
) {
  const res = await fetch(`${API_BASE}/api/messages/${parentId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content }),
  });
  if (!res.ok) throw new Error("reply failed");
  return res.json();
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
