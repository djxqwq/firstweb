"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineLink,
  HiOutlinePlus,
  HiOutlineViewColumns,
} from "react-icons/hi2";

import {
  API,
  authHeaders,
  clearToken,
  getToken,
} from "@/lib/workspace-auth";

type StatusKey =
  | "wishlist"
  | "applied"
  | "exam"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted"
  | "closed";

type AppItem = {
  id: number;
  company: string;
  role: string;
  city: string;
  channel: string;
  track: string;
  status: StatusKey | string;
  status_label: string;
  priority: string;
  applied_at: string;
  exam_at: string;
  exam_url: string;
  exam_done: boolean;
  exam_result: string;
  interview_at: string;
  interview_url: string;
  interview_done: boolean;
  interview_round: string;
  interview_result: string;
  next_action_at: string;
  salary: string;
  jd_url: string;
  apply_url: string;
  notes: string;
};

type Stats = {
  total: number;
  active: number;
  by_status: Record<string, number>;
  labels: Record<string, string>;
  upcoming_7d: number;
  overdue: number;
  exam_todo: number;
  interview_todo: number;
  offers: number;
};

type Meta = {
  statuses: { key: string; label: string }[];
  priorities: { key: string; label: string }[];
  channels: string[];
  tracks: string[];
};

const EMPTY: Omit<AppItem, "id" | "status_label"> = {
  company: "",
  role: "",
  city: "",
  channel: "官网",
  track: "后端",
  status: "wishlist",
  priority: "normal",
  applied_at: "",
  exam_at: "",
  exam_url: "",
  exam_done: false,
  exam_result: "",
  interview_at: "",
  interview_url: "",
  interview_done: false,
  interview_round: "",
  interview_result: "",
  next_action_at: "",
  salary: "",
  jd_url: "",
  apply_url: "",
  notes: "",
};

const STATUS_STYLE: Record<string, string> = {
  wishlist: "bg-slate-500/20 text-slate-300",
  applied: "bg-sky-500/20 text-sky-300",
  exam: "bg-amber-500/20 text-amber-300",
  interview: "bg-violet-500/20 text-violet-300",
  offer: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-rose-500/20 text-rose-300",
  ghosted: "bg-orange-500/20 text-orange-300",
  closed: "bg-zinc-500/20 text-zinc-400",
};

