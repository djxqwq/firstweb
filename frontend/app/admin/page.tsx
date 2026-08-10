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
  days: { day: string; count: number }[];
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
    { id: string; title: string; url: string }[]
  >([]);
  const [musicUploading, setMusicUploading] = useState(false);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [projectOptions, setProjectOptions] = useState<
    { id: number; title: string }[]
  >([]);
  const [msgSort, setMsgSort] = useState<"newest" | "oldest" | "unreplied">(
    "newest"
  );
  const [msgSearch, setMsgSearch] = useState("");
  const [msgPage, setMsgPage] = useState(1);
  const [msgPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [groupByIp, setGroupByIp] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("admin_token") || "");
  }, []);

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
    if (res.ok) setItems(await res.json());
  }, [token, type, tab, logout]);

  const loadVisits = useCallback(async () => {
    if (!token) return;
    const [vRes, sRes] = await Promise.all([
      fetch(
        `${API}/api/admin/visitors${groupByIp ? "?group_by=ip" : ""}`,
        {
          headers: authHeaders(token),
        }
      ),
      fetch(`${API}/api/visits/stats`),
    ]);
    if (vRes.status === 401) {
      logout();
      return;
    }
    if (vRes.ok) setVisitors(await vRes.json());
    if (sRes.ok) setStats(await sRes.json());
  }, [token, logout, groupByIp]);

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
        prev.map((v) =>
          v.visitor_id === key ? { ...v, note: noteText } : v
        )
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
                t: { id?: string; title?: string; url?: string; src?: string },
                i: number
              ) => ({
                id: t.id || `t-${i}`,
                title: t.title || `曲目 ${i + 1}`,
                url: t.url || t.src || "",
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
      published: !!form.published,
      cover_url: form.cover_url || "",
      body_json:
        type === "profile"
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
    const res = await fetch(url, {
      method: form.id ? "PUT" : "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("保存失败");
      return;
    }
    setOkMsg("已保存");
    setForm(emptyForm());
    loadContents();
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
      <div className="flex min-h-screen items-center justify-center bg-[#05020f] px-4 text-gray-200">
        <form
          onSubmit={login}
          className="w-full max-w-md space-y-4 rounded-2xl border border-violet-500/30 bg-[#0a0618] p-8 shadow-[0_0_40px_rgba(112,66,248,0.2)]"
        >
          <h1 className="text-2xl font-semibold text-white">管理后台 · 邓锦鑫</h1>
          <p className="text-sm text-gray-400">
            单人 JWT 登录 · 账号见环境变量 ADMIN_USER
          </p>
          <input
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-cyan-400/50"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="用户名"
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-cyan-400/50"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="密码"
          />
          {error && <p className="text-sm text-amber-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>
          <Link href="/" className="block text-center text-sm text-cyan-300">
            ← 返回站点
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05020f] px-4 py-8 text-gray-200 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-[#0a0618] p-5">
          <div>
            <h1 className="text-xl font-semibold text-white md:text-2xl">
              星空管理台
            </h1>
            <p className="text-xs text-gray-500">API · {API}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["contents", "内容"],
                ["visits", "访客"],
                ["logins", "登录"],
                ["messages", "留言"],
                ["settings", "设置"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  tab === k
                    ? "border-cyan-400/60 text-cyan-200"
                    : "border-white/10 text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
            <Link
              href="/"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
            >
              站点
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400"
            >
              退出
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            {error}
          </p>
        )}
        {okMsg && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {okMsg}
          </p>
        )}

        {tab === "visits" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-cyan-500/20 bg-[#0a0618] p-5">
                <div className="text-xs tracking-widest text-cyan-400/80">
                  总访问
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {stats?.total?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-[#0a0618] p-5">
                <div className="text-xs tracking-widest text-violet-300/80">
                  独立访客
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {stats?.unique?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-[#0a0618] p-5">
                <div className="text-xs tracking-widest text-emerald-300/80">
                  Desktop
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {stats?.devices?.desktop?.toLocaleString() ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-[#0a0618] p-5">
                <div className="text-xs tracking-widest text-amber-300/80">
                  Mobile
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {stats?.devices?.mobile?.toLocaleString() ?? 0}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-[#0a0618] p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs tracking-widest text-violet-300/80">
                  近 7 日趋势
                </div>
                <button
                  type="button"
                  onClick={exportVisits}
                  className="rounded-lg border border-cyan-400/40 px-3 py-1 text-xs text-cyan-200"
                >
                  导出 CSV
                </button>
              </div>
              {(() => {
                // 补全最近 7 天，没有数据的日期填 0
                const rawDays = stats?.days || [];
                const dayMap = new Map(rawDays.map((d) => [d.day, d.count]));
                const padded: { day: string; count: number }[] = [];
                const now = new Date();
                for (let i = 6; i >= 0; i--) {
                  const dt = new Date(now);
                  dt.setDate(dt.getDate() - i);
                  const key = dt.toISOString().slice(0, 10);
                  padded.push({ day: key, count: dayMap.get(key) ?? 0 });
                }
                const max = Math.max(1, ...padded.map((x) => x.count));
                const total7 = padded.reduce((s, x) => s + x.count, 0);
                return (
                  <div className="flex items-end gap-2" style={{ height: 140 }}>
                    {padded.map((d, i) => (
                      <div
                        key={d.day}
                        className="flex flex-1 flex-col items-center justify-end gap-1.5"
                        style={{ height: "100%" }}
                      >
                        <span className="text-[10px] font-medium text-cyan-200/80">
                          {d.count > 0 ? d.count : ""}
                        </span>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-violet-600 to-cyan-400 transition-all duration-300"
                          style={{
                            height: `${Math.max(d.count > 0 ? 6 : 2, (d.count / max) * 80)}%`,
                            opacity: d.count > 0 ? 1 : 0.2,
                          }}
                          title={`${d.day}: ${d.count} 次访问`}
                        />
                        <span className="text-[9px] text-gray-500">
                          {d.day.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {(stats?.days || []).length === 0 && (
                <p className="py-4 text-center text-xs text-gray-600">
                  暂无访问数据
                </p>
              )}
              <div className="mt-2 text-right text-[10px] text-gray-600">
                近 7 日合计 {(() => {
                  const rawDays = stats?.days || [];
                  const dayMap = new Map(rawDays.map((d) => [d.day, d.count]));
                  let total = 0;
                  const now = new Date();
                  for (let i = 6; i >= 0; i--) {
                    const dt = new Date(now);
                    dt.setDate(dt.getDate() - i);
                    total += dayMap.get(dt.toISOString().slice(0, 10)) ?? 0;
                  }
                  return total;
                })()} 次访问
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/40"
                placeholder="搜索 IP / 备注 / 路径"
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
                    <th className="px-4 py-3">访客 IP</th>
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
                    const regionText = [
                      v.last_country,
                      v.last_region,
                      v.last_city,
                      v.last_district,
                    ]
                      .filter(Boolean)
                      .join(" · ");
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
                                    {[
                                      v.last_country,
                                      v.last_region,
                                      v.last_city,
                                      v.last_district,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ") || "—"}
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
                        无匹配访客
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-200/80">
                后台登录审计 · 共 {loginRecords.length} 条记录
              </div>
              <button
                type="button"
                onClick={clearLoginRecords}
                className="rounded-lg border border-red-400/40 px-3 py-1 text-xs text-red-300"
              >
                清空记录
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0618]">
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
                  {loginRecords.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 text-gray-300"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-xs">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString("zh-CN", {
                              hour12: false,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-cyan-300/80">
                        {r.username}
                      </td>
                      <td className="px-4 py-2">
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
                      <td className="px-4 py-2 font-mono text-xs text-cyan-300/80">
                        {r.ip_hash}
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-2 text-xs text-gray-500">
                        {r.ua}
                      </td>
                    </tr>
                  ))}
                  {!loginRecords.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        暂无登录记录
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
            className="max-w-xl space-y-5 rounded-2xl border border-white/10 bg-[#0a0618] p-6"
          >
            <h2 className="text-lg text-white">站点设置</h2>
            <label className="block text-sm text-gray-400">
              站点标题
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-cyan-400/40"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
              />
            </label>

            <div className="space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-violet-100">背景音乐</h3>
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={musicEnabled}
                    onChange={(e) => setMusicEnabled(e.target.checked)}
                  />
                  启用播放器
                </label>
              </div>

              <label className="block text-xs text-gray-500">
                默认音量 {Math.round(musicVolume * 100)}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                  className="mt-2 w-full accent-cyan-400"
                />
              </label>

              <div className="space-y-2">
                {musicTracks.length === 0 && (
                  <p className="text-xs text-gray-600">
                    暂无自定义曲目，主页会用内置氛围音。上传后优先生效。
                  </p>
                )}
                {musicTracks.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-2"
                  >
                    <input
                      className="min-w-0 flex-1 rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm text-white outline-none"
                      value={t.title}
                      onChange={(e) =>
                        setMusicTracks((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, title: e.target.value } : x
                          )
                        )
                      }
                    />
                    <span className="max-w-[120px] truncate font-mono text-[10px] text-gray-500">
                      {t.url}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setMusicTracks((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="rounded-md px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                    >
                      删
                    </button>
                  </div>
                ))}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-cyan-200/80">
                <span className="rounded-lg border border-cyan-400/30 px-3 py-2 hover:bg-cyan-500/10">
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

            <p className="text-xs text-gray-500">
              效果开关：流体 / 贪吃蛇 默认开启。保存后刷新主页即可听到新歌单。
            </p>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2 text-sm text-white"
            >
              保存设置
            </button>
          </form>
        )}

        {(tab === "contents" || tab === "messages") && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0a0618] p-5">
              {tab === "contents" && (
                <div className="flex flex-wrap gap-2">
                  {TYPES.filter((t) => t.key !== "message").map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setType(t.key);
                        setForm(emptyForm());
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        type === t.key
                          ? "border-cyan-400/60 text-cyan-200"
                          : "border-white/10 text-gray-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={save} className="space-y-3">
                <h2 className="text-lg text-white">
                  {form.id ? "编辑" : "新增"} ·{" "}
                  {tab === "messages" ? "留言处理" : title}
                </h2>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
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
                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
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
                {(type === "project" || type === "profile" || type === "internship") &&
                  tab === "contents" && (
                  <>
                    {(type === "project" || type === "internship") && (
                      <>
                    <textarea
                      className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
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
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
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
                    {type === "project" && (
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-400/40"
                      value={form.links}
                      onChange={(e) =>
                        setForm({ ...form, links: e.target.value })
                      }
                      placeholder='链接 JSON：{"github":"...","demo":"..."}'
                    />
                    )}
                      </>
                    )}
                    {(type === "project" || type === "profile") && (
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
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
                      <span className="rounded-lg border border-white/15 px-3 py-2 hover:border-cyan-400/40">
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
                {type === "skill" && tab === "contents" && (
                  <>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
                      value={form.level}
                      onChange={(e) =>
                        setForm({ ...form, level: Number(e.target.value) })
                      }
                      placeholder="熟练度 0-100"
                    />
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
                <input
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) })
                  }
                  placeholder="排序"
                />
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm({ ...form, published: e.target.checked })
                    }
                  />
                  发布到前台
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2 text-sm text-white"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm())}
                    className="rounded-xl border border-white/10 px-5 py-2 text-sm text-gray-400"
                  >
                    清空
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0a0618] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg text-white">列表</h2>
                {tab === "messages" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none focus:border-cyan-400/40"
                      placeholder="搜索留言…"
                      value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm outline-none"
                      value={msgSort}
                      onChange={(e) =>
                        setMsgSort(e.target.value as "newest" | "oldest" | "unreplied")
                      }
                    >
                      <option value="newest">最新优先</option>
                      <option value="oldest">最早优先</option>
                      <option value="unreplied">未回复优先</option>
                    </select>
                    <span className="text-xs text-gray-500">
                      {sortedMessages.length} 条
                    </span>
                    {selectedIds.size > 0 && (
                      <button
                        type="button"
                        onClick={batchDelete}
                        disabled={batchDeleting}
                        className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
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
                {(tab === "messages" ? pagedMessages : items).map((item) => {
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
                  return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 ${
                      body?.is_admin
                        ? "border-purple-500/30 bg-purple-500/5"
                        : "border-white/10 bg-black/30"
                    } ${selectedIds.has(item.id) ? "ring-1 ring-cyan-400/30" : ""}`}
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
                        <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {item.title || "(无标题)"}
                          </span>
                          {body?.is_admin && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300">
                              博主
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
                            <>
                              {" "}· sort {item.sort_order} ·{" "}
                              {item.published ? "已发布" : "草稿"}
                            </>
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
                            className="rounded-lg border border-purple-400/30 px-2 py-1 text-xs text-purple-200"
                          >
                            回复
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => edit(item)}
                          className="rounded-lg border border-cyan-400/30 px-2 py-1 text-xs text-cyan-200"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          className="rounded-lg border border-red-400/30 px-2 py-1 text-xs text-red-300"
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
                          className="min-w-0 flex-1 rounded-lg border border-purple-400/30 bg-black/40 px-3 py-1.5 text-sm text-white outline-none focus:border-purple-400/60"
                        />
                        <button
                          type="button"
                          onClick={() => submitReply(item.id)}
                          className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 px-3 py-1.5 text-xs text-white"
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
                  : items.length === 0) && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    暂无数据
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
