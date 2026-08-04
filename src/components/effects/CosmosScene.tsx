"use client";

import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { Stars, Sparkles, Float } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type SkyHotspot = {
  id: string;
  label: string;
  kind: "project" | "honor" | "egg";
  position: [number, number, number];
};

function NebulaDome() {
  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load("/assets/space/deep-space.jpg");
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const milky = useMemo(() => {
    const t = new THREE.TextureLoader().load("/assets/space/nebula-hero.jpg");
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[90, 64, 64]} />
        <meshBasicMaterial map={tex} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, -6, -28]} scale={[75, 40, 1]}>
        <planeGeometry />
        <meshBasicMaterial
          map={milky}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

function GalaxyCore() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color("#67e8f9");
    const c2 = new THREE.Color("#fbbf24");
    const c3 = new THREE.Color("#c4b5fd");
    for (let i = 0; i < count; i++) {
      const arm = i % 4;
      const t = i / count;
      const radius = Math.pow(t, 0.55) * 18;
      const angle = t * Math.PI * 4 + (arm * Math.PI) / 2;
      const spread = (Math.random() - 0.5) * (0.4 + t * 2.2);
      positions[i * 3] = Math.cos(angle) * radius + Math.cos(angle) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * (0.3 + t * 1.4);
      positions[i * 3 + 2] = Math.sin(angle) * radius + Math.sin(angle) * spread;
      const col = arm % 3 === 0 ? c1 : arm % 3 === 1 ? c2 : c3;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.04;
  });

  return (
    <points ref={ref} geometry={geo} position={[0, 0, -6]}>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function HotspotOrb({
  hotspot,
  onSelect,
}: {
  hotspot: SkyHotspot;
  onSelect: (h: SkyHotspot) => void;
}) {
  const [hover, setHover] = useState(false);
  const color = hotspot.kind === "honor" ? "#fbbf24" : hotspot.kind === "egg" ? "#f472b6" : "#67e8f9";

  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.6}>
      <group position={hotspot.position}>
        <mesh
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = "auto";
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelect(hotspot);
          }}
        >
          <sphereGeometry args={[hover ? 0.38 : 0.28, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={hover ? 1 : 0.75} />
        </mesh>
        <mesh scale={hover ? 2.4 : 1.8}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} />
        </mesh>
      </group>
    </Float>
  );
}

function MeteorField({ onCatch }: { onCatch: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const vel = useRef({ x: 0, y: 0, z: 0, alive: false, timer: 2 });

  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    vel.current.timer -= dt;
    if (!vel.current.alive && vel.current.timer < 0) {
      vel.current.alive = true;
      m.position.set(-18 + Math.random() * 8, 8 + Math.random() * 6, -4);
      vel.current.x = 12 + Math.random() * 8;
      vel.current.y = -8 - Math.random() * 4;
      vel.current.z = 0;
      m.visible = true;
    }
    if (vel.current.alive) {
      m.position.x += vel.current.x * dt;
      m.position.y += vel.current.y * dt;
      if (m.position.x > 22 || m.position.y < -12) {
        vel.current.alive = false;
        vel.current.timer = 4 + Math.random() * 6;
        m.visible = false;
      }
    }
  });

  return (
    <mesh
      ref={ref}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        onCatch();
        vel.current.alive = false;
        vel.current.timer = 3;
        if (ref.current) ref.current.visible = false;
      }}
    >
      <sphereGeometry args={[0.18, 12, 12]} />
      <meshBasicMaterial color="#fff7ed" />
    </mesh>
  );
}

function SceneContent({
  hotspots,
  onSelect,
  onMeteor,
}: {
  hotspots: SkyHotspot[];
  onSelect: (h: SkyHotspot) => void;
  onMeteor: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    mouse.current.x += (state.pointer.x - mouse.current.x) * 0.04;
    mouse.current.y += (state.pointer.y - mouse.current.y) * 0.04;
    if (group.current) {
      group.current.rotation.y = mouse.current.x * 0.25 + state.clock.elapsedTime * 0.015;
      group.current.rotation.x = -mouse.current.y * 0.12;
    }
  });

  return (
    <group ref={group}>
      <NebulaDome />
      <Stars radius={140} depth={70} count={6000} factor={4.5} saturation={0.15} fade speed={0.85} />
      <Sparkles count={140} scale={[50, 28, 50]} size={4} speed={0.4} opacity={0.7} color="#a5f3fc" />
      <GalaxyCore />
      {hotspots.map((h) => (
        <HotspotOrb key={h.id} hotspot={h} onSelect={onSelect} />
      ))}
      <MeteorField onCatch={onMeteor} />
    </group>
  );
}

type Props = {
  className?: string;
  hotspots: SkyHotspot[];
  onSelect: (h: SkyHotspot) => void;
  onMeteor: () => void;
};

export function CosmosScene({ className, hotspots, onSelect, onMeteor }: Props) {
  return (
    <div className={className}>
      <Canvas
        className="h-full w-full"
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.5, 16], fov: 55, near: 0.1, far: 400 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#020617", 1);
        }}
      >
        <Suspense fallback={null}>
          <SceneContent hotspots={hotspots} onSelect={onSelect} onMeteor={onMeteor} />
          <EffectComposer multisampling={0}>
            <Bloom luminanceThreshold={0.12} intensity={1.5} mipmapBlur />
            <Vignette offset={0.2} darkness={0.45} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
