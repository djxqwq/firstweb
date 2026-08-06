"use client";

import { useEffect, useState } from "react";

type TypeWriterProps = {
  lines: string[];
  /** ms per character */
  speed?: number;
  /** pause after a line finishes before deleting / next */
  holdMs?: number;
  /** delete then type next line in a loop */
  loop?: boolean;
  className?: string;
  cursorClassName?: string;
};

export function TypeWriter({
  lines,
  speed = 42,
  holdMs = 1600,
  loop = true,
  className = "",
  cursorClassName = "",
}: TypeWriterProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!lines.length) return;
    const full = lines[lineIndex % lines.length];

    if (!deleting && text === full) {
      if (!loop && lineIndex >= lines.length - 1) return;
      const t = window.setTimeout(() => setDeleting(true), holdMs);
      return () => window.clearTimeout(t);
    }

    if (deleting && text === "") {
      setDeleting(false);
      setLineIndex((i) => (i + 1) % lines.length);
      return;
    }

    const delay = deleting ? speed / 1.8 : speed;
    const t = window.setTimeout(() => {
      const next = deleting
        ? full.slice(0, Math.max(0, text.length - 1))
        : full.slice(0, text.length + 1);
      setText(next);
    }, delay);

    return () => window.clearTimeout(t);
  }, [text, deleting, lineIndex, lines, speed, holdMs, loop]);

  return (
    <span className={className}>
      {text}
      <span
        aria-hidden
        className={`type-cursor ml-0.5 inline-block w-[0.55ch] align-[-0.12em] bg-current ${cursorClassName}`}
        style={{ height: "1.05em" }}
      />
    </span>
  );
}
