"use client";

import { useEffect, useState } from "react";

/**
 * Entrance uses open-source SystemBreach Preloader (MIT),
 * embedded from /public/boot — not a hand-rolled fake boot screen.
 * https://github.com/ItsWanheda/SystemBreach-Preloader
 */

type Props = { onDone?: () => void };

export function BootPreloader({ onDone }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("boot_done") === "1") {
      onDone?.();
      return;
    }
    setShow(true);
  }, [onDone]);

  useEffect(() => {
    if (!show) return;

    const finish = () => {
      sessionStorage.setItem("boot_done", "1");
      setShow(false);
      onDone?.();
    };

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "boot-done") finish();
    };

    // Safety net if iframe fails to load
    const failSafe = window.setTimeout(finish, 12000);

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(failSafe);
    };
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030014]">
      <iframe
        title="System boot"
        src="/boot/index.html"
        className="h-full w-full border-0"
        allow="autoplay"
      />
    </div>
  );
}
