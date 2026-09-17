import { normalizeAngle } from "./utils";

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

// Tilt-compensated compass heading from DeviceOrientationEvent
// alpha/beta/gamma (deg). Returns CW-from-north 0..360. Assumes alpha is
// Earth-frame yaw (i.e. deviceorientationabsolute or absolute:true).
export function tiltCompensatedHeading(
  alpha: number,
  beta: number,
  gamma: number,
): number {
  const a = alpha * RAD;
  const b = beta * RAD;
  const g = gamma * RAD;
  const cA = Math.cos(a);
  const sA = Math.sin(a);
  const cB = Math.cos(b);
  const sB = Math.sin(b);
  const cG = Math.cos(g);
  const sG = Math.sin(g);
  const Vx = -cA * sG - sA * sB * cG;
  const Vy = -sA * sG + cA * sB * cG;
  let h = Math.atan2(Vx, Vy) * DEG;
  if (h < 0) h += 360;
  return h;
}

// Compensate for screen rotation so heading matches top-of-screen.
export function applyScreenAngle(heading: number, screenAngle: number): number {
  return normalizeAngle(heading + screenAngle);
}

// Shortest signed angular delta a→b in (-180, 180].
export function shortestDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

// Adaptive low-pass: snap on big jumps, smooth when settled. Cuts jitter
// without adding lag on quick reorientation.
export function smoothStep(prev: number | null, target: number): number {
  if (prev == null) return target;
  const delta = shortestDelta(prev, target);
  const abs = Math.abs(delta);
  if (abs < 0.3) return target;
  const alpha = abs > 25 ? 0.7 : abs > 8 ? 0.35 : 0.15;
  return normalizeAngle(prev + delta * alpha);
}

// Read the current screen orientation angle in degrees CW.
export function readScreenAngle(): number {
  if (typeof window === "undefined") return 0;
  const so = window.screen?.orientation?.angle;
  if (typeof so === "number") return so;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}
