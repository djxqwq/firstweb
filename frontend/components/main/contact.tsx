"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchMessages,
  fetchMyInfo,
  likeMessage,
  replyMessagePublic,
  sendMessage,
  type MessageItem,
  type MyInfo,
} from "@/lib/api";

const LINKS = [
  {
    label: "邮箱",
    value: "1075751918@qq.com",
    href: "mailto:1075751918@qq.com",
  },
  {
    label: "GitHub",
    value: "github.com/djxqwq",
    href: "https://github.com/djxqwq",
  },
  {
    label: "CSDN",
    value: "blog.csdn.net/2302_79866931",
    href: "https://blog.csdn.net/2302_79866931",
  },
] as const;

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const Contact = () => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(0);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyName, setReplyName] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [likingId, setLikingId] = useState<number | null>(null);
  const [myInfo, setMyInfo] = useState<MyInfo | null>(null);

  const loadMessages = (p: number) =>
    fetchMessages(p, 10).then((data) => {
      setTotal(data.total);
      setHasMore(data.has_more);
      setPage(p);
      setMessages((prev) => (p === 1 ? data.items : [...prev, ...data.items]));
    });

  useEffect(() => {
    loadMessages(1);
    fetchMyInfo().then((info) => {
      if (info) setMyInfo(info);
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    try {
      await sendMessage(name || "visitor", content);
      setStatus("ok");
      setContent("");
      setBurst((n) => n + 1);
      loadMessages(1);
    } catch {
      setStatus("err");
    } finally {
      setLoading(false);
    }
  };

  const onLike = async (id: number) => {
    if (likingId === id) return;
    setLikingId(id);
    try {
      const r = await likeMessage(id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, likes: r.likes, liked: r.liked }
            : {
                ...m,
                replies: m.replies?.map((rp) =>
                  rp.id === id
                    ? { ...rp, likes: r.likes, liked: r.liked }
                    : rp
                ),
              }
        )
      );
    } finally {
      setLikingId(null);
    }
  };

  const submitReply = async (parentId: number) => {
    if (!replyContent.trim()) return;
    setReplying(true);
    try {
      await replyMessagePublic(parentId, replyName || "visitor", replyContent);
      setReplyContent("");
      setReplyTo(null);
      loadMessages(page);
    } finally {
      setReplying(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative flex flex-col items-center justify-center px-6 py-20"
    >
      <h1 className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text py-10 text-[40px] font-semibold text-transparent">
        联系我
      </h1>
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-3 rounded-2xl border border-[#7042f861] bg-[#030014]/70 p-8 text-gray-300"
        >
          <p className="text-sm text-purple-200">
            技术交流 / 算法探讨 / 实习合作
          </p>
          {LINKS.map((l) => (
            <motion.a
              key={l.href}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              whileHover={{ x: 6, borderColor: "rgba(34,211,238,0.45)" }}
              className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition"
            >
              <div className="text-[11px] tracking-wider text-gray-500">
                {l.label}
              </div>
              <div className="text-cyan-300">{l.value}</div>
            </motion.a>
          ))}
          <p className="pt-2 text-sm text-gray-500">
            微信 / QQ：djx201998 / 1075751918
          </p>

          {/* 访客自己的访问信息 */}
          {myInfo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.06] to-purple-500/[0.04] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                <span className="text-[11px] font-medium tracking-wider text-cyan-300/80">
                  你的访问信息
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <InfoRow label="IP" value={myInfo.ip || "未知"} mono />
                <InfoRow
                  label="地区"
                  value={
                    [myInfo.country, myInfo.region, myInfo.city]
                      .filter(Boolean)
                      .join(" · ") || "未知"
                  }
                />
                <InfoRow label="设备" value={myInfo.device || "未知"} />
                <InfoRow label="系统" value={myInfo.os || "未知"} />
                <InfoRow label="浏览器" value={myInfo.browser || "未知"} />
                {myInfo.isp && <InfoRow label="运营商" value={myInfo.isp} />}
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          onSubmit={onSubmit}
          className="relative space-y-4 overflow-hidden rounded-2xl border border-[#7042f861] bg-[#030014]/70 p-8"
        >
          {burst > 0 && (
            <motion.span
              key={burst}
              className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/40"
              initial={{ scale: 0.2, opacity: 0.7 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="称呼"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="想说的话（提交后会在下方留言区公开显示）"
            required
            className="min-h-[140px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
          />
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-3 text-sm text-white disabled:opacity-60"
          >
            {loading ? "发送中…" : "发送留言"}
          </motion.button>
          {status === "ok" && (
            <p className="text-center text-sm text-cyan-300">已收到，留言已发布</p>
          )}
          {status === "err" && (
            <p className="text-center text-sm text-rose-300">发送失败</p>
          )}
        </motion.form>
      </div>

      {/* ====== 留言区（社区化：点赞 + 嵌套回复 + 分页） ====== */}
      <div className="mt-16 w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-purple-400/50" />
          <h2 className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-2xl font-medium text-transparent">
            留言区 · {total}
          </h2>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400/50" />
        </div>

        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            还没有留言，快来抢沙发吧 🌟
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <MessageCard
                key={m.id}
                message={m}
                index={i}
                replyTo={replyTo}
                replyName={replyName}
                replyContent={replyContent}
                replying={replying}
                likingId={likingId}
                onReplyOpen={() => {
                  setReplyTo(replyTo === m.id ? null : m.id);
                  setReplyContent("");
                }}
                setReplyName={setReplyName}
                setReplyContent={setReplyContent}
                onSubmitReply={() => submitReply(m.id)}
                onLike={() => onLike(m.id)}
                onLikeReply={(rid) => onLike(rid)}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => loadMessages(page + 1)}
                  className="rounded-xl border border-cyan-400/40 px-6 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/10"
                >
                  加载更多
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

/* ---------- 访客信息小行 ---------- */
function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] tracking-wider text-gray-500">{label}</span>
      <span
        className={`truncate text-gray-200 ${mono ? "font-mono text-cyan-300" : ""}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

/* ---------- 单条留言卡片（含嵌套回复） ---------- */
function MessageCard({
  message,
  index,
  replyTo,
  replyName,
  replyContent,
  replying,
  likingId,
  onReplyOpen,
  setReplyName,
  setReplyContent,
  onSubmitReply,
  onLike,
  onLikeReply,
}: {
  message: MessageItem;
  index: number;
  replyTo: number | null;
  replyName: string;
  replyContent: string;
  replying: boolean;
  likingId: number | null;
  onReplyOpen: () => void;
  setReplyName: (v: string) => void;
  setReplyContent: (v: string) => void;
  onSubmitReply: () => void;
  onLike: () => void;
  onLikeReply: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className={`rounded-2xl border p-5 backdrop-blur-sm ${
        message.is_admin
          ? "border-purple-400/50 bg-purple-500/[0.06]"
          : "border-white/10 bg-[#0a0618]/70"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              message.is_admin
                ? "bg-purple-500/20 text-purple-200"
                : "bg-cyan-500/15 text-cyan-200"
            }`}
          >
            {message.is_admin ? "博主" : message.name || "访客"}
          </span>
        </div>
        <span className="text-[10px] text-gray-500">
          {fmtTime(message.created_at)}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-gray-200">{message.content}</p>

      <div className="mt-3 flex items-center gap-4 text-xs">
        <button
          type="button"
          onClick={onLike}
          disabled={likingId === message.id}
          className={`flex items-center gap-1 transition ${
            message.liked
              ? "text-rose-400"
              : "text-gray-500 hover:text-rose-300"
          } disabled:opacity-50`}
        >
          <span>{message.liked ? "❤️" : "🤍"}</span>
          <span>{message.likes}</span>
        </button>
        <button
          type="button"
          onClick={onReplyOpen}
          className="text-gray-500 transition hover:text-cyan-300"
        >
          {replyTo === message.id ? "收起" : "回复"}
        </button>
      </div>

      {/* 回复框 */}
      {replyTo === message.id && (
        <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
          <input
            value={replyName}
            onChange={(e) => setReplyName(e.target.value)}
            placeholder="称呼"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-400/40"
          />
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`回复 ${message.name || "访客"}…`}
            className="min-h-[60px] w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-400/40"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onReplyOpen}
              className="rounded-lg px-3 py-1 text-xs text-gray-400"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmitReply}
              disabled={replying || !replyContent.trim()}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-1 text-xs text-white disabled:opacity-50"
            >
              {replying ? "发送中…" : "回复"}
            </button>
          </div>
        </div>
      )}

      {/* 嵌套回复 */}
      {message.replies && message.replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-purple-400/20 pl-4">
          {message.replies.map((rp) => (
            <div
              key={rp.id}
              className={`rounded-xl border p-3 ${
                rp.is_admin
                  ? "border-purple-400/40 bg-purple-500/[0.08]"
                  : "border-white/5 bg-black/20"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    rp.is_admin
                      ? "bg-purple-500/20 text-purple-200"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {rp.is_admin ? "博主" : rp.name || "访客"}
                </span>
                <span className="text-[9px] text-gray-600">
                  {fmtTime(rp.created_at)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-300">
                {rp.content}
              </p>
              <button
                type="button"
                onClick={() => onLikeReply(rp.id)}
                disabled={likingId === rp.id}
                className={`mt-1.5 flex items-center gap-1 text-[11px] transition ${
                  rp.liked ? "text-rose-400" : "text-gray-600 hover:text-rose-300"
                } disabled:opacity-50`}
              >
                <span>{rp.liked ? "❤️" : "🤍"}</span>
                <span>{rp.likes}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
