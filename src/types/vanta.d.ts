declare module "vanta/dist/vanta.net.min" {
  import type * as THREE from "three";

  type VantaEffect = {
    destroy: () => void;
    resize: () => void;
    setOptions: (opts: Record<string, unknown>) => void;
  };

  type NetOptions = {
    el: HTMLElement | string;
    THREE?: typeof THREE;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color?: number;
    backgroundColor?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
  };

  export default function NET(options: NetOptions): VantaEffect;
}
