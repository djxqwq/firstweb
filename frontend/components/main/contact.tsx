"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchMessages, sendMessage, type MessageItem } from "@/lib/api";

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

  const loadMessages = () =>
    fetchMessages(30).then((data) => setMessages(data));

  useEffect(() => {
    loadMessages();
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
      loadMessages();
    } catch {
      setStatus("err");
    } finally {
      setLoading(false);
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
            placeholder="想说的话（提交后会在下方留言墙公开显示）"
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
            <p className="text-center text-sm text-cyan-300">
              已收到，留言已上墙
            </p>
          )}
          {status === "err" && (
            <p className="text-center text-sm text-rose-300">发送失败</p>
          )}
        </motion.form>
      </div>

      {/* ====== 留言墙 ====== */}
      <div className="mt-16 w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-purple-400/50" />
          <h2 className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-2xl font-medium text-transparent">
            留言墙
          </h2>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400/50" />
        </div>

        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            还没有留言，快来抢沙发吧 🌟
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {messages.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className={`rounded-2xl border p-5 backdrop-blur-sm ${
                  m.is_admin
                    ? "border-purple-400/50 bg-purple-500/[0.08] shadow-[0_0_24px_rgba(168,85,247,0.18)]"
                    : "border-white/10 bg-[#0a0618]/70"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.is_admin
                          ? "bg-purple-500/20 text-purple-200"
                          : "bg-cyan-500/15 text-cyan-200"
                      }`}
                    >
                      {m.is_admin ? "博主" : m.name || "访客"}
                    </span>
                    {m.reply_to && (
                      <span className="text-[10px] text-gray-500">
                        回复 #{m.reply_to}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {fmtTime(m.created_at)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-200">
                  {m.content}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
