"use client";

import Link from "next/link";
import {
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";

const TYPES = [
  { key: "project", label: "项目" },
  { key: "education", label: "教育" },
  { key: "internship", label: "实习" },
  { key: "honor", label: "荣誉" },
  { key: "skill", label: "技能" },
  { key: "profile", label: "个人信息" },
  { key: "message", label: "留言" },
] as const;

type ContentItem = {
  id: number;
  type: string;
  title: string;
  summary: string;
  level?: number;
  sort_order?: number;
  published?: boolean;
  cover_url?: string;
  tags?: string[] | string;
  links?: Record<string, string> | string;
  body?: Record<string, unknown>;
  created_at?: string | null;
};

type VisitItem = {
  id: number;
  ip: string;
  country: string;
  region: string;
  city: string;
  district?: string;
  isp: string;
  os: string;
  browser: string;
  ua: string;
  path: string;
  referrer: string;
  device: string;
  created_at: string | null;
};

type VisitorAgg = {
  visitor_id: string;
  ip_hash: string;
  note: string;
  count: number;
  first_at: string | null;
  last_at: string | null;
  last_ip: string;
  last_country: string;
  last_region: string;
  last_city: string;
  last_district?: string;
  last_isp: string;
  last_os: string;
  last_browser: string;
  last_device: string;
  last_path: string;
  last_referrer: string;
  last_ua: string;
  sub_visitor_count?: number;
};

type VisitStats = {
  total: number;
  unique?: number;
  today?: number;
  today_unique?: number;
  days: { day: string; count: number; unique?: number }[];
  devices?: Record<string, number>;
};

type LoginRecord = {
  id: number;
  username: string;
  ip_hash: string;
  ua: string;
  device: string;
  created_at: string | null;
};

type FormState = {
  id: number | null;
  title: string;
  summary: string;
  level: number;
  sort_order: number;
  published: boolean;
  cover_url: string;
  tags: string;
  links: string;
  detail: string;
};

const emptyForm = (): FormState => ({
  id: null,
  title: "",
  summary: "",
  level: 80,
  sort_order: 0,
  published: true,
  cover_url: "",
  tags: "",
  links: "",
  detail: "",
});

/* ---------- 访客信息友好化解析 ---------- */
function parseUA(ua: string): string {
  if (!ua) return "未知";
  let browser = "未知";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  let os = "未知";
  if (/Windows NT 10/.test(ua)) os = "Windows";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";
  return `${browser} · ${os}`;
}

function parseReferrer(ref: string): string {
  if (!ref) return "直接访问";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host.includes("google")) return "Google";
    if (host.includes("baidu")) return "百度";
    if (host.includes("bing")) return "Bing";
    if (host.includes("github")) return "GitHub";
    if (host.includes("723539")) return "本站";
    return host;
  } catch {
    return ref.slice(0, 28);
  }
}

function parsePath(path: string): string {
  if (!path || path === "/") return "首页";
  if (path.startsWith("/admin")) return "后台";
  if (path.startsWith("/#")) return `首页·${path.slice(2)}`;
  return path;
}

/** 统一拼地区：国家 · 省 · 市 · 区 */
function formatLocation(
  country?: string,
  region?: string,
  city?: string,
  district?: string
): string {
  return [country, region, city, district].filter(Boolean).join(" · ");
}

/** 本地日历日 YYYY-MM-DD（与后端 Asia/Shanghai 对齐，东八区） */
function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function heatCellColor(count: number, max: number): string {
  if (count <= 0) return "rgba(255,255,255,0.045)";
  const t = Math.min(1, count / Math.max(max, 1));
  // 越深人越多：浅青 → 深青紫
  const r = Math.round(34 + (88 - 34) * t);
  const g = Math.round(211 - 140 * t);
  const b = Math.round(238 - 40 * t);
  const a = 0.22 + t * 0.78;
  return `rgba(${r},${g},${b},${a})`;
}

