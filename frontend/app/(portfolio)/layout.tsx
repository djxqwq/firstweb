import type { PropsWithChildren } from "react";
import { CosmicCursor } from "@/components/main/cosmic-cursor";
import { Footer } from "@/components/main/footer";
import { InteractiveCanvas } from "@/components/main/interactive-canvas";
import { LazyVideos } from "@/components/main/lazy-videos";
import { Navbar } from "@/components/main/navbar";
import { SpaceMusicPlayer } from "@/components/main/space-music-player";
import { StarsCanvas } from "@/components/main/star-background";
import { VpnBlocker } from "@/components/main/vpn-blocker";

export default function PortfolioLayout({ children }: PropsWithChildren) {
  return (
    <VpnBlocker>
      <StarsCanvas />
      <InteractiveCanvas />
      <CosmicCursor />
      <LazyVideos />
      <Navbar />
      {children}
      <SpaceMusicPlayer />
      <Footer />
    </VpnBlocker>
  );
}
