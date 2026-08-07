"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";

const TYPES = [
  { key: "project", label: "项目" },
  { key: "education", label: "教育" },
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
};

type VisitItem = {
  id: number;
  ip_hash: string;
  ua: string;
  path: string;
  referrer: string;
  device: string;
  created_at: string | null;
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
  const [siteTitle, setSiteTitle] = useState("个人技术博客");
  const [uploading, setUploading] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [musicTracks, setMusicTracks] = useState<
    { id: string; title: string; url: string }[]
  >([]);
  const [musicUploading, setMusicUploading] = useState(false);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);

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
      fetch(`${API}/api/admin/visits?limit=200`, {
        headers: authHeaders(token),
      }),
      fetch(`${API}/api/visits/stats`),
    ]);
    if (vRes.status === 401) {
      logout();
      return;
    }
    if (vRes.ok) setVisits(await vRes.json());
    if (sRes.ok) setStats(await sRes.json());
  }, [token, logout]);

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

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (visitDevice !== "all" && v.device !== visitDevice) return false;
      if (!visitQ.trim()) return true;
      const q = visitQ.toLowerCase();
      return (
        v.path.toLowerCase().includes(q) ||
        (v.referrer || "").toLowerCase().includes(q) ||
        (v.ua || "").toLowerCase().includes(q) ||
        (v.ip_hash || "").toLowerCase().includes(q)
      );
    });
  }, [visits, visitQ, visitDevice]);

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
      setMusicTracks((prev) => [
        ...prev,
        {
          id: `up-${Date.now()}`,
          title,
          url: data.url,
        },
      ]);
      setOkMsg(`已加入歌单：${title}`);
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
              <div className="flex h-20 items-end gap-2">
                {(stats?.days || []).map((d) => {
                  const max = Math.max(
                    1,
                    ...(stats?.days || []).map((x) => x.count)
                  );
                  return (
                    <div
                      key={d.day}
                      className="flex flex-1 flex-col items-center gap-1"
                      title={`${d.day}: ${d.count}`}
                    >
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-violet-600 to-cyan-400"
                        style={{
                          height: `${(d.count / max) * 100}%`,
                          minHeight: 4,
                        }}
                      />
                      <span className="text-[9px] text-gray-500">
                        {String(d.day).slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/40"
                placeholder="搜索路径 / UA / IP Hash / 来源"
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
              <span className="self-center text-xs text-gray-500">
                显示 {filteredVisits.length} / {visits.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0618]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3">时间</th>
                    <th className="px-4 py-3">路径</th>
                    <th className="px-4 py-3">设备</th>
                    <th className="px-4 py-3">来源</th>
                    <th className="px-4 py-3">IP Hash</th>
                    <th className="px-4 py-3">UA</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisits.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-white/5 text-gray-300"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-xs">
                        {v.created_at
                          ? new Date(v.created_at).toLocaleString("zh-CN", {
                              hour12: false,
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{v.path}</td>
                      <td className="px-4 py-2">{v.device}</td>
                      <td className="max-w-[160px] truncate px-4 py-2 text-xs text-gray-500">
                        {v.referrer || "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-cyan-300/80">
                        {v.ip_hash}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-2 text-xs text-gray-500">
                        {v.ua}
                      </td>
                    </tr>
                  ))}
                  {!filteredVisits.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        无匹配记录
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
                  placeholder="标题"
                  required
                />
                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  placeholder="简介 / 摘要"
                />
                {(type === "project" || type === "profile") &&
                  tab === "contents" && (
                  <>
                    {type === "project" && (
                      <>
                    <textarea
                      className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
                      value={form.detail}
                      onChange={(e) =>
                        setForm({ ...form, detail: e.target.value })
                      }
                      placeholder="详情介绍（弹窗长文）"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
                      value={form.tags}
                      onChange={(e) =>
                        setForm({ ...form, tags: e.target.value })
                      }
                      placeholder="标签，逗号分隔：Uniapp, Python"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-400/40"
                      value={form.links}
                      onChange={(e) =>
                        setForm({ ...form, links: e.target.value })
                      }
                      placeholder='链接 JSON：{"github":"...","demo":"..."}'
                    />
                      </>
                    )}
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
                  <input
                    type="number"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:border-cyan-400/40"
                    value={form.level}
                    onChange={(e) =>
                      setForm({ ...form, level: Number(e.target.value) })
                    }
                    placeholder="熟练度 0-100"
                  />
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
              <h2 className="mb-4 text-lg text-white">列表</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-white">
                          {item.title || "(无标题)"}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                          {item.summary}
                        </p>
                        <div className="mt-2 text-[11px] text-gray-500">
                          #{item.id} · sort {item.sort_order} ·{" "}
                          {item.published ? "已发布" : "草稿"}
                          {typeof item.level === "number" && item.level > 0
                            ? ` · ${item.level}%`
                            : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
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
                  </div>
                ))}
                {!items.length && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    暂无数据
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
