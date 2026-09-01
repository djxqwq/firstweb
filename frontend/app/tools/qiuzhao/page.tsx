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
  events?: InterviewRound[];
};

type InterviewRound = {
  id: string;
  type: "interview";
  round: string;
  at: string;
  url: string;
  done: boolean;
  result: string;
};

type FormState = {
  company: string;
  // role / exam / jd / apply_url / salary / notes 等岗位独有的字段改放到 roleDrafts[]
  city: string;
  channel: string;
  track: string;
  status: string;
  priority: string;
  applied_at: string;
};

/** 单岗位草稿：每个岗位独立维护自己的名称、投递链接、笔面、薪资、备注 */
type RoleDraft = {
  _uid: string;
  role: string;
  apply_url: string;
  jd_url: string;
  salary: string;
  notes: string;
  exam_at: string;
  exam_url: string;
  exam_done: boolean;
  exam_result: string;
  rounds: InterviewRound[];
};

const uid = () =>
  `rd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const emptyRoleDraft = (role = ""): RoleDraft => ({
  _uid: uid(),
  role,
  apply_url: "",
  jd_url: "",
  salary: "",
  notes: "",
  exam_at: "",
  exam_url: "",
  exam_done: false,
  exam_result: "",
  rounds: [],
});

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

const ROUND_NAMES = ["一面", "二面", "三面", "HR面", "终面", "其他"];

const EMPTY_FORM: FormState = {
  company: "",
  city: "",
  channel: "官网",
  track: "后端",
  status: "applied",
  priority: "normal",
  applied_at: "",
};

function newRound(name = "一面"): InterviewRound {
  return {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "interview",
    round: name,
    at: "",
    url: "",
    done: false,
    result: "",
  };
}

function roundsFromItem(item: AppItem): InterviewRound[] {
  const fromEvents = (item.events || [])
    .filter((e) => e && (e.type === "interview" || !e.type))
    .map((e, i) => ({
      id: e.id || `legacy-${i}`,
      type: "interview" as const,
      round: e.round || `第${i + 1}面`,
      at: e.at || "",
      url: e.url || "",
      done: !!e.done,
      result: e.result || "",
    }));
  if (fromEvents.length) return fromEvents;
  if (item.interview_at || item.interview_url || item.interview_round) {
    return [
      {
        id: "legacy-0",
        type: "interview",
        round: item.interview_round || "一面",
        at: item.interview_at || "",
        url: item.interview_url || "",
        done: !!item.interview_done,
        result: item.interview_result || "",
      },
    ];
  }
  return [];
}

const KANBAN_COLS: StatusKey[] = [
  "wishlist",
  "applied",
  "exam",
  "interview",
  "offer",
  "rejected",
];

function todayIso() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

/** 日期自动识别：支持 2026-08-18 / 2026/08/18 / 2026\08\18 / 20260818 / 8-18 / 8/18 等格式
 *  返回统一的 YYYY-MM-DD 字符串；无法解析返回空字符串
 */
function normalizeDateInput(s: string): string {
  if (!s) return "";
  const raw = s.trim();
  if (!raw) return "";
  // 去掉所有非数字字符，得到纯 8 位
  const digits = raw.replace(/\D/g, "");
  // 1. 完整 8 位 YYYYMMDD
  if (digits.length === 8) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const full = `${y}-${m}-${d}`;
    const dt = new Date(`${full}T00:00:00`);
    if (!isNaN(dt.getTime()) && dt.getFullYear() === +y && dt.getMonth() + 1 === +m && dt.getDate() === +d) {
      return full;
    }
  }
  // 2. 6 位 MMDDYY（YY < 50 当 20XX，>= 50 当 19XX）
  if (digits.length === 6) {
    const m = digits.slice(0, 2);
    const d = digits.slice(2, 4);
    const yy = digits.slice(4, 6);
    const y2 = +yy < 50 ? `20${yy}` : `19${yy}`;
    const full = `${y2}-${m}-${d}`;
    const dt = new Date(`${full}T00:00:00`);
    if (!isNaN(dt.getTime()) && dt.getMonth() + 1 === +m && dt.getDate() === +d) return full;
  }
  // 3. 4 位 MMDD（补当前年）
  if (digits.length === 4) {
    const m = digits.slice(0, 2);
    const d = digits.slice(2, 4);
    const y = new Date().getFullYear();
    const full = `${y}-${m}-${d}`;
    const dt = new Date(`${full}T00:00:00`);
    if (!isNaN(dt.getTime()) && dt.getMonth() + 1 === +m && dt.getDate() === +d) return full;
  }
  // 4. 带分隔符的宽松模式：替换所有 / \ . 为 - 后尝试解析
  const norm = raw.replace(/[\\/.]/g, "-");
  // MM-DD → 补年
  const mmdd = norm.match(/^(\d{1,2})-(\d{1,2})$/);
  if (mmdd) {
    const full = `${new Date().getFullYear()}-${mmdd[1].padStart(2, "0")}-${mmdd[2].padStart(2, "0")}`;
    const dt = new Date(`${full}T00:00:00`);
    if (!isNaN(dt.getTime())) return full;
  }
  // 标准 YYYY-MM-DD 或 YYYY-M-D
  const ymd = norm.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }
  // YYYY-MM
  const ym = norm.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  return "";
}

function isOverdue(d: string) {
  return d && d < todayIso();
}

function isSoon(d: string) {
  if (!d) return false;
  const t = todayIso();
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const off = week.getTimezoneOffset();
  const local = new Date(week.getTime() - off * 60_000);
  const w = local.toISOString().slice(0, 10);
  return d >= t && d <= w;
}

function previewNextAction(
  exam_at: string | undefined,
  exam_done: boolean | undefined,
  rounds: InterviewRound[]
): string {
  const today = todayIso();
  const dates: string[] = [];
  if (exam_at && !exam_done) dates.push(exam_at);
  for (const r of rounds) {
    if (r.at && !r.done) dates.push(r.at);
  }
  const upcoming = dates.filter((d) => d >= today).sort();
  if (upcoming[0]) return upcoming[0];
  const past = dates.filter(Boolean).sort().reverse();
  return past[0] || "";
}

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

/** 招聘流程进度 — 固定的 5 个大阶段（用于状态→阶段映射） */
const PIPELINE: { key: StatusKey; label: string }[] = [
  { key: "wishlist", label: "收藏" },
  { key: "applied", label: "投递" },
  { key: "exam", label: "笔试" },
  { key: "interview", label: "面试" },
  { key: "offer", label: "Offer" },
];
const TERMINAL = new Set(["rejected"]);

/** 动态生成进度条 step：根据 rounds 把「面试」拆成 一面/二面/三面…
 *
 * 返回：每个 step { label, state: 'done' | 'active' | 'idle' | 'dead' }
 *   - done   已过去的步骤（绿色）
 *   - active 当前步骤（青色高亮）
 *   - idle   未开始（灰色）
 *   - dead   挂了/鸽了/关闭的状态（全体降饱和 + 标红最终点）
 *   pct：进度条填充百分比（0~100）
 */
type StepState = "done" | "active" | "idle" | "dead";
type DynStep = { label: string; state: StepState; key: string };
function buildPipelineSteps(
  status: StatusKey | string,
  rounds: InterviewRound[] | undefined | null,
  hasExam: boolean
): { steps: DynStep[]; pct: number } {
  // 1. 构建基础 step 序列（无面试展开时 5 步，笔试跳过则 4 步）
  const base: DynStep[] = [
    { key: "wishlist", label: "收藏", state: "idle" },
    { key: "applied", label: "投递", state: "idle" },
  ];
  if (hasExam) base.push({ key: "exam", label: "笔试", state: "idle" });
  // 面试拆分成 1 条或多条（至少保留「面试」占位）
  const rs = rounds || [];
  if (rs.length === 0) {
    base.push({ key: "interview", label: "面试", state: "idle" });
  } else {
    for (let i = 0; i < rs.length; i++) {
      const name = rs[i].round || `第${i + 1}面`;
      base.push({ key: `iv-${i}-${name}`, label: name, state: "idle" });
    }
  }
  base.push({ key: "offer", label: "Offer", state: "idle" });

  // 2. 确定当前到达的大阶段索引：status 对应 PIPELINE 的下标
  const stageIdx = PIPELINE.findIndex((s) => s.key === status); // -1 表示 unknown/terminal
  const isTerminal = TERMINAL.has(status);
  const isOffer = status === "offer";

  // 3. 对每个 step 逐个着色
  for (let i = 0; i < base.length; i++) {
    const s = base[i];
    // 先映射到对应「大阶段」下标
    let bigStage: number;
    if (s.key === "wishlist") bigStage = 0;
    else if (s.key === "applied") bigStage = 1;
    else if (s.key === "exam") bigStage = 2;
    else if (s.key === "offer") bigStage = 4;
    else if (s.key.startsWith("iv-")) bigStage = 3;
    else bigStage = -1;

    if (isTerminal) {
      s.state = "dead"; // 全体降饱和变灰红
      continue;
    }
    if (isOffer) {
      s.state = "done";
      continue;
    }

    // 正常流程（stageIdx 表示当前在的那一大步）
    if (bigStage < stageIdx) {
      s.state = "done";
    } else if (bigStage === stageIdx) {
      // 同一个大阶段里：
      //   - 如果是「面试」大阶段，rounds 中第一个 not done 的轮次是 active，之前的 done，之后的 idle
      //   - 否则单步的话就是 active
      if (stageIdx === 3 && rs.length > 0 && s.key.startsWith("iv-")) {
        const idxInRounds = rs.findIndex((r) => {
          const name = r.round || `第${rs.indexOf(r) + 1}面`;
          return s.key === `iv-${rs.indexOf(r)}-${name}`;
        });
        if (idxInRounds < 0) {
          s.state = "active";
        } else {
          // 找到第一个未完成的轮次
          const firstActive = rs.findIndex((r) => !r.done);
          const activeRound = firstActive < 0 ? rs.length : firstActive;
          if (idxInRounds < activeRound) s.state = "done";
          else if (idxInRounds === activeRound) s.state = "active";
          else s.state = "idle";
        }
      } else {
        s.state = "active";
      }
    } else {
      s.state = "idle";
    }
  }

  // 4. 百分比
  let stepPos = 0;
  for (let i = 0; i < base.length; i++) {
    const s = base[i];
    if (s.state === "done") stepPos = i + 1;
    else if (s.state === "active") {
      stepPos = i + 0.5;
      break;
    }
  }
  const pct = Math.round((stepPos / base.length) * 100);
  return { steps: base, pct };
}

/** 返回近 6 个月 （YYYY-MM） 数组，从当月往前推 */
function last6Months(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
function monthShort(ym: string) {
  const [, m] = ym.split("-");
  return `${parseInt(m, 10)}月`;
}
/** 返回近 14 天的日期 ISO 字符串数组，从今天往前推 13 天 */
function last14Days(): string[] {
  const out: string[] = [];
  const today = new Date();
  const off = today.getTimezoneOffset();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const local = new Date(d.getTime() - off * 60_000);
    out.push(local.toISOString().slice(0, 10));
  }
  return out;
}

/** 构建某年月的月历网格（以周日为一周开头）
 *  返回 6 行 7 列（前导空 + 当月天数 + 补到 42 格的空）；
 *  每个元素：{ iso: string | null, day: number, inMonth: boolean }
 */
function buildMonthCalendar(year: number, monthIdx0: number) {
  const firstDay = new Date(year, monthIdx0, 1);
  const leadingBlanks = firstDay.getDay(); // 0=周日
  const daysInMonth = new Date(year, monthIdx0 + 1, 0).getDate();
  const cells: { iso: string | null; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ iso: null, day: 0, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(monthIdx0 + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ iso: `${year}-${mm}-${dd}`, day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: 0, inMonth: false });
  return { year, monthIdx0, cells };
}

/** 把单条投递中的所有事件日期收集起来 */
function collectEventDates(item: AppItem): string[] {
  const dates: string[] = [];
  if (item.applied_at) dates.push(item.applied_at);
  if (item.exam_at) dates.push(item.exam_at);
  if (item.next_action_at) dates.push(item.next_action_at);
  if (item.interview_at) dates.push(item.interview_at);
  for (const r of item.events || []) if (r.at) dates.push(r.at);
  return dates;
}

export default function QiuzhaoPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [items, setItems] = useState<AppItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [view, setView] = useState<"list" | "board" | "agenda">("list");
  const [sort, setSort] = useState("next");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // 多岗位条目：每个岗位自己的名称、投递链接、笔面、薪资、备注、面试轮次
  const [roleDrafts, setRoleDrafts] = useState<RoleDraft[]>([emptyRoleDraft()]);
  // 当前正在编辑的岗位下标，用于「岗位 1/N」计数和激活条
  const [activeRole, setActiveRole] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(async (tok: string) => {
    const params = new URLSearchParams({ sort });
    // 始终拉全量，过滤在前端本地做（支持多选反选 + 月历等复杂筛选）
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
  }, [sort, router]);

  // 搜索框防抖：200ms 内不重复 re-render 整个列表
  const [rawQ, setRawQ] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(rawQ.trim()), 200);
    return () => clearTimeout(t);
  }, [rawQ]);

  // 多选反选式状态筛选：默认全选；排除列表 excludeStatus 会被过滤掉
  // 例如选中所有 status = 排除 ["ghosted","closed"]，就是反选过滤
  const [selectedStatus, setSelectedStatus] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!meta?.statuses?.length) return;
    const all = new Set(meta.statuses.map((s) => s.key));
    setSelectedStatus(all); // 默认全选
  }, [meta]);

  // 月历点击选中的日期（点击月历某天 → 只看这天）；"" 表示不按日期筛
  const [pickDate, setPickDate] = useState<string>("");
  // 月历当前展示的年月（默认当前月）
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // ========== 所有前端本地过滤 ==========
  const filteredItems = useMemo(() => {
    const kw = q.toLowerCase();
    return items.filter((it) => {
      // 1. 关键词搜索：公司 / 岗位 / 备注
      if (kw) {
        const hay = `${it.company} ${it.role} ${it.notes || ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      // 2. 状态多选（反选）：不在 selectedStatus 里就过滤掉
      if (!selectedStatus.has(it.status)) return false;
      // 3. 点击月历某天：只看这天有投递的
      if (pickDate) {
        const dates = new Set<string>();
        if (it.applied_at) dates.add(it.applied_at);
        if (it.exam_at) dates.add(it.exam_at);
        for (const r of roundsFromItem(it)) if (r.at) dates.add(r.at);
        if (!dates.has(pickDate)) return false;
      }
      return true;
    });
  }, [items, q, selectedStatus, pickDate]);

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
          !["offer","rejected"].includes(i.status)
      )
      .sort((a, b) =>
        (a.next_action_at || "").localeCompare(b.next_action_at || "")
      );
  }, [items]);

  // 近 6 个月投递量（按 applied_at 聚合）
  const monthlyApplied = useMemo(() => {
    const months = last6Months();
    const counts = new Map<string, number>(months.map((m) => [m, 0]));
    for (const it of items) {
      if (!it.applied_at) continue;
      const ym = it.applied_at.slice(0, 7);
      if (counts.has(ym)) counts.set(ym, counts.get(ym)! + 1);
    }
    const arr = months.map((m) => ({ ym: m, count: counts.get(m)! }));
    const max = Math.max(1, ...arr.map((x) => x.count));
    return { arr, max };
  }, [items]);

  // 14 天事件热力图 + 分布
  const heatmap = useMemo(() => {
    const days = last14Days();
    const byDayApplied = new Map<string, number>(days.map((d) => [d, 0]));
    const byDayEvents = new Map<string, number>(days.map((d) => [d, 0]));
    for (const it of items) {
      if (it.applied_at && byDayApplied.has(it.applied_at)) {
        byDayApplied.set(it.applied_at, byDayApplied.get(it.applied_at)! + 1);
      }
      for (const d of collectEventDates(it)) {
        // applied_at 已经算过一次，这里不重复
        if (d === it.applied_at) continue;
        if (byDayEvents.has(d)) byDayEvents.set(d, byDayEvents.get(d)! + 1);
      }
    }
    const levelOf = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
    return {
      days,
      applied: days.map((d) => ({ day: d, n: byDayApplied.get(d)!, l: levelOf(byDayApplied.get(d)!) })),
      events: days.map((d) => ({ day: d, n: byDayEvents.get(d)!, l: levelOf(byDayEvents.get(d)!) })),
    };
  }, [items]);

  // 已有公司名列表（用于添加表单的 datalist 快速选）
  const distinctCompanies = useMemo(() => {
    const seen = new Map<string, number>();
    for (const it of items) {
      const c = (it.company || "").trim();
      if (!c) continue;
      seen.set(c, (seen.get(c) || 0) + 1);
    }
    return Array.from(seen.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  // 检测「相同公司 + 相同岗位」是否已存在（软提示，不阻断）
  // 只对当前激活的岗位做重复检测
  const duplicateHint = useMemo(() => {
    const c = (form.company || "").trim();
    const activeRoleDraft = roleDrafts[activeRole];
    const r = (activeRoleDraft?.role || "").trim();
    if (!c || !r) return "";
    const same = items.find(
      (it) =>
        it.company.trim() === c &&
        it.role.trim() === r &&
        (editingId ? it.id !== editingId : true)
    );
    if (same) {
      return `⚠️ 已存在相同公司+岗位：${same.company} · ${same.role}（${same.status}）`;
    }
    return "";
  }, [form.company, roleDrafts, activeRole, items, editingId]);

  // 同公司多岗位计数，用于列表 ×N 徽章
  const companyCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const c = (it.company || "").trim();
      if (!c) continue;
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [items]);

  const openCreate = (prefillCompany = "") => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      company: prefillCompany,
      applied_at: todayIso(),
      status: "applied",
    });
    // 新建时默认 1 条空岗位草稿
    setRoleDrafts([emptyRoleDraft()]);
    setActiveRole(0);
    setFormOpen(true);
  };

  const openEdit = (item: AppItem) => {
    setEditingId(item.id);
    // 共享字段放到 form，岗位独有字段放到单条 RoleDraft
    setForm({
      company: item.company,
      city: item.city,
      channel: item.channel,
      track: item.track,
      status: item.status,
      priority: item.priority,
      applied_at: item.applied_at,
    });
    setRoleDrafts([
      {
        _uid: uid(),
        role: item.role,
        apply_url: item.apply_url || "",
        jd_url: item.jd_url || "",
        salary: item.salary || "",
        notes: item.notes || "",
        exam_at: item.exam_at || "",
        exam_url: item.exam_url || "",
        exam_done: Boolean(item.exam_done),
        exam_result: item.exam_result || "",
        rounds: roundsFromItem(item),
      },
    ]);
    setActiveRole(0);
    setFormOpen(true);
  };

  /* ============ 岗位条目增删改 ============ */
  const addRoleEntry = () => {
    setRoleDrafts((prev) => [...prev, emptyRoleDraft()]);
    setActiveRole(roleDrafts.length);
  };
  const removeRoleEntry = (idx: number) => {
    if (roleDrafts.length <= 1) return; // 至少保留 1 条
    setRoleDrafts((prev) => prev.filter((_, i) => i !== idx));
    setActiveRole((cur) => Math.min(cur, roleDrafts.length - 2));
  };
  const updateRoleEntry = (idx: number, patch: Partial<RoleDraft>) => {
    setRoleDrafts((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };
  const updateRound = (idx: number, id: string, patch: Partial<InterviewRound>) => {
    setRoleDrafts((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              rounds: r.rounds.map((x) => (x.id === id ? { ...x, ...patch } : x)),
            }
          : r
      )
    );
  };
  const addRound = (idx: number, name = "一面") => {
    setRoleDrafts((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, rounds: [...r.rounds, newRound(name)] } : r
      )
    );
  };
  const removeRound = (idx: number, id: string) => {
    setRoleDrafts((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, rounds: r.rounds.filter((x) => x.id !== id) } : r
      )
    );
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    // 校验：所有岗位名称必填
    const empty = roleDrafts.findIndex((r) => !(r.role || "").trim());
    if (empty >= 0) {
      setError(`第 ${empty + 1} 号岗位名称必填`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        // 编辑模式：单条 PUT，取第 0 条岗位草稿
        const rd = roleDrafts[0];
        const payload = {
          ...form,
          role: rd.role,
          apply_url: rd.apply_url,
          jd_url: rd.jd_url,
          salary: rd.salary,
          notes: rd.notes,
          exam_at: rd.exam_at,
          exam_url: rd.exam_url,
          exam_done: rd.exam_done,
          exam_result: rd.exam_result,
          next_action_at: "",
          interview_at: "",
          interview_url: "",
          interview_done: false,
          interview_round: "",
          interview_result: "",
          events: rd.rounds,
        };
        const url = `${API}/api/tools/qiuzhao/applications/${editingId}`;
        const res = await fetch(url, {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(typeof body.detail === "string" ? body.detail : `保存失败 ${res.status}`);
          return;
        }
        setOkMsg("已更新");
        setFormOpen(false);
      } else {
        // 新建模式：多条 POST，每个岗位 1 条
        let failed = 0;
        for (let i = 0; i < roleDrafts.length; i++) {
          const rd = roleDrafts[i];
          const payload = {
            ...form,
            role: rd.role,
            apply_url: rd.apply_url,
            jd_url: rd.jd_url,
            salary: rd.salary,
            notes: rd.notes,
            exam_at: rd.exam_at,
            exam_url: rd.exam_url,
            exam_done: rd.exam_done,
            exam_result: rd.exam_result,
            next_action_at: "",
            interview_at: "",
            interview_url: "",
            interview_done: false,
            interview_round: "",
            interview_result: "",
            events: rd.rounds,
          };
          const res = await fetch(`${API}/api/tools/qiuzhao/applications`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify(payload),
          });
          if (!res.ok) failed++;
        }
        const okCount = roleDrafts.length - failed;
        if (failed === 0) {
          setOkMsg(`已添加 ${okCount} 条投递`);
          setFormOpen(false);
        } else {
          setError(`部分失败：成功 ${okCount}，失败 ${failed}`);
        }
      }
      await load(token);
    } finally {
      setSaving(false);
    }
  };

  // 预览「下一个节点」——取当前激活岗位的笔试/面试轮次
  const cur = roleDrafts[activeRole];
  const autoNext = previewNextAction(cur?.exam_at, cur?.exam_done, cur?.rounds || []);

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
                onClick={() => openCreate()}
                className="admin-btn admin-btn-primary text-xs"
              >
                <HiOutlinePlus className="mr-1 inline h-3.5 w-3.5" />
                添加投递
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

          {/* 数据可视化：状态分布 + 月度投递 + 14 天热力 */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid gap-3 lg:grid-cols-3"
            >
              {/* 左：状态分布条形图 */}
              <div className="qz-viz-card">
                <div className="qz-viz-title">
                  <span>状态分布 STATUS MIX</span>
                  <span className="text-[10px] tracking-normal text-gray-500">
                    {stats.total} 条投递
                  </span>
                </div>
                <div>
                  {(meta?.statuses || [])
                    .filter((s) => (stats.by_status?.[s.key] ?? 0) >= 0)
                    .map((s) => {
                      const n = stats.by_status?.[s.key] ?? 0;
                      const pct =
                        stats.total > 0
                          ? Math.round((n / stats.total) * 100)
                          : 0;
                      return (
                        <div className="qz-bar-row" key={s.key}>
                          <span className="qz-bar-label">{s.label}</span>
                          <div className="qz-bar-track">
                            <div
                              className="qz-bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: STATUS_STYLE[s.key]
                                  ? undefined
                                  : "",
                              }}
                            />
                          </div>
                          <span className="qz-bar-value">{n}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* 中：近 6 个月投递柱状图 */}
              <div className="qz-viz-card">
                <div className="qz-viz-title">
                  <span>月度投递 MONTHLY</span>
                  <span className="text-[10px] tracking-normal text-gray-500">
                    applied_at
                  </span>
                </div>
                <div className="qz-month-chart">
                  {monthlyApplied.arr.map((m) => {
                    const h = Math.max(
                      4,
                      Math.round((m.count / monthlyApplied.max) * 84)
                    );
                    return (
                      <div className="qz-month-col" key={m.ym}>
                        <div
                          className="qz-month-bar"
                          style={{ height: `${h}px` }}
                          data-count={m.count}
                          title={`${m.ym} 投递 ${m.count} 家`}
                        />
                        <div className="qz-month-label">{monthShort(m.ym)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 右：月历 + 点击筛选 */}
              <div className="qz-viz-card">
                <div className="qz-viz-title flex items-center justify-between gap-2">
                  <span>📅 投递月历</span>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear(calYear - 1);
                        } else setCalMonth(calMonth - 1);
                      }}
                      className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 hover:text-cyan-300"
                    >
                      ←
                    </button>
                    <span className="tools-mono min-w-[72px] text-center text-gray-200">
                      {calYear}-{String(calMonth + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 11) {
                          setCalMonth(0);
                          setCalYear(calYear + 1);
                        } else setCalMonth(calMonth + 1);
                      }}
                      className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 hover:text-cyan-300"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const n = new Date();
                        setCalYear(n.getFullYear());
                        setCalMonth(n.getMonth());
                      }}
                      className="ml-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 hover:text-cyan-300"
                    >
                      今天
                    </button>
                    {pickDate && (
                      <button
                        type="button"
                        onClick={() => setPickDate("")}
                        className="ml-1 rounded border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-rose-300 hover:bg-rose-500/20"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                </div>
                {(() => {
                  const { cells } = buildMonthCalendar(calYear, calMonth);
                  const today = todayIso();
                  // 按天聚合事件数（投递 + 笔面）
                  const dayCounts = new Map<string, { applied: number; events: number }>();
                  for (const it of items) {
                    if (it.applied_at) {
                      const cur = dayCounts.get(it.applied_at) || { applied: 0, events: 0 };
                      cur.applied++;
                      dayCounts.set(it.applied_at, cur);
                    }
                    if (it.exam_at) {
                      const cur = dayCounts.get(it.exam_at) || { applied: 0, events: 0 };
                      cur.events++;
                      dayCounts.set(it.exam_at, cur);
                    }
                    for (const r of roundsFromItem(it)) {
                      if (r.at) {
                        const cur = dayCounts.get(r.at) || { applied: 0, events: 0 };
                        cur.events++;
                        dayCounts.set(r.at, cur);
                      }
                    }
                  }
                  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
                  return (
                    <div className="mt-2">
                      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500">
                        {weekdayLabels.map((w) => (
                          <div key={w} className="text-center py-0.5">{w}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((c, i) => {
                          if (!c.iso) return <div key={i} className="h-10" />;
                          const count = dayCounts.get(c.iso);
                          const total = (count?.applied || 0) + (count?.events || 0);
                          const isToday = c.iso === today;
                          const isPicked = c.iso === pickDate;
                          return (
                            <button
                              key={c.iso}
                              type="button"
                              onClick={() =>
                                setPickDate(pickDate === c.iso! ? "" : c.iso!)
                              }
                              title={
                                total
                                  ? `${c.iso}：投递 ${count?.applied || 0}，笔面 ${count?.events || 0}，共 ${total} 项`
                                  : `${c.iso} 无事件`
                              }
                              className={[
                                "h-10 rounded-md relative flex flex-col items-center justify-center text-[12px] transition border",
                                isPicked
                                  ? "border-cyan-400 bg-cyan-400/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                                  : isToday
                                    ? "border-violet-400/40 bg-violet-400/10 text-violet-100"
                                    : total > 0
                                      ? "border-white/10 bg-white/[0.04] text-gray-200 hover:border-cyan-400/40 hover:bg-cyan-400/10"
                                      : "border-transparent bg-white/[0.015] text-gray-500 hover:text-gray-300",
                              ].join(" ")}
                            >
                              <span className="leading-none">{c.day}</span>
                              {total > 0 && (
                                <span className="mt-0.5 text-[9px] leading-none text-cyan-300/80">
                                  {count?.applied ? "📬" : ""}
                                  {count?.events ? "🎯" : ""}
                                  <span className="ml-0.5 opacity-70">·{total}</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
                        <span>📬 投递</span>
                        <span>🎯 笔面</span>
                        {pickDate && (
                          <span className="ml-auto text-cyan-300">
                            已筛选：{pickDate}（{filteredItems.length} 条）
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="admin-input min-w-[160px] flex-1 py-1.5 text-sm"
              placeholder="搜索公司 / 岗位 / 备注（200ms 防抖）"
              value={rawQ}
              onChange={(e) => setRawQ(e.target.value)}
            />
            {/* 多选反选式状态筛选：小胶囊复选框 */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(meta?.statuses || []).map((s) => {
                const on = selectedStatus.has(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setSelectedStatus((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.key)) next.delete(s.key);
                        else next.add(s.key);
                        return next;
                      });
                    }}
                    className={[
                      "px-2 py-1 rounded-full text-[11px] border transition",
                      on
                        ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                        : "border-white/5 bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    {s.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    new Set((meta?.statuses || []).map((s) => s.key))
                  )
                }
                className="text-[11px] text-gray-500 hover:text-cyan-300 underline-offset-2 hover:underline"
              >
                全选
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus(new Set())}
                className="text-[11px] text-gray-500 hover:text-rose-300 underline-offset-2 hover:underline"
              >
                清空
              </button>
            </div>
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
                  <th className="px-3 py-2.5">公司 · 岗位</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">投递日</th>
                  <th className="px-3 py-2.5">笔试</th>
                  <th className="px-3 py-2.5">面试</th>
                  <th className="px-3 py-2.5">最近节点</th>
                  <th className="px-3 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="group border-b border-white/5 text-gray-300 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-white">
                          {item.company}
                        </span>
                        {(companyCountMap.get(item.company.trim()) || 0) > 1 && (
                          <span
                            title={`${item.company} 共有 ${companyCountMap.get(item.company.trim())} 个岗位在投`}
                            className="inline-flex h-5 items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-1.5 text-[10px] font-semibold text-cyan-300"
                          >
                            ×{companyCountMap.get(item.company.trim())}
                          </span>
                        )}
                        <button
                          type="button"
                          title={`为 ${item.company} 再加一个岗位投递`}
                          onClick={() => openCreate(item.company)}
                          className="inline-flex h-5 items-center gap-0.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 text-[10px] font-semibold text-emerald-300 opacity-0 transition group-hover:opacity-100 hover:bg-emerald-400/20"
                        >
                          <HiOutlinePlus className="h-2.5 w-2.5" />
                          新岗位
                        </button>
                        {item.priority === "urgent" && (
                          <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-500/30">
                            ⚡ 急
                          </span>
                        )}
                        {item.priority === "high" && (
                          <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                            ↑ 高
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        <span className="text-gray-300">{item.role || "未填岗位"}</span>
                        
                        
                        
                      </div>
                      {/* 招聘流程进度条（动态展开一轮/二轮…） */}
                      {(() => {
                        const rs = roundsFromItem(item);
                        const hasExam = Boolean(item.exam_at || item.exam_url || item.exam_done);
                        const { steps, pct } = buildPipelineSteps(item.status, rs, hasExam);
                        const isTerminal = TERMINAL.has(item.status);
                        return (
                          <div className="qz-track-wrap">
                            <div className="qz-track-bar">
                              <div
                                className="qz-track-fill"
                                style={{
                                  width: `${pct}%`,
                                  filter: isTerminal
                                    ? "saturate(0.3) brightness(0.72) hue-rotate(-10deg)"
                                    : undefined,
                                }}
                              />
                            </div>
                            <div className="qz-track-steps">
                              {steps.map((s) => {
                                const cls =
                                  s.state === "dead"
                                    ? "text-rose-400/80"
                                    : s.state === "done"
                                      ? "done"
                                      : s.state === "active"
                                        ? "active"
                                        : "";
                                return (
                                  <span key={s.key} className={cls}>
                                    {s.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 快捷链接按钮组：官网投递 / JD / 笔试 / 最近面试会议 */}
                      {(() => {
                        const rs = roundsFromItem(item);
                        const nextMeeting = rs.find((r) => r.url && !r.done) || rs.find((r) => r.url);
                        return (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <a
                              href={item.apply_url || undefined}
                              target="_blank"
                              rel="noreferrer"
                              title={item.apply_url ? "打开官网投递页面" : "没填官网投递链接"}
                              className={[
                                "inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px]",
                                item.apply_url
                                  ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 hover:text-white"
                                  : "cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600",
                              ].join(" ")}
                              onClick={(e) => {
                                if (!item.apply_url) e.preventDefault();
                              }}
                            >
                              🚀 <span>投递</span>
                            </a>
                            <a
                              href={item.jd_url || undefined}
                              target="_blank"
                              rel="noreferrer"
                              title={item.jd_url ? "打开 JD 页面" : "没填 JD 链接"}
                              className={[
                                "inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px]",
                                item.jd_url
                                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 hover:text-white"
                                  : "cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600",
                              ].join(" ")}
                              onClick={(e) => {
                                if (!item.jd_url) e.preventDefault();
                              }}
                            >
                              📄 <span>JD</span>
                            </a>
                            <a
                              href={item.exam_url || undefined}
                              target="_blank"
                              rel="noreferrer"
                              title={item.exam_url ? "打开笔试链接" : "没填笔试链接"}
                              className={[
                                "inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px]",
                                item.exam_url
                                  ? "border-amber-400/25 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 hover:text-white"
                                  : "cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600",
                              ].join(" ")}
                              onClick={(e) => {
                                if (!item.exam_url) e.preventDefault();
                              }}
                            >
                              🖋️ <span>笔试</span>
                            </a>
                            <a
                              href={nextMeeting?.url || undefined}
                              target="_blank"
                              rel="noreferrer"
                              title={nextMeeting?.url ? `打开会议：${nextMeeting.round}` : "没填面试会议链接"}
                              className={[
                                "inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px]",
                                nextMeeting?.url
                                  ? "border-violet-400/30 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20 hover:text-white"
                                  : "cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600",
                              ].join(" ")}
                              onClick={(e) => {
                                if (!nextMeeting?.url) e.preventDefault();
                              }}
                            >
                              🎥 <span>{nextMeeting?.round || "面试"}</span>
                            </a>
                          </div>
                        );
                      })()}
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
                      {(() => {
                        const rs = roundsFromItem(item);
                        if (!rs.length && !item.interview_at) {
                          return <span className="text-gray-600">—</span>;
                        }
                        const list = rs.length
                          ? rs
                          : [
                              {
                                round: item.interview_round || "面试",
                                at: item.interview_at,
                                url: item.interview_url,
                                done: item.interview_done,
                                result: item.interview_result,
                              },
                            ];
                        return (
                          <div className="space-y-1">
                            {list.map((r, idx) => (
                              <div key={idx} className="flex flex-wrap items-center gap-1">
                                <span className="text-violet-300/90">
                                  {r.round || `第${idx + 1}面`}
                                </span>
                                <span className="tools-mono text-gray-400">
                                  {r.at || "待定"}
                                </span>
                                {r.url && (
                                  <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="qz-link-chip"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <HiOutlineLink className="h-3 w-3" />
                                  </a>
                                )}
                                {r.done ? (
                                  <span className="text-emerald-400">完</span>
                                ) : null}
                                {r.result === "fail" && (
                                  <span className="text-rose-400">挂</span>
                                )}
                                {r.result === "pass" && (
                                  <span className="text-emerald-400">过</span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
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
                        title="由笔试/面试日期自动计算"
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
                {!filteredItems.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-gray-500"
                    >
                      还没有记录，点右上角「添加投递」
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
              const colItems = filteredItems.filter((i) => i.status === col);
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
                        <div className="text-sm font-semibold tracking-tight text-white flex flex-wrap items-center gap-1.5">
                          {item.company}
                          {(companyCountMap.get(item.company.trim()) || 0) > 1 && (
                            <span
                              title={`${item.company} 共有 ${companyCountMap.get(item.company.trim())} 个岗位在投`}
                              className="inline-flex h-4.5 items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-1.5 text-[9px] font-semibold text-cyan-300"
                              style={{ height: 18 }}
                            >
                              ×{companyCountMap.get(item.company.trim())}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--tools-muted)]">
                          {item.role || "未填岗位"}
                        </div>
                        {/* 卡片内快捷链接按钮组 */}
                        {(() => {
                          const rs = roundsFromItem(item);
                          const nextMeeting = rs.find((r) => r.url && !r.done) || rs.find((r) => r.url);
                          const anyLink = item.apply_url || item.exam_url || nextMeeting?.url;
                          if (!anyLink) return null;
                          const chip =
                            "inline-flex h-5 items-center gap-0.5 rounded border px-1 text-[9px] transition active:scale-95";
                          return (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.apply_url && (
                                <a
                                  href={item.apply_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="官网投递"
                                  className={`${chip} border-cyan-400/25 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 hover:text-white`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🚀投递
                                </a>
                              )}                              {item.exam_url && (
                                <a
                                  href={item.exam_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="笔试链接"
                                  className={`${chip} border-amber-400/20 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 hover:text-white`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🖋️笔试
                                </a>
                              )}
                              {nextMeeting?.url && (
                                <a
                                  href={nextMeeting.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={`面试会议：${nextMeeting.round}`}
                                  className={`${chip} border-violet-400/25 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20 hover:text-white`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🎥{nextMeeting.round || "面试"}
                                </a>
                              )}
                            </div>
                          );
                        })()}
                        {/* 卡片内迷你进度条（百分比按动态步骤算） */}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                          {(() => {
                            const rs = roundsFromItem(item);
                            const hasExam = Boolean(item.exam_at || item.exam_url || item.exam_done);
                            const { pct } = buildPipelineSteps(item.status, rs, hasExam);
                            return (
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400"
                                style={{
                                  width: `${pct}%`,
                                  filter: TERMINAL.has(item.status)
                                    ? "saturate(0.3) brightness(0.7) hue-rotate(-10deg)"
                                    : undefined,
                                  boxShadow: "0 0 6px rgba(167,139,250,0.45)",
                                }}
                              />
                            );
                          })()}
                        </div>
                        {item.next_action_at && (
                          <div
                            className={`tools-mono mt-1.5 text-[10px] ${
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
                暂无临近日程（给笔试/面试填上日期就会出现）
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {editingId ? "编辑投递" : "添加投递"}
                </h2>
                <p className="qz-hint mt-0.5">
                  同一公司可添加多个不同岗位 · 笔试/面试按需填
                </p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-ghost text-xs"
                onClick={() => setFormOpen(false)}
              >
                关闭
              </button>
            </div>

            {/* ========= 共享信息：公司 + 通用字段 ========= */}
            <div className="grid gap-2.5 sm:grid-cols-6">
              <label className="block sm:col-span-3">
                <span className="admin-field-label">公司 *</span>
                <input
                  list="qz-company-list"
                  className="admin-input"
                  required
                  autoFocus
                  placeholder="如：字节跳动（支持下拉选已有公司）"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
                <datalist id="qz-company-list">
                  {distinctCompanies.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}（×{c.count}）
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="block sm:col-span-2">
                <span className="admin-field-label">状态</span>
                <select
                  className="admin-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {(meta?.statuses || []).map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="admin-field-label">投递日期</span>
                <input
                  type="date" readOnly
                  className="admin-input"
                  value={form.applied_at}
                  onChange={(e) => setForm({ ...form, applied_at: e.target.value })}
                />
              </label>
              {duplicateHint && (
                <div className="sm:col-span-6 rounded-lg border border-rose-500/30 bg-rose-500/[0.07] px-3 py-2 text-xs text-rose-300">
                  {duplicateHint}（仍然可保存，不会限制你）
                </div>
              )}
            </div>

            {/* ========= 岗位条目：支持 1~N ========= */}
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-slate-950/40 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-xs font-semibold text-cyan-200">
                    岗位
                    <span className="text-white/95">
                      {roleDrafts.length === 1
                        ? "1"
                        : `${activeRole + 1}/${roleDrafts.length}`}
                    </span>
                  </span>
                  <span className="qz-hint">
                    同一家公司可同时添加多个岗位 · 各自独立的笔面流程
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost px-2 py-1 text-[11px]"
                    disabled={activeRole === 0}
                    onClick={() => setActiveRole((v) => Math.max(0, v - 1))}
                  >
                    ← 上一个
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost px-2 py-1 text-[11px]"
                    disabled={activeRole >= roleDrafts.length - 1}
                    onClick={() =>
                      setActiveRole((v) => Math.min(roleDrafts.length - 1, v + 1))
                    }
                  >
                    下一个 →
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary px-2 py-1 text-[11px]"
                    onClick={addRoleEntry}
                  >
                    + 再加岗位
                  </button>
                  <button
                    type="button"
                    disabled={roleDrafts.length <= 1 || !!editingId}
                    title={editingId ? "编辑模式下不支持新增岗位条目，请直接新建投递" : undefined}
                    className="px-2 py-1 text-[11px] rounded-md border border-rose-500/25 bg-rose-500/[0.07] text-rose-300 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => removeRoleEntry(activeRole)}
                  >
                    × 删除该岗位
                  </button>
                </div>
              </div>

              {/* 标签页：所有岗位条目 Tab */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {roleDrafts.map((rd, idx) => (
                  <button
                    key={rd._uid}
                    type="button"
                    onClick={() => setActiveRole(idx)}
                    className={[
                      "px-2.5 py-1 rounded-full text-[11px] border transition",
                      idx === activeRole
                        ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                        : "border-white/5 bg-white/[0.02] text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    <span className="tools-mono mr-1 opacity-60">{idx + 1}</span>
                    {rd.role ? rd.role : "（未填岗位）"}
                  </button>
                ))}
              </div>

              {/* 当前激活的岗位草稿卡 */}
              {roleDrafts.map((rd, idx) =>
                idx !== activeRole ? null : (
                  <div key={rd._uid} className="space-y-3">
                    {/* 岗位基本信息：岗位名 + 官网投递链接 + JD链接 */}
                    <div className="grid gap-2.5 sm:grid-cols-6">
                      <label className="block sm:col-span-6">
                        <span className="admin-field-label">岗位 *</span>
                        <input
                          className="admin-input"
                          required
                          placeholder="如：后端开发 / 客户端 / Java 开发"
                          value={rd.role}
                          onChange={(e) =>
                            updateRoleEntry(idx, { role: e.target.value })
                          }
                        />
                      </label>
                      <label className="block sm:col-span-6">
                        <span className="admin-field-label">
                          🚀 官网投递链接
                        </span>
                        <input
                          className="admin-input"
                          placeholder="https://jobs.bytedance.com/..."
                          value={rd.apply_url}
                          onChange={(e) =>
                            updateRoleEntry(idx, { apply_url: e.target.value })
                          }
                        />
                      </label>
                    </div>

                    {/* 笔试块 — 绑定当前岗位 */}
                    <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
                      <div className="mb-2 text-xs font-semibold text-amber-200/90">
                        笔试（没有可留空）
                      </div>
                      <div className="grid gap-2 sm:grid-cols-12">
                        <label className="block sm:col-span-3">
                          <span className="admin-field-label">日期</span>
                          <input
                            type="date" readOnly
                            className="admin-input"
                            value={rd.exam_at}
                            onChange={(e) =>
                              updateRoleEntry(idx, { exam_at: e.target.value })
                            }
                          />
                        </label>
                        <label className="block sm:col-span-5">
                          <span className="admin-field-label">链接</span>
                          <input
                            className="admin-input"
                            placeholder="https://..."
                            value={rd.exam_url}
                            onChange={(e) =>
                              updateRoleEntry(idx, { exam_url: e.target.value })
                            }
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="admin-field-label">结果</span>
                          <select
                            className="admin-input"
                            value={rd.exam_result}
                            onChange={(e) =>
                              updateRoleEntry(idx, { exam_result: e.target.value })
                            }
                          >
                            <option value="">未填</option>
                            <option value="pending">待出</option>
                            <option value="pass">通过</option>
                            <option value="fail">挂了</option>
                            <option value="skip">免笔</option>
                          </select>
                        </label>
                        <label className="flex items-end gap-2 pb-2 text-xs text-gray-400 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={rd.exam_done}
                            onChange={(e) =>
                              updateRoleEntry(idx, { exam_done: e.target.checked })
                            }
                          />
                          已考完
                        </label>
                      </div>
                    </div>

                    {/* 面试轮次块 — 绑定当前岗位 */}
                    <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-violet-200/90">
                          面试轮次
                        </div>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost px-2 py-1 text-[11px]"
                          onClick={() => {
                            const nextName =
                              ROUND_NAMES[
                                Math.min(rd.rounds.length, ROUND_NAMES.length - 1)
                              ] || `第${rd.rounds.length + 1}面`;
                            addRound(idx, nextName);
                          }}
                        >
                          + 加一轮
                        </button>
                      </div>
                      {!rd.rounds.length && (
                        <p className="qz-hint mb-2">
                          还没有面试，点「加一轮」：一面 / 二面 / HR…
                        </p>
                      )}
                      <div className="space-y-2">
                        {rd.rounds.map((r, rIdx) => (
                          <div key={r.id} className="qz-round-card">
                            <div className="grid gap-2 sm:grid-cols-12">
                              <label className="block sm:col-span-2">
                                <span className="admin-field-label">轮次</span>
                                <select
                                  className="admin-input"
                                  value={r.round}
                                  onChange={(e) =>
                                    updateRound(idx, r.id, { round: e.target.value })
                                  }
                                >
                                  {ROUND_NAMES.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                  {!ROUND_NAMES.includes(r.round) && r.round && (
                                    <option value={r.round}>{r.round}</option>
                                  )}
                                </select>
                              </label>
                              <label className="block sm:col-span-3">
                                <span className="admin-field-label">日期</span>
                                <input
                                  type="date" readOnly
                                  className="admin-input"
                                  value={r.at}
                                  onChange={(e) =>
                                    updateRound(idx, r.id, { at: e.target.value })
                                  }
                                />
                              </label>
                              <label className="block sm:col-span-4">
                                <span className="admin-field-label">会议链接</span>
                                <input
                                  className="admin-input"
                                  placeholder="腾讯会议 / 飞书…"
                                  value={r.url}
                                  onChange={(e) =>
                                    updateRound(idx, r.id, { url: e.target.value })
                                  }
                                />
                              </label>
                              <label className="block sm:col-span-2">
                                <span className="admin-field-label">结果</span>
                                <select
                                  className="admin-input"
                                  value={r.result}
                                  onChange={(e) =>
                                    updateRound(idx, r.id, { result: e.target.value })
                                  }
                                >
                                  <option value="">未填</option>
                                  <option value="pending">待出</option>
                                  <option value="pass">通过</option>
                                  <option value="fail">挂了</option>
                                </select>
                              </label>
                              <div className="flex items-end justify-between gap-2 sm:col-span-1">
                                <label className="flex items-center gap-1 pb-2 text-[11px] text-gray-400">
                                  <input
                                    type="checkbox"
                                    checked={r.done}
                                    onChange={(e) =>
                                      updateRound(idx, r.id, { done: e.target.checked })
                                    }
                                  />
                                  完
                                </label>
                                <button
                                  type="button"
                                  className="mb-1 text-[11px] text-rose-300/80 hover:text-rose-200"
                                  onClick={() => removeRound(idx, r.id)}
                                  aria-label={`删除第${rIdx + 1}轮`}
                                >
                                  删
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {autoNext && (
              <p className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-200/90">
                最近节点（自动，基于当前岗位）：
                <span className="tools-mono ml-1 font-semibold">{autoNext}</span>
                <span className="ml-2 text-cyan-200/50">
                  由未完成的笔试/面试日期算出，不用手填
                </span>
              </p>
            )}

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