function hashColor(hash: string): string {
  if (!hash) return "#888";
  const h = hash.slice(0, 6).padEnd(6, "0");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgb(${(r % 180) + 60}, ${(g % 180) + 60}, ${(b % 180) + 60})`;
}

function isRecent(iso: string | null, minutes = 5): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < minutes * 60 * 1000;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState("1075751918");
  const [pass, setPass] = useState("");
  const [type, setType] = useState<string>("project");
  const [tab, setTab] = useState<
    "contents" | "visits" | "messages" | "settings" | "logins"
  >("contents");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitQ, setVisitQ] = useState("");
  const [visitDevice, setVisitDevice] = useState("all");
  const [visitors, setVisitors] = useState<VisitorAgg[]>([]);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [visitorRecords, setVisitorRecords] = useState<VisitItem[]>([]);
  const [noteEditingIp, setNoteEditingIp] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [siteTitle, setSiteTitle] = useState("个人技术博客");
  const [uploading, setUploading] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [musicTracks, setMusicTracks] = useState<
    { id: string; title: string; url: string; cover?: string }[]
  >([]);
  const [musicUploading, setMusicUploading] = useState(false);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [projectOptions, setProjectOptions] = useState<
    { id: number; title: string }[]
  >([]);
  const [msgSort, setMsgSort] = useState<"newest" | "oldest" | "unreplied">(
    "unreplied"
  );
  const [msgSearch, setMsgSearch] = useState("");
  const [msgPage, setMsgPage] = useState(1);
  const [msgPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [groupByIp, setGroupByIp] = useState(false);
  const [visitDay, setVisitDay] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [heatTip, setHeatTip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [contentQ, setContentQ] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginQ, setLoginQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [msgBadge, setMsgBadge] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("admin_token") || "");
  }, []);

  // Toast 自动消失
  useEffect(() => {
    if (!okMsg) return;
    const t = setTimeout(() => setOkMsg(""), 2800);
    return () => clearTimeout(t);
  }, [okMsg]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4500);
    return () => clearTimeout(t);
  }, [error]);

  // 快捷键 1-5 切换 Tab
  useEffect(() => {
    if (!token) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, typeof tab> = {
        "1": "contents",
        "2": "visits",
        "3": "messages",
        "4": "logins",
        "5": "settings",
      };
      const next = map[e.key];
      if (next) {
        e.preventDefault();
        setTab(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [token]);

  const title = useMemo(
    () => TYPES.find((t) => t.key === type)?.label || type,
    [type]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    setToken("");
  }, []);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.set("username", user);
      body.set("password", pass);
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        setError("登录失败：检查用户名密码，并确认 API :8000 已启动");
        return;
      }
      const data = await res.json();
      localStorage.setItem("admin_token", data.access_token);
      setToken(data.access_token);
    } catch {
      setError("无法连接 API，请检查后端服务");
    } finally {
      setLoading(false);
    }
  };

  const loadContents = useCallback(async () => {
    if (!token) return;
    const q =
      tab === "messages" ? "message" : type === "message" ? "message" : type;
    const res = await fetch(`${API}/api/admin/contents?type=${q}`, {
      headers: authHeaders(token),
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      const data: ContentItem[] = await res.json();
      setItems(data);
      if (q === "message") {
        const replied = new Set(
          data
            .map((item) => (item.body as { reply_to?: number } | undefined)?.reply_to)
            .filter((id): id is number => typeof id === "number")
        );
        const unreplied = data.filter((item) => {
          const body = item.body as
            | { reply_to?: number; is_admin?: boolean }
            | undefined;
          if (body?.reply_to || body?.is_admin) return false;
          return !replied.has(item.id);
        }).length;
        setMsgBadge(unreplied);
      }
    }
  }, [token, type, tab, logout]);

  // 登录后预取留言角标 + 今日访客数（导航徽章）
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/admin/contents?type=message`, {
      headers: authHeaders(token),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ContentItem[]) => {
        if (!Array.isArray(data)) return;
        const replied = new Set(
          data
            .map((item) => (item.body as { reply_to?: number } | undefined)?.reply_to)
            .filter((id): id is number => typeof id === "number")
        );
        const unreplied = data.filter((item) => {
          const body = item.body as
            | { reply_to?: number; is_admin?: boolean }
            | undefined;
          if (body?.reply_to || body?.is_admin) return false;
          return !replied.has(item.id);
        }).length;
        setMsgBadge(unreplied);
      })
      .catch(() => {});
    fetch(`${API}/api/visits/stats?days=7`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, [token]);

  const loadVisits = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (groupByIp) params.set("group_by", "ip");
    if (visitDay) params.set("day", visitDay);
    const qs = params.toString();
    const [vRes, sRes] = await Promise.all([
      fetch(`${API}/api/admin/visitors${qs ? `?${qs}` : ""}`, {
        headers: authHeaders(token),
      }),
      fetch(`${API}/api/visits/stats?days=400`),
    ]);
    if (vRes.status === 401) {
      logout();
      return;
    }
    if (vRes.ok) setVisitors(await vRes.json());
    if (sRes.ok) setStats(await sRes.json());
  }, [token, logout, groupByIp, visitDay]);

  const loadVisitorRecords = useCallback(
    async (key: string) => {
      if (!token) return;
      setLoadingRecords(true);
      try {
        const res = await fetch(
          `${API}/api/admin/visitors/${encodeURIComponent(
            key
          )}/records?limit=500`,
          { headers: authHeaders(token) }
        );
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.ok) setVisitorRecords(await res.json());
      } finally {
        setLoadingRecords(false);
      }
    },
    [token, logout]
  );

  const saveNote = async (key: string) => {
    if (!token) return;
    const res = await fetch(
      `${API}/api/admin/visitors/${encodeURIComponent(key)}/note`,
      {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({ note: noteText }),
      }
    );
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      setNoteEditingIp(null);
      setVisitors((prev) =>
        prev.map((v) => {
          const computedKey = v.visitor_id || `hash:${v.ip_hash}`;
          return computedKey === key ? { ...v, note: noteText } : v;
        })
      );
      setOkMsg("备注已保存");
    }
  };

  const openVisitor = (key: string) => {
    setSelectedIp(selectedIp === key ? null : key);
    setVisitorRecords([]);
    if (selectedIp !== key) loadVisitorRecords(key);
  };

  const deleteVisitRecord = async (visitId: number) => {
    if (!token) return;
    if (!confirm("确认删除这条访问记录？（总访问数不会变）")) return;
    const res = await fetch(`${API}/api/admin/visits/${visitId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      // 从详情列表移除
      setVisitorRecords((prev) => prev.filter((r) => r.id !== visitId));
      // 更新聚合次数（-1，最少 0）；次数归零则从列表移除
      setVisitors((prev) => {
        const next = prev
          .map((v) =>
            v.visitor_id === selectedIp
              ? { ...v, count: Math.max(0, v.count - 1) }
              : v
          )
          .filter((v) => v.count > 0);
        return next;
      });
      setOkMsg("已删除该记录（总访问数不变）");
    }
  };

  const clearVisitorRecords = async (key: string) => {
    if (!token) return;
    if (
      !confirm(
        `确认清空该访客的全部访问记录？\n（总访问数不会变；备注会保留；该访客会从列表消失，直到再次访问）`
      )
    )
      return;
    const res = await fetch(
      `${API}/api/admin/visitors/${encodeURIComponent(key)}/records`,
      { method: "DELETE", headers: authHeaders(token) }
    );
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      setVisitorRecords([]);
      setVisitors((prev) => prev.filter((v) => v.visitor_id !== key));
      setSelectedIp(null);
      setOkMsg("已清空该访客所有记录（总访问数不变）");
    }
  };

  const loadLoginRecords = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/api/admin/login-records?limit=200`, {
      headers: authHeaders(token),
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) setLoginRecords(await res.json());
  }, [token, logout]);

  const clearLoginRecords = async () => {
    if (!confirm("确认清空所有登录记录？")) return;
    const res = await fetch(`${API}/api/admin/login-records`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      setLoginRecords([]);
      setOkMsg("登录记录已清空");
    }
  };

  const loadSettings = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/api/admin/settings`, {
      headers: authHeaders(token),
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      if (data.site_title) setSiteTitle(data.site_title);
      const m = data.music || {};
      setMusicEnabled(m.enabled !== false);
      setMusicVolume(
        typeof m.volume === "number" ? Math.max(0, Math.min(1, m.volume)) : 0.4
      );
      setMusicTracks(
        Array.isArray(m.tracks)
          ? m.tracks.map(
              (
                t: { id?: string; title?: string; url?: string; src?: string; cover?: string },
                i: number
              ) => ({
                id: t.id || `t-${i}`,
                title: t.title || `曲目 ${i + 1}`,
                url: t.url || t.src || "",
                cover: t.cover || "",
              })
            )
          : []
      );
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) return;
    if (tab === "visits") loadVisits();
    else if (tab === "settings") loadSettings();
    else if (tab === "logins") loadLoginRecords();
    else loadContents();
  }, [token, tab, type, loadContents, loadVisits, loadSettings, loadLoginRecords]);

  // profile 类型：自动加载已有个人信息进编辑模式（避免新增多条）
  useEffect(() => {
    if (
      type === "profile" &&
      tab === "contents" &&
      items.length > 0 &&
      !form.id
    ) {
      edit(items[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, items, tab]);

  // 访客 tab 实时轮询（30 秒自动刷新）
  useEffect(() => {
    if (tab !== "visits" || !token) return;
    const timer = setInterval(() => loadVisits(), 30000);
    return () => clearInterval(timer);
  }, [tab, token, loadVisits]);

  // 技能编辑时加载项目列表供关联选择
  useEffect(() => {
    if (type !== "skill" || tab !== "contents") return;
    fetch(`${API}/api/projects`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setProjectOptions(
            data.map((p: { id: number; title: string }) => ({
              id: p.id,
              title: p.title,
            }))
          );
        }
      })
      .catch(() => {});
  }, [type, tab, API]);

  // 技能关联项目：读取/切换 related ids
  const getRelatedIds = (): number[] => {
    try {
      const obj = form.links.trim() ? JSON.parse(form.links) : {};
      return Array.isArray(obj.related) ? obj.related : [];
    } catch {
      return [];
    }
  };
  const toggleRelated = (id: number) => {
    const current = getRelatedIds();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setForm({ ...form, links: JSON.stringify({ related: next }) });
  };

  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      if (visitDevice !== "all" && v.last_device !== visitDevice)
        return false;
      if (!visitQ.trim()) return true;
      const q = visitQ.toLowerCase();
      return (
        (v.last_ip || "").toLowerCase().includes(q) ||
        (v.ip_hash || "").toLowerCase().includes(q) ||
        (v.visitor_id || "").toLowerCase().includes(q) ||
        (v.note || "").toLowerCase().includes(q) ||
        (v.last_path || "").toLowerCase().includes(q) ||
        (v.last_ua || "").toLowerCase().includes(q) ||
        (v.last_country || "").toLowerCase().includes(q) ||
        (v.last_region || "").toLowerCase().includes(q) ||
        (v.last_city || "").toLowerCase().includes(q) ||
        (v.last_district || "").toLowerCase().includes(q) ||
        (v.last_isp || "").toLowerCase().includes(q) ||
        (v.last_os || "").toLowerCase().includes(q) ||
        (v.last_browser || "").toLowerCase().includes(q)
      );
    });
  }, [visitors, visitQ, visitDevice]);

  const filteredContents = useMemo(() => {
    if (!contentQ.trim()) return items;
    const q = contentQ.toLowerCase();
    return items.filter(
      (it) =>
        (it.title || "").toLowerCase().includes(q) ||
        (it.summary || "").toLowerCase().includes(q) ||
        String(it.id).includes(q)
    );
  }, [items, contentQ]);

  const filteredLogins = useMemo(() => {
    if (!loginQ.trim()) return loginRecords;
    const q = loginQ.toLowerCase();
    return loginRecords.filter(
      (r) =>
        (r.username || "").toLowerCase().includes(q) ||
        (r.ip_hash || "").toLowerCase().includes(q) ||
        (r.device || "").toLowerCase().includes(q) ||
        (r.ua || "").toLowerCase().includes(q)
    );
  }, [loginRecords, loginQ]);

  const calendarCells = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    // 周一为一周起点：Mon=0 … Sun=6
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dayMap = new Map(
      (stats?.days || []).map((d) => [
        String(d.day).slice(0, 10),
        { count: d.count, unique: d.unique ?? 0 },
      ])
    );
    const cells: {
      key: string;
      day: string | null;
      label: number | null;
      count: number;
      unique: number;
      inMonth: boolean;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];
    const todayStr = ymdLocal(new Date());
    for (let i = 0; i < startPad; i++) {
      cells.push({
        key: `pad-${i}`,
        day: null,
        label: null,
        count: 0,
        unique: 0,
        inMonth: false,
        isToday: false,
        isFuture: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const day = ymdLocal(new Date(y, m, d));
      const hit = dayMap.get(day);
      cells.push({
        key: day,
        day,
        label: d,
        count: hit?.count ?? 0,
        unique: hit?.unique ?? 0,
        inMonth: true,
        isToday: day === todayStr,
        isFuture: day > todayStr,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({
        key: `tail-${cells.length}`,
        day: null,
        label: null,
        count: 0,
        unique: 0,
        inMonth: false,
        isToday: false,
        isFuture: false,
      });
    }
    const monthMax = Math.max(
      1,
      ...cells.filter((c) => c.inMonth).map((c) => c.unique || c.count)
    );
    return { cells, monthMax };
  }, [calMonth, stats]);

  // 留言排序与过滤
  const sortedMessages = useMemo(() => {
    if (tab !== "messages") return items;
    // 找出所有已回复的主留言 id
    const repliedIds = new Set(
      items
        .filter((item) => {
          const body = item.body as { reply_to?: number } | undefined;
          return body?.reply_to;
        })
        .map((item) => (item.body as { reply_to?: number }).reply_to!)
    );
    let result = items.filter((item) => {
      const body = item.body as { reply_to?: number; is_admin?: boolean } | undefined;
      // 只显示主留言（非回复），回复在展开时查看
      if (body?.reply_to) return false;
      // 搜索过滤
      if (msgSearch.trim()) {
        const q = msgSearch.toLowerCase();
        if (
          !(item.title || "").toLowerCase().includes(q) &&
          !(item.summary || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    // 排序
    result = [...result].sort((a, b) => {
      if (msgSort === "newest") {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      }
      if (msgSort === "oldest") {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      }
      // unreplied: 未回复的排前面，然后按时间倒序
      const aReplied = repliedIds.has(a.id);
      const bReplied = repliedIds.has(b.id);
      if (aReplied !== bReplied) return aReplied ? 1 : -1;
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return result;
  }, [items, tab, msgSort, msgSearch]);

  // 留言分页
  const msgTotalPages = Math.max(
    1,
    Math.ceil(sortedMessages.length / msgPageSize)
  );
  const pagedMessages = useMemo(() => {
    if (tab !== "messages") return sortedMessages;
    const start = (msgPage - 1) * msgPageSize;
    return sortedMessages.slice(start, start + msgPageSize);
  }, [sortedMessages, tab, msgPage, msgPageSize]);

  // 搜索/排序变化时重置到第一页
  useEffect(() => {
    setMsgPage(1);
    setSelectedIds(new Set());
  }, [msgSearch, msgSort]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = pagedMessages.map((m) => m.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确认删除选中的 ${selectedIds.size} 条留言？（含回复和点赞）`))
      return;
    setBatchDeleting(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/admin/messages/batch-delete`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) {
        setError("批量删除失败");
        return;
      }
      const data = await res.json();
      setOkMsg(`已删除 ${data.deleted} 条留言`);
      setSelectedIds(new Set());
      loadContents();
    } catch {
      setError("批量删除失败：检查 API");
    } finally {
      setBatchDeleting(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      // 传旧封面 URL，后端保存新图后自动删除旧图以节省空间
      if (form.cover_url?.startsWith("/uploads/")) {
        fd.append("old_url", form.cover_url);
      }
      const res = await fetch(`${API}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        setError("上传失败");
        return;
      }
      const data = await res.json();
      const url = String(data.url || "");
      setForm((f) => ({
        ...f,
        cover_url: url.startsWith("http") ? url : url,
      }));
      setOkMsg(type === "profile" ? "头像已上传" : "封面已上传");
    } catch {
      setError("上传失败：检查 API");
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/api/admin/settings`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({
        site_title: siteTitle,
        effects: { fluid: true, snake: true, eggs: true },
        music: {
          enabled: musicEnabled,
          volume: musicVolume,
          tracks: musicTracks.filter((t) => t.url),
        },
      }),
    });
    if (res.status === 401) {
      logout();
      return;
    }
    if (!res.ok) {
      setError("设置保存失败");
      return;
    }
    setOkMsg("站点设置已保存（含音乐）");
  };

  const uploadMusic = async (file: File) => {
    if (!token) return;
    setMusicUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) {
        setError("音乐上传失败（仅支持 mp3/wav/ogg/m4a，≤15MB）");
        return;
      }
      const data = await res.json();
      const title = (file.name || "未命名").replace(/\.[^.]+$/, "");
      const newTrack = {
        id: `up-${Date.now()}`,
        title,
        url: data.url,
        cover: "",
      };
      const updatedTracks = [...musicTracks.filter((t) => t.url), newTrack];
      setMusicTracks(updatedTracks);
      setOkMsg(`已加入歌单：${title}，正在自动保存…`);
      // 自动保存到后端，避免刷新丢失
      const saveRes = await fetch(`${API}/api/admin/settings`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          site_title: siteTitle,
          effects: { fluid: true, snake: true, eggs: true },
          music: {
            enabled: musicEnabled,
            volume: musicVolume,
            tracks: updatedTracks,
          },
        }),
      });
      if (saveRes.ok) {
        setOkMsg(`已加入歌单：${title}，设置已自动保存`);
      } else {
        setError("音乐已上传但自动保存失败，请手动点击保存设置");
      }
    } catch {
      setError("上传失败：检查 API");
    } finally {
      setMusicUploading(false);
    }
  };

  const uploadTrackCover = async (trackId: string, file: File) => {
    if (!token) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        setError("封面上传失败");
        return;
      }
      const data = await res.json();
      const updatedTracks = musicTracks.map((t) =>
        t.id === trackId ? { ...t, cover: data.url } : t
      );
      setMusicTracks(updatedTracks);
      // 自动保存
      const saveRes = await fetch(`${API}/api/admin/settings`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          site_title: siteTitle,
          effects: { fluid: true, snake: true, eggs: true },
          music: {
            enabled: musicEnabled,
            volume: musicVolume,
            tracks: updatedTracks,
          },
        }),
      });
      if (saveRes.ok) setOkMsg("封面已更新并自动保存");
    } catch {
      setError("封面上传失败");
    }
  };

  const removeTrack = async (trackId: string) => {
    const track = musicTracks.find((t) => t.id === trackId);
    if (!track) return;
    // 删除后端音乐文件和封面文件
    try {
      await fetch(`${API}/api/admin/uploads/delete`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ url: track.url }),
      });
      if (track.cover) {
        await fetch(`${API}/api/admin/uploads/delete`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ url: track.cover }),
        });
      }
    } catch {
      // 文件删除失败不阻止前端删除
    }
    const updatedTracks = musicTracks.filter((t) => t.id !== trackId);
    setMusicTracks(updatedTracks);
    // 自动保存
    const saveRes = await fetch(`${API}/api/admin/settings`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({
        site_title: siteTitle,
        effects: { fluid: true, snake: true, eggs: true },
        music: {
          enabled: musicEnabled,
          volume: musicVolume,
          tracks: updatedTracks,
        },
      }),
    });
    if (saveRes.ok) setOkMsg("已删除曲目（含文件）并自动保存");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setOkMsg("");
    const tags = form.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    let links: Record<string, string> = {};
    try {
      links = form.links.trim() ? JSON.parse(form.links) : {};
    } catch {
      setError("links 需为 JSON，例如 {\"github\":\"https://...\"}");
      return;
    }
    const payload = {
      type: tab === "messages" ? "message" : type,
      title: form.title,
      summary: form.summary,
      level: Number(form.level) || 0,
      sort_order: Number(form.sort_order) || 0,
      published: tab === "messages" ? true : !!form.published,
      cover_url: form.cover_url || "",
      body_json:
        tab === "messages"
          ? { is_admin: true }
          : type === "profile"
            ? { name: form.title, bio: form.summary }
            : form.detail
              ? { detail: form.detail }
              : {},
      tags_json: tags,
      links_json: links,
    };
    const url = form.id
      ? `${API}/api/admin/contents/${form.id}`
      : `${API}/api/admin/contents`;
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("保存失败");
        return;
      }
      setOkMsg(form.id ? "已更新并保存" : "已新建并保存");
      if (!form.id || tab === "messages") setForm(emptyForm());
      if (tab === "messages") setComposerOpen(false);
      loadContents();
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: ContentItem) => {
    const tags = Array.isArray(item.tags)
      ? item.tags.join(", ")
      : typeof item.tags === "string"
        ? item.tags
        : "";
    const links =
      item.links && typeof item.links === "object"
        ? JSON.stringify(item.links)
        : "";
    const detail =
      item.body && typeof item.body === "object" && "detail" in item.body
        ? String((item.body as { detail?: string }).detail || "")
        : "";
    setForm({
      id: item.id,
      title: item.title || "",
      summary: item.summary || "",
      level: item.level || 0,
      sort_order: item.sort_order || 0,
      published: !!item.published,
      cover_url: item.cover_url || "",
      tags,
      links,
      detail,
    });
  };

  const remove = async (id: number) => {
    if (!confirm("确认删除？")) return;
    const res = await fetch(`${API}/api/admin/contents/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (res.status === 401) logout();
    loadContents();
  };

  const submitReply = async (id: number) => {
    if (!replyText.trim() || !token) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/admin/messages/${id}/reply`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ content: replyText }),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) {
        setError("回复失败");
        return;
      }
      setReplyText("");
      setReplyingTo(null);
      setOkMsg("已回复，前台留言墙可见");
      loadContents();
    } catch {
      setError("回复失败：检查 API");
    }
  };

  const exportVisits = async () => {
    const res = await fetch(`${API}/api/admin/visits/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError("导出失败");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visits.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!token) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={login}
          className="admin-card w-full max-w-md space-y-5 p-8 shadow-[0_0_60px_rgba(112,66,248,0.18)]"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={52}
              height={52}
              className="rounded-full ring-1 ring-white/15"
            />
            <div>
              <h1 className="text-2xl font-semibold text-white">管理后台</h1>
              <p className="text-sm text-gray-400">邓锦鑫 · 星空控制台</p>
            </div>
          </div>
          <label className="block">
            <span className="admin-field-label">用户名</span>
            <input
              className="admin-input"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="用户名"
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="admin-field-label">密码</span>
            <div className="relative">
              <input
                className="admin-input pr-16"
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="密码"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] text-gray-400 hover:text-cyan-200"
              >
                {showPass ? "隐藏" : "显示"}
              </button>
            </div>
          </label>
          {error && <p className="text-sm text-amber-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="admin-btn admin-btn-primary w-full py-3 text-sm font-medium"
          >
            {loading ? "登录中…" : "进入控制台"}
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-cyan-300/90 hover:text-cyan-200"
          >
            ← 返回站点
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell px-4 pb-12 pt-4 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="sticky top-0 z-40 -mx-4 space-y-3 border-b border-white/5 bg-[#05020f]/85 px-4 py-3 backdrop-blur-md md:mx-0 md:rounded-2xl md:border md:border-violet-500/25 md:bg-[#0a0618]/92 md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt=""
                width={36}
                height={36}
                className="rounded-full ring-1 ring-white/10"
              />
              <div>
                <h1 className="text-lg font-semibold text-white md:text-xl">
                  星空管理台
                </h1>
                <p className="text-[11px] text-gray-500">
                  快捷键 1–5 切换分区 · Esc 无焦点时可用
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="admin-btn admin-btn-ghost text-xs">
                查看站点
              </Link>
              <button
                type="button"
                onClick={logout}
                className="admin-btn admin-btn-danger text-xs"
              >
                退出
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["contents", "内容", null],
                ["visits", "访客", stats?.today_unique ?? stats?.today ?? null],
                ["messages", "留言", msgBadge || null],
                ["logins", "登录", null],
                ["settings", "设置", null],
              ] as const
            ).map(([k, label, badge], idx) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                title={`快捷键 ${idx + 1}`}
                className={`admin-tab ${
                  tab === k ? "admin-tab-active" : "admin-tab-idle"
                }`}
              >
                <span className="mr-1 hidden text-[10px] opacity-40 sm:inline">
                  {idx + 1}
                </span>
                {label}
                {typeof badge === "number" && badge > 0 && (
                  <span className="admin-badge">{badge > 99 ? "99+" : badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {(error || okMsg) && (
          <div
            className={`admin-toast ${
              error ? "admin-toast-err" : "admin-toast-ok"
            }`}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <span>{error || okMsg}</span>
              <button
                type="button"
                className="text-xs opacity-70 hover:opacity-100"
                onClick={() => {
                  setError("");
                  setOkMsg("");
                }}
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {tab === "visits" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-cyan-500/20 bg-[#0a0618] p-4">
                <div className="text-[10px] tracking-widest text-cyan-400/80">
                  总访问
                </div>
                <div className="mt-1.5 text-2xl font-semibold text-white">
                  {stats?.total?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-[#0a0618] p-4">
                <div className="text-[10px] tracking-widest text-violet-300/80">
                  独立访客
                </div>
                <div className="mt-1.5 text-2xl font-semibold text-white">
                  {stats?.unique?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-pink-500/20 bg-[#0a0618] p-4">
                <div className="text-[10px] tracking-widest text-pink-300/80">
                  今日
                </div>
                <div className="mt-1.5 text-2xl font-semibold text-white">
                  {(stats?.today_unique ?? stats?.today ?? 0).toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    人 / {stats?.today ?? 0} 次
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-[#0a0618] p-4">
                <div className="text-[10px] tracking-widest text-emerald-300/80">
                  Desktop
                </div>
                <div className="mt-1.5 text-2xl font-semibold text-white">
                  {stats?.devices?.desktop?.toLocaleString() ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-[#0a0618] p-4">
                <div className="text-[10px] tracking-widest text-amber-300/80">
                  Mobile
                </div>
                <div className="mt-1.5 text-2xl font-semibold text-white">
                  {stats?.devices?.mobile?.toLocaleString() ?? 0}
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl border border-violet-500/20 bg-[#0a0618] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs tracking-widest text-violet-300/80">
                    访客月历
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    颜色越深人数越多 · 悬停看详情 · 点击筛选当天访客
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCalMonth(
                        (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                      )
                    }
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:border-cyan-400/40"
                  >
                    ‹ 上月
                  </button>
                  <span className="min-w-[7.5rem] text-center text-sm text-white">
                    {calMonth.getFullYear()} 年 {calMonth.getMonth() + 1} 月
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCalMonth(
                        (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                      )
                    }
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:border-cyan-400/40"
                  >
                    下月 ›
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const n = new Date();
                      setCalMonth(new Date(n.getFullYear(), n.getMonth(), 1));
                    }}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-400 hover:text-cyan-200"
                  >
                    本月
                  </button>
                  <button
                    type="button"
                    onClick={exportVisits}
                    className="rounded-lg border border-cyan-400/40 px-3 py-1 text-xs text-cyan-200"
                  >
                    导出 CSV
                  </button>
                </div>
              </div>

              <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] text-gray-500">
                {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.cells.map((c) => {
                  if (!c.inMonth || !c.day) {
                    return (
                      <div
                        key={c.key}
                        className="aspect-square rounded-lg bg-transparent"
                      />
                    );
                  }
                  const intensity = c.unique || c.count;
                  const selected = visitDay === c.day;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      disabled={c.isFuture}
                      onClick={() => {
                        if (c.isFuture) return;
                        setSelectedIp(null);
                        setVisitorRecords([]);
                        setVisitDay((prev) =>
                          prev === c.day ? null : c.day
                        );
                      }}
                      onMouseEnter={(e) => {
                        const people = c.unique || c.count;
                        setHeatTip({
                          x: e.clientX,
                          y: e.clientY,
                          text: `${c.day} · ${people} 人 · ${c.count} 次`,
                        });
                      }}
                      onMouseMove={(e) => {
                        setHeatTip((t) =>
                          t
                            ? { ...t, x: e.clientX, y: e.clientY }
                            : t
                        );
                      }}
                      onMouseLeave={() => setHeatTip(null)}
                      className={`relative aspect-square rounded-lg border text-left transition ${
                        selected
                          ? "border-cyan-300 ring-2 ring-cyan-400/50"
                          : c.isToday
                            ? "border-pink-400/50"
                            : "border-white/5 hover:border-white/25"
                      } ${c.isFuture ? "cursor-default opacity-30" : "cursor-pointer"}`}
                      style={{
                        background: heatCellColor(
                          intensity,
                          calendarCells.monthMax
                        ),
                      }}
                    >
                      <span
                        className={`absolute left-1 top-1 text-[10px] ${
                          c.isToday ? "font-semibold text-pink-200" : "text-gray-300"
                        }`}
                      >
                        {c.label}
                      </span>
                      {intensity > 0 && (
                        <span className="absolute bottom-1 right-1 text-[9px] font-medium text-white/90">
                          {c.unique || c.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span>少</span>
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                    <span
                      key={t}
                      className="inline-block h-3 w-3 rounded-sm border border-white/10"
                      style={{
                        background: heatCellColor(
                          t * calendarCells.monthMax,
                          calendarCells.monthMax
                        ),
                      }}
                    />
                  ))}
                  <span>多</span>
                </div>
                {visitDay ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                      筛选 {visitDay}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisitDay(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      清除
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-600">
                    未筛选日期 · 显示全部访客
                  </span>
                )}
              </div>

              {heatTip && (
                <div
                  className="pointer-events-none fixed z-[80] rounded-lg border border-white/15 bg-[#120a24]/95 px-2.5 py-1.5 text-[11px] text-cyan-100 shadow-lg backdrop-blur"
                  style={{
                    left: heatTip.x + 12,
                    top: heatTip.y + 12,
                  }}
                >
                  {heatTip.text}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/40"
                placeholder="搜索 IP / 地区 / 备注 / 路径 / 运营商"
                value={visitQ}
                onChange={(e) => setVisitQ(e.target.value)}
              />
              <select
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                value={visitDevice}
                onChange={(e) => setVisitDevice(e.target.value)}
              >
                <option value="all">全部设备</option>
                <option value="desktop">desktop</option>
                <option value="mobile">mobile</option>
              </select>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={groupByIp}
                  onChange={(e) => setGroupByIp(e.target.checked)}
                  className="accent-cyan-400"
                />
                按 IP 合并
              </label>
              <span className="self-center text-xs text-gray-500">
                {filteredVisitors.length} / {visitors.length} 位访客
                {visitDay && (
                  <span className="ml-1 text-cyan-400/70">· {visitDay}</span>
                )}
                {groupByIp && (
                  <span className="ml-1 text-cyan-400/60">（IP 模式）</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => loadVisits()}
                className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10"
              >
                刷新
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0618]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3">访客 / 地区</th>
                    <th className="px-4 py-3">备注</th>
                    <th className="px-4 py-3">次数</th>
                    <th className="px-4 py-3">最后访问</th>
                    <th className="px-4 py-3">设备</th>
                    <th className="px-4 py-3">运营商</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitors.map((v) => {
                    // 聚合 key：优先 visitor_id，旧数据回退 hash:ip_hash
                    const vkey = v.visitor_id || `hash:${v.ip_hash}`;
                    const vc = hashColor(v.visitor_id || v.ip_hash);
                    const isOpen = selectedIp === vkey;
                    const recent = isRecent(v.last_at);
                    const regionText = formatLocation(
                      v.last_country,
                      v.last_region,
                      v.last_city,
                      v.last_district
                    );
                    return (
                      <Fragment key={vkey}>
                        <tr
                          className={`cursor-pointer border-b border-white/5 text-gray-300 transition hover:bg-white/[0.03] ${
                            isOpen ? "bg-cyan-500/[0.06]" : ""
                          } ${recent ? "bg-emerald-500/[0.05]" : ""}`}
                          onClick={() => openVisitor(vkey)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px]"
                                style={{
                                  color: vc,
                                  background: `${vc}1a`,
                                  border: `1px solid ${vc}40`,
                                }}
                                title={v.last_ip || v.ip_hash}
                              >
                                {v.last_ip || v.ip_hash.slice(0, 8) || "—"}
                                {recent && (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                )}
                              </span>
                              {regionText && (
                                <span className="text-[10px] text-gray-500">
                                  {regionText}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {noteEditingIp === vkey ? (
                              <span
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  value={noteText}
                                  onChange={(e) =>
                                    setNoteText(e.target.value)
                                  }
                                  className="w-32 rounded border border-cyan-400/40 bg-black/40 px-2 py-0.5 text-xs outline-none"
                                  placeholder="备注"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveNote(vkey)}
                                  className="text-cyan-300 hover:text-cyan-200"
                                >
                                  ✓
                                </button>
                              </span>
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNoteEditingIp(vkey);
                                  setNoteText(v.note || "");
                                }}
                                className="cursor-text hover:text-cyan-300"
                              >
                                {v.note || (
                                  <span className="text-gray-600">
                                    + 备注
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-200">
                              {v.count} 次
                            </span>
                            {groupByIp && (v.sub_visitor_count ?? 0) > 1 && (
                              <span className="ml-1 text-[10px] text-cyan-400/60">
                                ({v.sub_visitor_count} 个浏览器)
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                            {v.last_at
                              ? new Date(v.last_at).toLocaleString("zh-CN", {
                                  hour12: false,
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${
                                v.last_device === "mobile"
                                  ? "bg-amber-500/15 text-amber-200"
                                  : "bg-emerald-500/15 text-emerald-200"
                              }`}
                            >
                              {v.last_device || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {v.last_isp || "—"}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-black/30">
                            <td colSpan={6} className="px-4 py-4">
                              {/* 完整访客信息卡片 */}
                              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-cyan-400/20 bg-cyan-500/[0.04] p-3 text-xs sm:grid-cols-3">
                                <div>
                                  <span className="text-gray-500">IP：</span>
                                  <span className="font-mono text-cyan-200">
                                    {v.last_ip || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">地区：</span>
                                  <span className="text-gray-300">
                                    {formatLocation(
                                      v.last_country,
                                      v.last_region,
                                      v.last_city,
                                      v.last_district
                                    ) || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">来源：</span>
                                  <span className="text-gray-300">
                                    {parseReferrer(v.last_referrer || "")}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">最近页面：</span>
                                  <span className="text-gray-300">
                                    {parsePath(v.last_path || "")}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">运营商：</span>
                                  <span className="text-gray-300">
                                    {v.last_isp || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">设备：</span>
                                  <span className="text-gray-300">
                                    {v.last_device || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">系统：</span>
                                  <span className="text-gray-300">
                                    {v.last_os || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">浏览器：</span>
                                  <span className="text-gray-300">
                                    {v.last_browser || "—"}
                                  </span>
                                </div>
                                <div className="col-span-2 sm:col-span-3">
                                  <span className="text-gray-500">
                                    visitor_id：
                                  </span>
                                  {v.visitor_id ? (
                                    <span
                                      className="break-all font-mono text-[10px] text-emerald-300/80"
                                      title={v.visitor_id}
                                    >
                                      {v.visitor_id}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-600">
                                      —（旧记录，无永久标识）
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs text-cyan-300">
                                  访客的全部访问记录（{visitorRecords.length}{" "}
                                  条）
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-gray-600">
                                    首次：
                                    {v.first_at
                                      ? new Date(v.first_at).toLocaleString(
                                          "zh-CN",
                                          { hour12: false }
                                        )
                                      : "—"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => clearVisitorRecords(vkey)}
                                    className="rounded border border-rose-400/40 px-2 py-0.5 text-[10px] text-rose-300 hover:bg-rose-500/10"
                                  >
                                    清空全部
                                  </button>
                                </div>
                              </div>
                              {loadingRecords ? (
                                <div className="py-4 text-center text-xs text-gray-500">
                                  加载中…
                                </div>
                              ) : (
                                <div className="max-h-64 overflow-y-auto rounded-lg border border-white/5">
                                  <table className="min-w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-[#0a0618] text-gray-500">
                                      <tr>
                                        <th className="px-3 py-2">时间</th>
                                        <th className="px-3 py-2">IP / 地区</th>
                                        <th className="px-3 py-2">运营商</th>
                                        <th className="px-3 py-2">设备/系统/浏览器</th>
                                        <th className="px-3 py-2">UA</th>
                                        <th className="px-3 py-2 text-right">操作</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {visitorRecords.map((r) => (
                                        <tr
                                          key={r.id}
                                          className="border-b border-white/5 text-gray-400"
                                        >
                                          <td className="whitespace-nowrap px-3 py-1.5">
                                            {r.created_at
                                              ? new Date(
                                                  r.created_at
                                                ).toLocaleString("zh-CN", {
                                                  hour12: false,
                                                  month: "2-digit",
                                                  day: "2-digit",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "—"}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            <div className="flex flex-col">
                                              <span className="font-mono text-cyan-200">
                                                {r.ip || "—"}
                                              </span>
                                              <span className="text-[10px] text-gray-500">
                                                {[
                                                  r.country,
                                                  r.region,
                                                  r.city,
                                                  r.district,
                                                ]
                                                  .filter(Boolean)
                                                  .join(" · ") || "—"}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-1.5 text-gray-400">
                                            {r.isp || "—"}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            <div className="flex flex-col gap-0.5">
                                              <span>{r.device || "—"}</span>
                                              <span className="text-[10px] text-gray-500">
                                                {r.os || "—"} ·{" "}
                                                {r.browser || "—"}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="max-w-[200px] px-3 py-1.5">
                                            <span className="block truncate text-[10px] text-gray-500" title={r.ua || ""}>
                                              {r.ua || "—"}
                                            </span>
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-1.5 text-right">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                deleteVisitRecord(r.id)
                                              }
                                              className="rounded border border-rose-400/40 px-2 py-0.5 text-[10px] text-rose-300 hover:bg-rose-500/15"
                                            >
                                              删除
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                      {!visitorRecords.length && (
                                        <tr>
                                          <td
                                            colSpan={6}
                                            className="px-3 py-4 text-center text-gray-600"
                                          >
                                            无记录
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {!filteredVisitors.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        {visitDay
                          ? `${visitDay} 无访客记录`
                          : "无匹配访客"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "logins" && (
          <div className="space-y-4">
            <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm text-white">登录审计</div>
                <p className="text-[11px] text-gray-500">
                  共 {loginRecords.length} 条 · 筛选后 {filteredLogins.length} 条
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="admin-input min-w-[180px] max-w-xs py-1.5 text-sm"
                  placeholder="搜索账号 / IP / UA"
                  value={loginQ}
                  onChange={(e) => setLoginQ(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => loadLoginRecords()}
                  className="admin-btn admin-btn-ghost text-xs"
                >
                  刷新
                </button>
                <button
                  type="button"
                  onClick={clearLoginRecords}
                  className="admin-btn admin-btn-danger text-xs"
                >
                  清空记录
                </button>
              </div>
            </div>

            <div className="admin-card overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3">登录时间</th>
                    <th className="px-4 py-3">账号</th>
                    <th className="px-4 py-3">设备</th>
                    <th className="px-4 py-3">IP Hash</th>
                    <th className="px-4 py-3">UA</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogins.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 text-gray-300 transition hover:bg-white/[0.03]"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString("zh-CN", {
                              hour12: false,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-cyan-300/80">
                        {r.username}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            r.device === "mobile"
                              ? "bg-amber-500/15 text-amber-200"
                              : "bg-emerald-500/15 text-emerald-200"
                          }`}
                        >
                          {r.device || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-cyan-300/80">
                        {r.ip_hash}
                      </td>
                      <td
                        className="max-w-[280px] truncate px-4 py-2.5 text-xs text-gray-500"
                        title={r.ua}
                      >
                        {r.ua}
                      </td>
                    </tr>
                  ))}
                  {!filteredLogins.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        {loginRecords.length
                          ? "无匹配记录"
                          : "暂无登录记录"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <form
            onSubmit={saveSettings}
            className="mx-auto max-w-3xl space-y-5"
          >
            <div className="admin-card space-y-4 p-6">
              <div>
                <h2 className="text-lg text-white">站点设置</h2>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  修改后点底部保存；音乐上传会自动保存
                </p>
              </div>
              <label className="block">
                <span className="admin-field-label">站点标题</span>
                <input
                  className="admin-input"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                />
              </label>
            </div>

            <div className="admin-card space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm text-violet-100">背景音乐</h3>
                  <p className="text-[11px] text-gray-500">
                    上传 mp3/wav/ogg/m4a，≤15MB
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={musicEnabled}
                    onChange={(e) => setMusicEnabled(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  启用播放器
                </label>
              </div>

              <label className="block">
                <span className="admin-field-label">
                  默认音量 {Math.round(musicVolume * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                  className="mt-1 w-full accent-cyan-400"
                />
              </label>

              <div className="space-y-2">
                {musicTracks.length === 0 && (
                  <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-gray-600">
                    暂无自定义曲目，主页会用内置氛围音
                  </p>
                )}
                {musicTracks.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2 py-2"
                  >
                    <label className="group/cover relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
                      {t.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            t.cover.startsWith("/uploads/")
                              ? `${API}${t.cover}`
                              : t.cover
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-600">封面</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadTrackCover(t.id, f);
                          e.target.value = "";
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[9px] text-white opacity-0 transition group-hover/cover:opacity-100">
                        换
                      </span>
                    </label>
                    <input
                      className="min-w-0 flex-1 rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/40"
                      value={t.title}
                      onChange={(e) =>
                        setMusicTracks((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, title: e.target.value } : x
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeTrack(t.id)}
                      className="admin-btn admin-btn-danger px-2 py-1 text-xs"
                    >
                      删
                    </button>
                  </div>
                ))}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-cyan-200/80">
                <span className="admin-btn admin-btn-ghost">
                  {musicUploading ? "上传中…" : "上传音乐文件"}
                </span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a"
                  className="hidden"
                  disabled={musicUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMusic(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="admin-sticky-actions justify-between">
              <p className="self-center text-[11px] text-gray-500">
                流体 / 贪吃蛇效果默认开启
              </p>
              <button
                type="submit"
                className="admin-btn admin-btn-primary px-5 py-2 text-sm"
              >
                保存设置
              </button>
            </div>
          </form>
        )}

        {(tab === "contents" || tab === "messages") && (
          <div
            className={
              tab === "messages"
                ? "space-y-4"
                : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
            }
          >
            {tab === "contents" && (
            <div className="admin-card space-y-4 p-5">
              <div className="sticky top-[4.5rem] z-10 -mx-1 flex flex-wrap gap-2 bg-[#0a0618]/95 px-1 py-2 backdrop-blur">
                  {TYPES.filter((t) => t.key !== "message").map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setType(t.key);
                        setForm(emptyForm());
                        setContentQ("");
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        type === t.key
                          ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/50"
                          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

              <form onSubmit={save} className="space-y-3">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg text-white">
                      {form.id ? "编辑" : "新增"} · {title}
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      {form.id ? `正在编辑 #${form.id}` : "填写后点底部保存"}
                    </p>
                  </div>
                  {form.id && (
                    <button
                      type="button"
                      onClick={() => setForm(emptyForm())}
                      className="admin-btn admin-btn-ghost text-xs"
                    >
                      取消编辑
                    </button>
                  )}
                </div>
                <label className="block">
                  <span className="admin-field-label">
                    {type === "internship"
                      ? "公司名称"
                      : type === "profile"
                        ? "姓名"
                        : "标题"}
                  </span>
                <input
                  className="admin-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={
                    type === "internship"
                      ? "公司名称，如：字节跳动"
                      : type === "profile"
                        ? "姓名"
                        : "标题"
                  }
                  required
                />
                </label>
                <label className="block">
                  <span className="admin-field-label">
                    {type === "internship" ? "时间段 · 职位" : "简介 / 摘要"}
                  </span>
                <textarea
                  className="admin-input min-h-[90px]"
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  placeholder={
                    type === "internship"
                      ? "时间段 · 职位，如：2024-06 ~ 2024-09 · 后端开发实习生"
                      : "简介 / 摘要"
                  }
                />
                </label>
                {(type === "project" || type === "profile" || type === "internship") && (
                  <>
                    {(type === "project" || type === "internship") && (
                      <>
                    <label className="block">
                      <span className="admin-field-label">详情</span>
                    <textarea
                      className="admin-input min-h-[80px]"
                      value={form.detail}
                      onChange={(e) =>
                        setForm({ ...form, detail: e.target.value })
                      }
                      placeholder={
                        type === "internship"
                          ? "实习描述（工作内容、成果等）"
                          : "详情介绍（弹窗长文）"
                      }
                    />
                    </label>
                    <label className="block">
                      <span className="admin-field-label">标签</span>
                    <input
                      className="admin-input"
                      value={form.tags}
                      onChange={(e) =>
                        setForm({ ...form, tags: e.target.value })
                      }
                      placeholder={
                        type === "internship"
                          ? "技术栈，逗号分隔：Spring Boot, MySQL, Redis"
                          : "标签，逗号分隔：Uniapp, Python"
                      }
                    />
                    </label>
                    {type === "project" && (
                    <label className="block">
                      <span className="admin-field-label">链接 JSON</span>
                    <input
                      className="admin-input font-mono text-sm"
                      value={form.links}
                      onChange={(e) =>
                        setForm({ ...form, links: e.target.value })
                      }
                      placeholder='{"github":"...","demo":"..."}'
                    />
                    </label>
                    )}
                      </>
                    )}
                    {(type === "project" || type === "profile") && (
                    <label className="block">
                      <span className="admin-field-label">
                        {type === "profile" ? "头像 URL" : "封面 URL"}
                      </span>
                    <input
                      className="admin-input"
                      value={form.cover_url}
                      onChange={(e) =>
                        setForm({ ...form, cover_url: e.target.value })
                      }
                      placeholder={
                        type === "profile"
                          ? "头像 URL"
                          : "项目封面 URL"
                      }
                    />
                    </label>
                    )}
                    {form.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          form.cover_url.startsWith("http")
                            ? form.cover_url
                            : form.cover_url.startsWith("/uploads")
                              ? `${API}${form.cover_url}`
                              : form.cover_url
                        }
                        alt="preview"
                        className={`border border-white/10 object-cover ${
                          type === "profile"
                            ? "h-20 w-20 rounded-full"
                            : "h-28 w-full max-w-xs rounded-xl"
                        }`}
                      />
                    )}
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                      <span className="admin-btn admin-btn-ghost">
                        {uploading
                          ? "上传中…"
                          : type === "profile"
                            ? "上传头像"
                            : "上传封面图片"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadCover(f);
                        }}
                      />
                    </label>
                  </>
                )}
                {type === "skill" && (
                  <>
                    <label className="block">
                      <span className="admin-field-label">熟练度 0–100</span>
                    <input
                      type="number"
                      className="admin-input"
                      value={form.level}
                      onChange={(e) =>
                        setForm({ ...form, level: Number(e.target.value) })
                      }
                      placeholder="熟练度 0-100"
                    />
                    </label>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 text-xs text-gray-400">
                        关联项目（前台 hover 技能时展示，可多选）
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {projectOptions.map((p) => {
                          const checked = getRelatedIds().includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleRelated(p.id)}
                              className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                                checked
                                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                                  : "border-white/10 text-gray-400 hover:border-white/30"
                              }`}
                            >
                              {checked ? "✓ " : ""}
                              {p.title}
                            </button>
                          );
                        })}
                        {projectOptions.length === 0 && (
                          <span className="text-xs text-gray-600">
                            暂无项目，请先在「项目」类型下添加
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="admin-field-label">排序（越大越靠前）</span>
                <input
                  type="number"
                  className="admin-input"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) })
                  }
                  placeholder="排序"
                />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm({ ...form, published: e.target.checked })
                    }
                    className="accent-cyan-400"
                  />
                  发布到前台
                </label>
                </div>
                <div className="admin-sticky-actions">
                  <button
                    type="submit"
                    disabled={saving}
                    className="admin-btn admin-btn-primary px-5 py-2 text-sm"
                  >
                    {saving ? "保存中…" : form.id ? "保存修改" : "创建并保存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm())}
                    className="admin-btn admin-btn-ghost px-5 py-2 text-sm"
                  >
                    清空表单
                  </button>
                </div>
              </form>
            </div>
            )}

            <div className="admin-card p-5">
              {tab === "messages" && (
                <div className="mb-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg text-white">留言墙</h2>
                      <p className="text-[11px] text-gray-500">
                        未回复优先 · 支持批量删除 · 角标显示待回复数
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComposerOpen((v) => !v)}
                      className="admin-btn admin-btn-ghost text-xs"
                    >
                      {composerOpen ? "收起发帖" : "以博主身份发帖"}
                    </button>
                  </div>
                  {composerOpen && (
                    <form
                      onSubmit={save}
                      className="space-y-2 rounded-xl border border-purple-400/25 bg-purple-500/5 p-3"
                    >
                      <input
                        className="admin-input"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        placeholder="昵称（显示为博主）"
                        required
                      />
                      <textarea
                        className="admin-input min-h-[70px]"
                        value={form.summary}
                        onChange={(e) =>
                          setForm({ ...form, summary: e.target.value })
                        }
                        placeholder="留言内容"
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="admin-btn admin-btn-primary text-xs"
                          onClick={() => {
                            // force message type via tab already messages
                          }}
                        >
                          {saving ? "发布中…" : "发布"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm(emptyForm());
                            setComposerOpen(false);
                          }}
                          className="admin-btn admin-btn-ghost text-xs"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                {tab === "contents" && (
                  <h2 className="text-lg text-white">内容列表</h2>
                )}
                {tab === "contents" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="admin-input min-w-[160px] py-1.5 text-sm"
                      placeholder="搜索标题 / 摘要 / ID"
                      value={contentQ}
                      onChange={(e) => setContentQ(e.target.value)}
                    />
                    <span className="text-xs text-gray-500">
                      {filteredContents.length} / {items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(emptyForm());
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="admin-btn admin-btn-ghost text-xs"
                    >
                      + 新建
                    </button>
                  </div>
                )}
                {tab === "messages" && (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <input
                      className="admin-input min-w-[140px] flex-1 py-1.5 text-sm"
                      placeholder="搜索留言…"
                      value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                    />
                    <select
                      className="admin-input w-auto py-1.5 text-sm"
                      value={msgSort}
                      onChange={(e) =>
                        setMsgSort(e.target.value as "newest" | "oldest" | "unreplied")
                      }
                    >
                      <option value="unreplied">未回复优先</option>
                      <option value="newest">最新优先</option>
                      <option value="oldest">最早优先</option>
                    </select>
                    <span className="text-xs text-gray-500">
                      {sortedMessages.length} 条
                      {msgBadge > 0 && (
                        <span className="ml-1 text-rose-300">
                          · {msgBadge} 待回复
                        </span>
                      )}
                    </span>
                    {selectedIds.size > 0 && (
                      <button
                        type="button"
                        onClick={batchDelete}
                        disabled={batchDeleting}
                        className="admin-btn admin-btn-danger text-xs"
                      >
                        {batchDeleting
                          ? "删除中…"
                          : `批量删除(${selectedIds.size})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {tab === "messages" && sortedMessages.length > 0 && (
                  <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                      <input
                        type="checkbox"
                        checked={
                          pagedMessages.length > 0 &&
                          pagedMessages.every((m) => selectedIds.has(m.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer rounded border-white/20 bg-black/40 accent-cyan-500"
                      />
                      全选本页
                    </label>
                    {selectedIds.size > 0 && (
                      <span className="text-xs text-cyan-300">
                        已选 {selectedIds.size} 条
                      </span>
                    )}
                  </div>
                )}
                {(tab === "messages" ? pagedMessages : filteredContents).map((item) => {
                  const body = item.body as {
                    reply_to?: number;
                    is_admin?: boolean;
                  } | undefined;
                  // 留言 tab 下找出该主留言的回复
                  const replies =
                    tab === "messages" && !body?.reply_to
                      ? items.filter(
                          (i) =>
                            (i.body as { reply_to?: number } | undefined)
                              ?.reply_to === item.id
                        )
                      : [];
                  const unreplied =
                    tab === "messages" &&
                    !body?.reply_to &&
                    !body?.is_admin &&
                    replies.length === 0;
                  const coverSrc = item.cover_url
                    ? item.cover_url.startsWith("http")
                      ? item.cover_url
                      : item.cover_url.startsWith("/uploads")
                        ? `${API}${item.cover_url}`
                        : item.cover_url
                    : "";
                  return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition ${
                      body?.is_admin
                        ? "border-purple-500/30 bg-purple-500/5"
                        : unreplied
                          ? "border-rose-400/25 bg-rose-500/[0.04]"
                        : "border-white/10 bg-black/30"
                    } ${selectedIds.has(item.id) ? "ring-1 ring-cyan-400/30" : ""} ${
                      form.id === item.id && tab === "contents"
                        ? "ring-1 ring-violet-400/40"
                        : ""
                    } ${tab === "contents" ? "cursor-pointer hover:border-white/20" : ""}`}
                    onClick={
                      tab === "contents"
                        ? () => {
                            edit(item);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {tab === "messages" && !body?.reply_to && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-black/40 accent-cyan-500"
                          />
                        )}
                        {tab === "contents" && coverSrc && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverSrc}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white">
                            {item.title || "(无标题)"}
                          </span>
                          {body?.is_admin && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300">
                              博主
                            </span>
                          )}
                          {unreplied && (
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                              待回复
                            </span>
                          )}
                          {tab === "contents" && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] ${
                                item.published
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-white/10 text-gray-400"
                              }`}
                            >
                              {item.published ? "已发布" : "草稿"}
                            </span>
                          )}
                          {tab === "messages" && item.created_at && (
                            <span className="text-[10px] text-gray-600">
                              {new Date(item.created_at).toLocaleString("zh-CN")}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                          {item.summary}
                        </p>
                        <div className="mt-2 text-[11px] text-gray-500">
                          #{item.id}
                          {tab !== "messages" && (
                            <> · sort {item.sort_order}</>
                          )}
                          {item.type === "skill" &&
                          typeof item.level === "number" &&
                          item.level > 0
                            ? ` · 熟练度 ${item.level}%`
                            : ""}
                          {tab === "messages" &&
                            !body?.reply_to &&
                            replies.length > 0 &&
                            ` · 已回复 ${replies.length} 条`}
                        </div>
                      </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {tab === "messages" && !body?.reply_to && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(
                                replyingTo === item.id ? null : item.id
                              );
                              setReplyText("");
                            }}
                            className="admin-btn admin-btn-ghost text-xs"
                          >
                            {replyingTo === item.id ? "取消" : "回复"}
                          </button>
                        )}
                        {tab === "contents" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            edit(item);
                          }}
                          className="admin-btn admin-btn-ghost text-xs"
                        >
                          编辑
                        </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(item.id);
                          }}
                          className="admin-btn admin-btn-danger text-xs"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    {/* 显示已有回复 */}
                    {tab === "messages" && replies.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-purple-500/30 pl-3">
                        {replies.map((rep) => {
                          const repBody = rep.body as { is_admin?: boolean } | undefined;
                          return (
                          <div key={rep.id} className="text-sm">
                            <span className={repBody?.is_admin ? "text-purple-300" : "text-cyan-300"}>
                              {repBody?.is_admin ? "博主" : rep.title || "访客"}：
                            </span>
                            <span className="text-gray-300">{rep.summary}</span>
                            {rep.created_at && (
                              <span className="ml-2 text-[10px] text-gray-600">
                                {new Date(rep.created_at).toLocaleString("zh-CN")}
                              </span>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                    {tab === "messages" && replyingTo === item.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="以博主身份回复…"
                          className="admin-input min-w-0 flex-1 py-1.5 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submitReply(item.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => submitReply(item.id)}
                          className="admin-btn admin-btn-primary text-xs"
                        >
                          发送
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
                {(tab === "messages"
                  ? sortedMessages.length === 0
                  : filteredContents.length === 0) && (
                  <p className="py-10 text-center text-sm text-gray-500">
                    {tab === "contents" && contentQ
                      ? "无匹配内容"
                      : tab === "messages" && msgSearch
                        ? "无匹配留言"
                        : "暂无数据"}
                  </p>
                )}
                {/* 留言分页 */}
                {tab === "messages" && msgTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setMsgPage((p) => Math.max(1, p - 1))}
                      disabled={msgPage === 1}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 disabled:opacity-30"
                    >
                      上一页
                    </button>
                    {Array.from({ length: msgTotalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === msgTotalPages ||
                          Math.abs(p - msgPage) <= 1
                      )
                      .map((p, idx, arr) => (
                        <span key={p} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="px-1 text-gray-600">…</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setMsgPage(p)}
                            className={`h-7 w-7 rounded-lg text-xs transition ${
                              p === msgPage
                                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40"
                                : "text-gray-400 hover:bg-white/5"
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button
                      type="button"
                      onClick={() =>
                        setMsgPage((p) => Math.min(msgTotalPages, p + 1))
                      }
                      disabled={msgPage === msgTotalPages}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 disabled:opacity-30"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
