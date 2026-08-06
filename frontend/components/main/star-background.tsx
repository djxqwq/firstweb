"use client";

import {
  Points,
  PointMaterial,
  type PointsInstancesProps,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as random from "maath/random";
import { useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import type { Points as PointsType } from "three";

function safeSphere(count = 1400, radius = 1.2) {
  const n = Math.floor(count / 3) * 3;
  const arr = new Float32Array(n);
  random.inSphere(arr, { radius });
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) arr[i] = 0;
  }
  return arr;
}

function VisibilityGate({ children }: { children: ReactNode }) {
  const { invalidate, frameloop, set } = useThree();
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        set({ frameloop: "never" });
      } else {
        set({ frameloop: "always" });
        invalidate();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [invalidate, set]);
  // keep frameloop prop in sync for lint
  void frameloop;
  return <>{children}</>;
}

export const StarBackground = (props: PointsInstancesProps) => {
  const ref = useRef<PointsType | null>(null);
  const [sphere] = useState(() => safeSphere(1400, 1.2));

  useFrame((_state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x -= delta / 18;
    ref.current.rotation.y -= delta / 26;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} stride={3} positions={sphere} frustumCulled {...props}>
        <PointMaterial
          transparent
          color="#a5f3fc"
          size={0.003}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

/** Keep starfield — only pause when tab is hidden */
export const StarsCanvas = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 h-auto w-full">
    <Canvas
      camera={{ position: [0, 0, 1] }}
      dpr={1}
      frameloop="always"
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: true,
      }}
    >
      <Suspense fallback={null}>
        <VisibilityGate>
          <StarBackground />
        </VisibilityGate>
      </Suspense>
    </Canvas>
  </div>
);
