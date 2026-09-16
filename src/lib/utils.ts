import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

export const DIRECTIONS_8 = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
] as const;
export type Direction8 = (typeof DIRECTIONS_8)[number];

export function angleToDirection8(deg: number): Direction8 {
  const a = normalizeAngle(deg);
  const idx = Math.round(a / 45) % 8;
  return DIRECTIONS_8[idx];
}
