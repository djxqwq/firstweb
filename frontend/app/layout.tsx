import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { PropsWithChildren } from "react";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#030014",
};

export const metadata: Metadata = siteConfig;

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN" className="booting">
      <head>
        {/* Instant black cover before React — no empty static flash */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
#site-boot-gate{
  position:fixed;inset:0;z-index:9998;
  background:#030014;pointer-events:all;
}
html.booting,html.booting body{overflow:hidden!important;}
`,
          }}
        />
      <body
        className={cn(
          "bg-[#030014] overflow-y-scroll overflow-x-hidden antialiased",
          inter.variable
        )}
      >
        <div id="site-boot-gate" aria-hidden />
        <script
          dangerouslySetInnerHTML={{
            __html: `if(location.pathname.indexOf('/admin')===0){document.documentElement.classList.remove('booting');var g=document.getElementById('site-boot-gate');if(g)g.remove();}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
