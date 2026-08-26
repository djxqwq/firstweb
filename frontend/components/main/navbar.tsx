"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { NAV_LINKS, SOCIALS } from "@/constants";

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hub = document.getElementById("hub");
      if (!hub) {
        setShow(window.scrollY > 80);
        return;
      }
      // show nav after leaving the fluid intro
      setShow(hub.getBoundingClientRect().top < window.innerHeight * 0.55);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 z-50 h-[65px] w-full px-10 shadow-lg shadow-[#2A0E61]/50 backdrop-blur-md transition duration-300 ${
        show
          ? "translate-y-0 bg-[#030014]/70 opacity-100"
          : "pointer-events-none -translate-y-4 bg-transparent opacity-0"
      }`}
    >
      <div className="m-auto flex h-full w-full items-center justify-between px-[10px]">
        <Link href="#intro" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={48}
            height={48}
            priority
            draggable={false}
            className="cursor-pointer rounded-full bg-[#030014] ring-1 ring-white/10"
          />
          <div className="ml-[10px] hidden font-bold text-gray-300 md:flex">
            个人技术博客 · 邓锦鑫
          </div>
        </Link>

        <div className="hidden h-full w-[720px] flex-row items-center justify-between md:mr-20 md:flex">
          <div className="mr-[15px] flex h-auto w-full items-center justify-between gap-3 rounded-full border-[rgba(112,66,248,0.38)] bg-[rgba(3,0,20,0.37)] px-[20px] py-[10px] text-sm text-gray-200">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.title}
                href={link.link}
                className="group relative cursor-pointer transition hover:text-cyan-200"
              >
                {link.title}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-violet-400 to-cyan-400 transition-all group-hover:w-full" />
              </Link>
            ))}
            <Link
              href="/workspace"
              className="group relative cursor-pointer transition hover:text-cyan-200"
            >
              工作台
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-violet-400 to-cyan-400 transition-all group-hover:w-full" />
            </Link>
            <Link
              href="#intro"
              className="group relative cursor-pointer transition hover:text-cyan-200"
            >
              回顶部
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-violet-400 to-cyan-400 transition-all group-hover:w-full" />
            </Link>
          </div>
        </div>

        <div className="hidden flex-row gap-5 md:flex">
          {SOCIALS.map(({ link, name, icon: Icon }) => (
            <Link
              href={link}
              target="_blank"
              rel="noreferrer noopener"
              key={name}
            >
              <Icon className="h-6 w-6 text-white" />
            </Link>
          ))}
        </div>

        <button
          className="text-4xl text-white focus:outline-none md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute left-0 top-[65px] flex w-full flex-col items-center bg-[#030014] p-5 text-gray-300 md:hidden">
          <div className="flex flex-col items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.title}
                href={link.link}
                className="cursor-pointer text-center transition hover:text-[rgb(112,66,248)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.title}
              </Link>
            ))}
            <Link
              href="/workspace"
              className="cursor-pointer text-center transition hover:text-[rgb(112,66,248)]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              工作台
            </Link>
            <Link
              href="#intro"
              className="cursor-pointer text-center transition hover:text-[rgb(112,66,248)]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              回顶部
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
