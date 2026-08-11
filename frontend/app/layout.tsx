import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import type { PropsWithChildren } from "react";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#030014",
};

export const metadata: Metadata = siteConfig;

const BOOT_CSS = `
#site-boot-gate{
  position:fixed;inset:0;z-index:9998;
  background:#030014;pointer-events:all;
}
html.booting,html.booting body{overflow:hidden!important;}
html.admin-route #site-boot-gate,
#site-boot-gate[data-done="1"]{
  display:none!important;pointer-events:none!important;
}
html.admin-route,html.admin-route body{overflow:auto!important;}
`;

const ADMIN_BOOT_JS = `(function(){try{if(location.pathname.indexOf('/admin')===0){document.documentElement.classList.remove('booting');document.documentElement.classList.add('admin-route');}}catch(e){}})();`;

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN" className="booting" suppressHydrationWarning>
      <body
        className={cn(
          "bg-[#030014] overflow-y-scroll overflow-x-hidden antialiased",
          inter.variable
        )}
        suppressHydrationWarning
      >
        {/* 首屏黑遮罩样式；勿用脚本 remove 该节点，否则 React 水合 #418 */}
        <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
        <Script
          id="admin-boot-route"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: ADMIN_BOOT_JS }}
        />
        <div id="site-boot-gate" aria-hidden suppressHydrationWarning />
        {children}
      </body>
    </html>
  );
}
