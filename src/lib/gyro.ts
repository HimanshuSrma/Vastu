import { normalizeAngle } from "./utils";
import { shortestDelta } from "./heading";

const RAD = Math.PI / 180;

// Reject stale/oversized integration steps (tab backgrounded, dropped events).
export const MAX_GYRO_DT_S = 0.25;
// Per-sample weight of the magnetometer in the complementary filter.
export const MAG_GAIN = 0.06;
// Above this disagreement the mag is treated as truth (fast reorientation,
// gyro saturation, screen rotation) and pulled in hard.
export const SNAP_DELTA_DEG = 30;
export const SNAP_GAIN = 0.5;

// Angular rate about Earth's vertical axis (deg/s, positive = CCW seen from
// above) from device-frame gyro rates plus the device's tilt.
// With R = Rz(alpha)Rx(beta)Ry(gamma) mapping device→Earth, the Earth up axis
// expressed in device coordinates is the third row of R.
export function verticalRate(
  rateX: number,
  rateY: number,
  rateZ: number,
  beta: number,
  gamma: number,
): number {
  const b = beta * RAD;
  const g = gamma * RAD;
  const ux = -Math.cos(b) * Math.sin(g);
  const uy = Math.sin(b);
  const uz = Math.cos(b) * Math.cos(g);
  return rateX * ux + rateY * uy + rateZ * uz;
}

// Heading change over dt seconds (deg, CW positive). Heading is CW-from-north,
// so it moves opposite to the CCW-positive yaw rate.
export function gyroHeadingDelta(
  rateX: number,
  rateY: number,
  rateZ: number,
  beta: number,
  gamma: number,
  dtSeconds: number,
): number {
  return -verticalRate(rateX, rateY, rateZ, beta, gamma) * dtSeconds;
}

// Blend a gyro-predicted heading toward the magnetometer measurement.
export function fuseHeading(predicted: number, measured: number): number {
  const delta = shortestDelta(predicted, measured);
  const gain = Math.abs(delta) > SNAP_DELTA_DEG ? SNAP_GAIN : MAG_GAIN;
  return normalizeAngle(predicted + delta * gain);
}
