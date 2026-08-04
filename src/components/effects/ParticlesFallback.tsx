"use client";

import Particles, { ParticlesProvider, useParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { loadStarsPreset } from "@tsparticles/preset-stars";
import type { Engine } from "@tsparticles/engine";

async function initEngine(engine: Engine) {
  await loadSlim(engine);
  await loadStarsPreset(engine);
}

function StarsLayer() {
  const { loaded } = useParticlesProvider();
  if (!loaded) return null;
  return (
    <Particles
      id="cosmos-fallback-stars"
      className="absolute inset-0"
      options={{
        preset: "stars",
        background: { color: { value: "transparent" } },
        fullScreen: { enable: false },
        particles: {
          number: { value: 120 },
          move: { speed: 0.2 },
        },
      }}
    />
  );
}

export function ParticlesFallback({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/assets/space/deep-space.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <ParticlesProvider init={initEngine}>
        <StarsLayer />
      </ParticlesProvider>
    </div>
  );
}
