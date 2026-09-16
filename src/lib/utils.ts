import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

export const DIRECTIONS_16 = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

export type Direction16 = (typeof DIRECTIONS_16)[number];

export const DEG_PER_DIR = 360 / 16; // 22.5

export function angleToDirection16(deg: number): Direction16 {
  const a = normalizeAngle(deg);
  const idx = Math.round(a / DEG_PER_DIR) % 16;
  return DIRECTIONS_16[idx];
}
