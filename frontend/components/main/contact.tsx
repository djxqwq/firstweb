"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { sendMessage } from "@/lib/api";

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

export const Contact = () => {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    try {
      await sendMessage(name || "visitor", content);
      setStatus("ok");
      setContent("");
      setBurst((n) => n + 1);
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
            placeholder="想说的话"
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
            <p className="text-center text-sm text-cyan-300">已收到</p>
          )}
          {status === "err" && (
            <p className="text-center text-sm text-rose-300">发送失败</p>
          )}
        </motion.form>
      </div>
    </section>
  );
};
