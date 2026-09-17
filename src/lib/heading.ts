import { normalizeAngle } from "./utils";

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

// Compass heading from DeviceOrientationEvent alpha/beta/gamma (deg).
// Returns CW-from-north 0..360. Assumes alpha is Earth-frame yaw
// (deviceorientationabsolute or absolute:true). Projects the device's
// top (Y axis) onto Earth's horizontal plane so a face-down phone still
// reads correctly.
export function tiltCompensatedHeading(
  alpha: number,
  beta: number,
  _gamma: number,
): number {
  const a = alpha * RAD;
  const b = beta * RAD;
  const east = -Math.sin(a) * Math.cos(b);
  const north = Math.cos(a) * Math.cos(b);
  const h = Math.atan2(east, north) * DEG;
  return h < 0 ? h + 360 : h;
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

// Circular standard deviation of a set of angles (deg). Handles wrap-around
// by averaging unit vectors then converting back — used as a stability
// proxy for compass accuracy when the platform doesn't expose one.
export function circularStdDev(anglesDeg: number[]): number {
  if (anglesDeg.length < 2) return 0;
  let sx = 0;
  let sy = 0;
  for (const a of anglesDeg) {
    sx += Math.cos(a * RAD);
    sy += Math.sin(a * RAD);
  }
  const n = anglesDeg.length;
  const r = Math.sqrt(sx * sx + sy * sy) / n;
  if (r >= 1) return 0;
  // Yamartino / Mardia formula: sqrt(-2 ln R) in radians.
  return Math.sqrt(-2 * Math.log(r)) * DEG;
}