const KANBAN_COLS: StatusKey[] = [
  "wishlist",
  "applied",
  "exam",
  "interview",
  "offer",
  "rejected",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(d: string) {
  return d && d < todayIso();
}

function isSoon(d: string) {
  if (!d) return false;
  const t = todayIso();
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const w = week.toISOString().slice(0, 10);
  return d >= t && d <= w;
}

export default function QiuzhaoPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [items, setItems] = useState<AppItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [view, setView] = useState<"list" | "board" | "agenda">("list");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("next");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(async (tok: string) => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (q.trim()) params.set("q", q.trim());
    params.set("sort", sort);
    const [listRes, statsRes, metaRes] = await Promise.all([
      fetch(`${API}/api/tools/qiuzhao/applications?${params}`, {
        headers: authHeaders(tok),
      }),
      fetch(`${API}/api/tools/qiuzhao/stats`, { headers: authHeaders(tok) }),
      fetch(`${API}/api/tools/qiuzhao/meta`, { headers: authHeaders(tok) }),
    ]);
    if (listRes.status === 401 || statsRes.status === 401) {
      clearToken();
      router.replace("/workspace?next=/tools/qiuzhao");
      return;
    }
    if (listRes.ok) setItems(await listRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    if (metaRes.ok) setMeta(await metaRes.json());
  }, [statusFilter, q, sort, router]);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/workspace?next=/tools/qiuzhao");
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void load(token);
  }, [token, load]);

  useEffect(() => {
    if (!okMsg) return;
    const t = setTimeout(() => setOkMsg(""), 2500);
    return () => clearTimeout(t);
  }, [okMsg]);

  const agenda = useMemo(() => {
    return [...items]
      .filter(
        (i) =>
          i.next_action_at &&
          !["offer", "rejected", "ghosted", "closed"].includes(i.status)
      )
      .sort((a, b) =>
        (a.next_action_at || "").localeCompare(b.next_action_at || "")
      );
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY,
      applied_at: todayIso(),
      status: "applied",
    });
    setFormOpen(true);
  };

  const openEdit = (item: AppItem) => {
    setEditingId(item.id);
    setForm({
      company: item.company,
      role: item.role,
      city: item.city,
      channel: item.channel,
      track: item.track,
      status: item.status,
      priority: item.priority,
      applied_at: item.applied_at,
      exam_at: item.exam_at,
      exam_url: item.exam_url,
      exam_done: item.exam_done,
      exam_result: item.exam_result,
      interview_at: item.interview_at,
      interview_url: item.interview_url,
      interview_done: item.interview_done,
      interview_round: item.interview_round,
      interview_result: item.interview_result,
      next_action_at: item.next_action_at,
      salary: item.salary,
      jd_url: item.jd_url,
      apply_url: item.apply_url,
      notes: item.notes,
    });
    setFormOpen(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        events: [],
      };
      const url = editingId
        ? `${API}/api/tools/qiuzhao/applications/${editingId}`
        : `${API}/api/tools/qiuzhao/applications`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          typeof body.detail === "string" ? body.detail : `保存失败 ${res.status}`
        );
        return;
      }
      setOkMsg(editingId ? "已更新" : "已新建");
      setFormOpen(false);
      await load(token);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!token || !confirm("确认删除这条投递？")) return;
    const res = await fetch(`${API}/api/tools/qiuzhao/applications/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (res.ok) {
      setOkMsg("已删除");
      await load(token);
    }
  };

  const moveStatus = async (id: number, status: string) => {
    if (!token) return;
    const res = await fetch(
      `${API}/api/tools/qiuzhao/applications/${id}/status`,
      {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ status }),
      }
    );
    if (res.ok) await load(token);
  };

  if (!token) {
    return (
      <div className="tools-shell flex min-h-screen items-center justify-center text-sm text-gray-500">
        校验登录…
      </div>
    );
  }

  return (
    <div className="tools-shell relative overflow-hidden px-3 pb-16 pt-4 md:px-6">
      <div className="tools-orb -left-24 top-0 h-64 w-64 bg-cyan-400/25" />
      <div className="tools-orb right-0 top-32 h-72 w-72 bg-emerald-400/15" />

      <div className="relative mx-auto max-w-7xl space-y-4">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 -mx-3 space-y-3 border-b border-white/5 bg-[#04060d]/88 px-3 py-3 backdrop-blur-xl md:mx-0 md:rounded-2xl md:border md:border-cyan-400/20 md:bg-[#0a101c]/88 md:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="tools-mono text-[10px] tracking-[0.26em] text-cyan-400/75">
                TOOLS / QIUZHAO
              </p>
              <h1 className="tools-hero-title mt-1 text-2xl md:text-3xl">
                秋招投递台
              </h1>
              <p className="mt-1 text-[11px] text-[var(--tools-muted)]">
                列表 · 看板拖拽 · 临近日程 · 笔试/面试链接与结果
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/tools" className="admin-btn admin-btn-ghost text-xs">
                工具首页
              </Link>
              <Link
                href="/workspace"
                className="admin-btn admin-btn-ghost text-xs"
              >
                工作台
              </Link>
              <Link href="/admin" className="admin-btn admin-btn-ghost text-xs">
                站点后台
              </Link>
              <button
                type="button"
                onClick={openCreate}
                className="admin-btn admin-btn-primary text-xs"
              >
                <HiOutlinePlus className="mr-1 inline h-3.5 w-3.5" />
                新建投递
              </button>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  label: "总计",
                  value: stats.total,
                  accent: "#22d3ee",
                },
                {
                  label: "进行中",
                  value: stats.active,
                  accent: "#a78bfa",
                },
                {
                  label: "7 日内",
                  value: stats.upcoming_7d,
                  accent: "#fbbf24",
                },
                {
                  label: "已逾期",
                  value: stats.overdue,
                  accent: "#fb7185",
                },
                {
                  label: "待笔试",
                  value: stats.exam_todo,
                  accent: "#38bdf8",
                },
                {
                  label: "Offer",
                  value: stats.offers,
                  accent: "#34d399",
                },
              ].map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="tools-kpi"
                  style={{ ["--kpi-accent" as string]: k.accent }}
                >
                  <div className="tools-kpi-label">{k.label}</div>
                  <div
                    className="tools-kpi-value"
                    style={{ color: k.accent }}
                  >
                    {k.value}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="admin-input min-w-[160px] flex-1 py-1.5 text-sm"
              placeholder="搜索公司 / 岗位 / 城市 / 备注"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="admin-input w-auto py-1.5 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部状态</option>
              {(meta?.statuses || []).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className="admin-input w-auto py-1.5 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="next">按下次动作</option>
              <option value="applied">按投递日</option>
              <option value="updated">按更新</option>
              <option value="company">按公司</option>
            </select>
            <div className="flex rounded-xl border border-white/10 bg-black/30 p-0.5">
              {(
                [
                  ["list", "列表", HiOutlineClipboardDocumentList],
                  ["board", "看板", HiOutlineViewColumns],
                  ["agenda", "临近", HiOutlineCalendarDays],
                ] as const
              ).map(([k, label, Icon]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition ${
                    view === k
                      ? "bg-cyan-500/20 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => load(token)}
              className="admin-btn admin-btn-ghost text-xs"
            >
              刷新
            </button>
          </div>
        </motion.header>

        {error && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {error}
          </p>
        )}
        {okMsg && (
          <p className="admin-toast text-sm text-emerald-200">{okMsg}</p>
        )}

        {/* LIST */}
        {view === "list" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="qz-table-wrap overflow-x-auto"
          >
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">公司 / 岗位</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">投递日</th>
                  <th className="px-3 py-2.5">笔试</th>
                  <th className="px-3 py-2.5">面试</th>
                  <th className="px-3 py-2.5">下次</th>
                  <th className="px-3 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 text-gray-300 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-white">
                        {item.company}
                        {item.priority === "urgent" && (
                          <span className="qz-priority-urgent ml-1 text-[10px]">
                            急
                          </span>
                        )}
                        {item.priority === "high" && (
                          <span className="qz-priority-high ml-1 text-[10px]">
                            高
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {item.role || "—"}
                        {item.city ? ` · ${item.city}` : ""}
                        {item.track ? ` · ${item.track}` : ""}
                        {item.channel ? ` · ${item.channel}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`qz-status ${STATUS_STYLE[item.status] || ""}`}
                      >
                        {item.status_label || item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {item.applied_at || "—"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>{item.exam_at || "—"}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {item.exam_url && (
                          <a
                            href={item.exam_url}
                            target="_blank"
                            rel="noreferrer"
                            className="qz-link-chip"
                          >
                            <HiOutlineLink className="h-3 w-3" />
                            链接
                          </a>
                        )}
                        {item.exam_done ? (
                          <span className="text-emerald-400">已考</span>
                        ) : item.exam_at || item.exam_url ? (
                          <span className="text-amber-400">未考</span>
                        ) : null}
                        {item.exam_result === "fail" && (
                          <span className="text-rose-400">挂</span>
                        )}
                        {item.exam_result === "pass" && (
                          <span className="text-emerald-400">过</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>
                        {item.interview_round
                          ? `${item.interview_round} `
                          : ""}
                        {item.interview_at || "—"}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {item.interview_url && (
                          <a
                            href={item.interview_url}
                            target="_blank"
                            rel="noreferrer"
                            className="qz-link-chip"
                          >
                            <HiOutlineLink className="h-3 w-3" />
                            链接
                          </a>
                        )}
                        {item.interview_done ? (
                          <span className="text-emerald-400">已面</span>
                        ) : item.interview_at || item.interview_url ? (
                          <span className="text-amber-400">未面</span>
                        ) : null}
                        {item.interview_result === "fail" && (
                          <span className="text-rose-400">挂</span>
                        )}
                        {item.interview_result === "pass" && (
                          <span className="text-emerald-400">过</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      <span
                        className={
                          isOverdue(item.next_action_at)
                            ? "text-rose-400"
                            : isSoon(item.next_action_at)
                              ? "text-amber-300"
                              : ""
                        }
                      >
                        {item.next_action_at || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost px-2 py-1 text-[11px]"
                          onClick={() => openEdit(item)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger px-2 py-1 text-[11px]"
                          onClick={() => remove(item.id)}
                        >
                          删
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-gray-500"
                    >
                      还没有投递记录，点右上角「新建投递」
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* BOARD */}
        {view === "board" && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {KANBAN_COLS.map((col, ci) => {
              const label =
                meta?.statuses.find((s) => s.key === col)?.label || col;
              const colItems = items.filter((i) => i.status === col);
              return (
                <motion.div
                  key={col}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.04 }}
                  className="qz-kanban-col p-2.5"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId != null) void moveStatus(dragId, col);
                    setDragId(null);
                  }}
                >
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <span className={`qz-status ${STATUS_STYLE[col]}`}>
                      {label}
                    </span>
                    <span className="tools-mono text-[10px] text-gray-600">
                      {colItems.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDragId(item.id)}
                        onClick={() => openEdit(item)}
                        className="qz-kanban-card cursor-grab p-3 active:cursor-grabbing"
                      >
                        <div className="text-sm font-semibold tracking-tight text-white">
                          {item.company}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--tools-muted)]">
                          {item.role || "未填岗位"}
                        </div>
                        {item.next_action_at && (
                          <div
                            className={`tools-mono mt-2 text-[10px] ${
                              isOverdue(item.next_action_at)
                                ? "text-rose-400"
                                : "text-cyan-400/85"
                            }`}
                          >
                            → {item.next_action_at}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* AGENDA */}
        {view === "agenda" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="tools-card divide-y divide-white/5 overflow-hidden"
          >
            {agenda.map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openEdit(item)}
                className="flex w-full items-start gap-4 px-4 py-3.5 text-left hover:bg-cyan-400/[0.04]"
              >
                <div
                  className={`tools-mono w-24 shrink-0 text-sm ${
                    isOverdue(item.next_action_at)
                      ? "text-rose-400"
                      : isSoon(item.next_action_at)
                        ? "text-amber-300"
                        : "text-cyan-300"
                  }`}
                >
                  {item.next_action_at}
                  <div className="text-[10px] text-gray-600">
                    {isOverdue(item.next_action_at)
                      ? "逾期"
                      : isSoon(item.next_action_at)
                        ? "近 7 日"
                        : "日程"}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tracking-tight text-white">
                      {item.company}
                    </span>
                    <span
                      className={`qz-status ${STATUS_STYLE[item.status] || ""}`}
                    >
                      {item.status_label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--tools-muted)]">
                    {item.role}
                    {item.exam_url && " · 有笔试链接"}
                    {item.interview_url && " · 有面试链接"}
                  </div>
                </div>
              </motion.button>
            ))}
            {!agenda.length && (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                暂无带日期的待办（填「下次动作」或笔试/面试日期）
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* FORM DRAWER */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="qz-drawer-scrim fixed inset-0 z-50 flex items-end justify-center p-3 md:items-center"
          >
            <motion.form
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onSubmit={save}
              className="tools-card qz-drawer max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5"
            >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? `编辑 #${editingId}` : "新建投递"}
              </h2>
              <button
                type="button"
                className="admin-btn admin-btn-ghost text-xs"
                onClick={() => setFormOpen(false)}
              >
                关闭
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="admin-field-label">公司 *</span>
                <input
                  className="admin-input"
                  required
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="admin-field-label">岗位</span>
                <input
                  className="admin-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="admin-field-label">城市</span>
                <input
                  className="admin-input"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="admin-field-label">渠道</span>
                <select
                  className="admin-input"
                  value={form.channel}
                  onChange={(e) =>
                    setForm({ ...form, channel: e.target.value })
                  }
                >
                  {(meta?.channels || ["官网"]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="admin-field-label">赛道</span>
                <select
                  className="admin-input"
                  value={form.track}
                  onChange={(e) => setForm({ ...form, track: e.target.value })}
                >
                  {(meta?.tracks || ["后端"]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="admin-field-label">状态</span>
                <select
                  className="admin-input"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  {(meta?.statuses || []).map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="admin-field-label">优先级</span>
                <select
                  className="admin-input"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  {(meta?.priorities || []).map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="admin-field-label">投递日期</span>
                <input
                  type="date"
                  className="admin-input"
                  value={form.applied_at}
                  onChange={(e) =>
                    setForm({ ...form, applied_at: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="admin-field-label">下次动作日</span>
                <input
                  type="date"
                  className="admin-input"
                  value={form.next_action_at}
                  onChange={(e) =>
                    setForm({ ...form, next_action_at: e.target.value })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="admin-field-label">薪资 / 备注薪资</span>
                <input
                  className="admin-input"
                  value={form.salary}
                  onChange={(e) =>
                    setForm({ ...form, salary: e.target.value })
                  }
                  placeholder="如 15-25k · 16薪"
                />
              </label>

              <div className="sm:col-span-2 rounded-xl border border-white/8 bg-black/25 p-3">
                <div className="mb-2 text-xs font-medium text-amber-200/90">
                  笔试
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    className="admin-input"
                    value={form.exam_at}
                    onChange={(e) =>
                      setForm({ ...form, exam_at: e.target.value })
                    }
                  />
                  <input
                    className="admin-input"
                    placeholder="笔试链接"
                    value={form.exam_url}
                    onChange={(e) =>
                      setForm({ ...form, exam_url: e.target.value })
                    }
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={form.exam_done}
                      onChange={(e) =>
                        setForm({ ...form, exam_done: e.target.checked })
                      }
                    />
                    已完成笔试
                  </label>
                  <select
                    className="admin-input"
                    value={form.exam_result}
                    onChange={(e) =>
                      setForm({ ...form, exam_result: e.target.value })
                    }
                  >
                    <option value="">结果未填</option>
                    <option value="pending">待出结果</option>
                    <option value="pass">通过</option>
                    <option value="fail">挂了</option>
                    <option value="skip">免笔试</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-white/8 bg-black/25 p-3">
                <div className="mb-2 text-xs font-medium text-violet-200/90">
                  面试
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="admin-input"
                    placeholder="轮次，如 一面 / HR"
                    value={form.interview_round}
                    onChange={(e) =>
                      setForm({ ...form, interview_round: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="admin-input"
                    value={form.interview_at}
                    onChange={(e) =>
                      setForm({ ...form, interview_at: e.target.value })
                    }
                  />
                  <input
                    className="admin-input sm:col-span-2"
                    placeholder="面试链接（腾讯会议 / 飞书 …）"
                    value={form.interview_url}
                    onChange={(e) =>
                      setForm({ ...form, interview_url: e.target.value })
                    }
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={form.interview_done}
                      onChange={(e) =>
                        setForm({ ...form, interview_done: e.target.checked })
                      }
                    />
                    已完成面试
                  </label>
                  <select
                    className="admin-input"
                    value={form.interview_result}
                    onChange={(e) =>
                      setForm({ ...form, interview_result: e.target.value })
                    }
                  >
                    <option value="">结果未填</option>
                    <option value="pending">待出结果</option>
                    <option value="pass">通过</option>
                    <option value="fail">挂了</option>
                  </select>
                </div>
              </div>

              <label className="block">
                <span className="admin-field-label">JD 链接</span>
                <input
                  className="admin-input"
                  value={form.jd_url}
                  onChange={(e) =>
                    setForm({ ...form, jd_url: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="admin-field-label">投递页链接</span>
                <input
                  className="admin-input"
                  value={form.apply_url}
                  onChange={(e) =>
                    setForm({ ...form, apply_url: e.target.value })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="admin-field-label">备注</span>
                <textarea
                  className="admin-input min-h-[88px]"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="内推人、注意事项、复盘…"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  className="admin-btn admin-btn-danger text-xs"
                  onClick={() => {
                    void remove(editingId);
                    setFormOpen(false);
                  }}
                >
                  删除
                </button>
              )}
              <button
                type="button"
                className="admin-btn admin-btn-ghost text-xs"
                onClick={() => setFormOpen(false)}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="admin-btn admin-btn-primary text-xs"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
