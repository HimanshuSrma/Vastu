import type { Direction8 } from "./utils";

export type Element = "earth" | "water" | "fire" | "air" | "space";

export type ZoneSimple = {
  key: Direction8;
  labelKey: string;
  element: Element;
  ruler: string;
  planet: string;
  goodFor: string[];
  avoid: string[];
  color: string;
};

export const ZONES_SIMPLE: readonly ZoneSimple[] = [
  {
    key: "N",
    labelKey: "N",
    element: "water",
    ruler: "Kubera",
    planet: "Mercury",
    goodFor: ["cash locker", "entrance", "study"],
    avoid: ["kitchen", "toilet"],
    color: "#3b82f6",
  },
  {
    key: "NE",
    labelKey: "NE",
    element: "water",
    ruler: "Ishanya",
    planet: "Jupiter",
    goodFor: ["pooja room", "meditation", "water source"],
    avoid: ["toilet", "kitchen", "staircase", "storage"],
    color: "#22d3ee",
  },
  {
    key: "E",
    labelKey: "E",
    element: "air",
    ruler: "Indra",
    planet: "Sun",
    goodFor: ["entrance", "living room", "verandah"],
    avoid: ["toilet", "heavy storage"],
    color: "#facc15",
  },
  {
    key: "SE",
    labelKey: "SE",
    element: "fire",
    ruler: "Agni",
    planet: "Venus",
    goodFor: ["kitchen", "electrical panel"],
    avoid: ["master bedroom", "pooja room", "water tank"],
    color: "#f97316",
  },
  {
    key: "S",
    labelKey: "S",
    element: "fire",
    ruler: "Yama",
    planet: "Mars",
    goodFor: ["storage", "heavy furniture"],
    avoid: ["entrance", "open space"],
    color: "#ef4444",
  },
  {
    key: "SW",
    labelKey: "SW",
    element: "earth",
    ruler: "Nairitya",
    planet: "Rahu",
    goodFor: ["master bedroom", "heavy storage"],
    avoid: ["entrance", "toilet", "kitchen", "open cut"],
    color: "#78350f",
  },
  {
    key: "W",
    labelKey: "W",
    element: "earth",
    ruler: "Varuna",
    planet: "Saturn",
    goodFor: ["dining", "children bedroom", "study"],
    avoid: ["main entrance if SW-heavy"],
    color: "#a78bfa",
  },
  {
    key: "NW",
    labelKey: "NW",
    element: "air",
    ruler: "Vayu",
    planet: "Moon",
    goodFor: ["guest bedroom", "store", "toilet"],
    avoid: ["master bedroom", "pooja room"],
    color: "#22c55e",
  },
] as const;

export function zoneAt(deg: number): ZoneSimple {
  const a = ((deg % 360) + 360) % 360;
  const idx = Math.round(a / 45) % 8;
  return ZONES_SIMPLE[idx];
}

// 45-Devata Vastu Purusha Mandala — 9x9 grid of 81 padas grouped into 45 devata cells.
// Simplified authoritative mapping used across Vastu texts (Manasara / Mayamata tradition).
// Coordinates: col 0..8 left→right (west→east), row 0..8 top→bottom (north→south).
// Each cell lists (row,col) pads it occupies. Center 9 pads = Brahma.
export type Devata = {
  id: string;
  name: string;
  zone: Direction8 | "C";
  pads: [number, number][];
  nature: "benefic" | "neutral" | "malefic";
};

const p = (r: number, c: number): [number, number] => [r, c];

export const DEVATAS_45: readonly Devata[] = [
  // Center — Brahma occupies 3x3 center (rows 3-5, cols 3-5)
  {
    id: "brahma",
    name: "Brahma",
    zone: "C",
    pads: [
      p(3, 3), p(3, 4), p(3, 5),
      p(4, 3), p(4, 4), p(4, 5),
      p(5, 3), p(5, 4), p(5, 5),
    ],
    nature: "benefic",
  },
  // 8 inner ring (Devikas) — cells around Brahma
  { id: "aryaka", name: "Aryaka", zone: "N", pads: [p(2, 3), p(2, 4), p(2, 5)], nature: "benefic" },
  { id: "vivaswan", name: "Vivaswan", zone: "E", pads: [p(3, 5), p(4, 5), p(5, 5)], nature: "benefic" },
  { id: "mitra", name: "Mitra", zone: "S", pads: [p(6, 3), p(6, 4), p(6, 5)], nature: "benefic" },
  { id: "prithvidhara", name: "Prithvidhara", zone: "W", pads: [p(3, 3), p(4, 3), p(5, 3)], nature: "benefic" },
  { id: "apa", name: "Apa", zone: "NE", pads: [p(2, 2)], nature: "benefic" },
  { id: "apavatsa", name: "Apavatsa", zone: "SE", pads: [p(6, 2)], nature: "benefic" },
  { id: "savitr", name: "Savitr", zone: "SW", pads: [p(6, 6)], nature: "benefic" },
  { id: "savitra", name: "Savitra", zone: "NW", pads: [p(2, 6)], nature: "benefic" },

  // Outer ring — 32 devatas, 4 per side octant
  // NORTH edge (row 0, cols 0..8)
  { id: "diti", name: "Diti", zone: "NW", pads: [p(0, 0)], nature: "malefic" },
  { id: "aditi", name: "Aditi", zone: "NW", pads: [p(0, 1)], nature: "benefic" },
  { id: "shiva", name: "Shiva", zone: "N", pads: [p(0, 2)], nature: "benefic" },
  { id: "bhujaga", name: "Bhujaga", zone: "N", pads: [p(0, 3)], nature: "neutral" },
  { id: "kubera", name: "Kubera", zone: "N", pads: [p(0, 4)], nature: "benefic" },
  { id: "naga", name: "Naga", zone: "N", pads: [p(0, 5)], nature: "neutral" },
  { id: "mukhya", name: "Mukhya", zone: "N", pads: [p(0, 6)], nature: "benefic" },
  { id: "bhallata", name: "Bhallata", zone: "NE", pads: [p(0, 7)], nature: "benefic" },
  { id: "soma", name: "Soma", zone: "NE", pads: [p(0, 8)], nature: "benefic" },

  // EAST edge (col 8, rows 1..7)
  { id: "aditi_e", name: "Aditi (E)", zone: "NE", pads: [p(1, 8)], nature: "benefic" },
  { id: "surya", name: "Surya", zone: "E", pads: [p(2, 8)], nature: "benefic" },
  { id: "satyaka", name: "Satyaka", zone: "E", pads: [p(3, 8)], nature: "benefic" },
  { id: "bhrisha", name: "Bhrisha", zone: "E", pads: [p(4, 8)], nature: "neutral" },
  { id: "antariksha", name: "Antariksha", zone: "E", pads: [p(5, 8)], nature: "neutral" },
  { id: "anila", name: "Anila", zone: "SE", pads: [p(6, 8)], nature: "malefic" },
  { id: "pusha", name: "Pusha", zone: "SE", pads: [p(7, 8)], nature: "benefic" },

  // SOUTH edge (row 8, cols 0..8)
  { id: "vitatha", name: "Vitatha", zone: "SE", pads: [p(8, 8)], nature: "malefic" },
  { id: "grihakshata", name: "Grihakshata", zone: "SE", pads: [p(8, 7)], nature: "malefic" },
  { id: "yama", name: "Yama", zone: "S", pads: [p(8, 6)], nature: "malefic" },
  { id: "gandharva", name: "Gandharva", zone: "S", pads: [p(8, 5)], nature: "neutral" },
  { id: "bhringaraja", name: "Bhringaraja", zone: "S", pads: [p(8, 4)], nature: "malefic" },
  { id: "mriga", name: "Mriga", zone: "S", pads: [p(8, 3)], nature: "neutral" },
  { id: "pitri", name: "Pitri", zone: "S", pads: [p(8, 2)], nature: "malefic" },
  { id: "dauwarika", name: "Dauwarika", zone: "SW", pads: [p(8, 1)], nature: "neutral" },
  { id: "sugriva", name: "Sugriva", zone: "SW", pads: [p(8, 0)], nature: "neutral" },

  // WEST edge (col 0, rows 1..7)
  { id: "pushpadanta", name: "Pushpadanta", zone: "SW", pads: [p(7, 0)], nature: "neutral" },
  { id: "varuna", name: "Varuna", zone: "W", pads: [p(6, 0)], nature: "benefic" },
  { id: "asura", name: "Asura", zone: "W", pads: [p(5, 0)], nature: "malefic" },
  { id: "shosha", name: "Shosha", zone: "W", pads: [p(4, 0)], nature: "malefic" },
  { id: "papayakshma", name: "Papayakshma", zone: "W", pads: [p(3, 0)], nature: "malefic" },
  { id: "roga", name: "Roga", zone: "NW", pads: [p(2, 0)], nature: "malefic" },
  { id: "ahi", name: "Ahi", zone: "NW", pads: [p(1, 0)], nature: "neutral" },

  // Corner inner (already placed by pos above) — remainder of ring
  { id: "rudra", name: "Rudra", zone: "NW", pads: [p(1, 1)], nature: "neutral" },
  { id: "rajayakshma", name: "Rajayakshma", zone: "NE", pads: [p(1, 7)], nature: "malefic" },
  { id: "vidari", name: "Vidari", zone: "SE", pads: [p(7, 7)], nature: "malefic" },
  { id: "putana", name: "Putana", zone: "SW", pads: [p(7, 1)], nature: "malefic" },

  // Marma inner second layer
  { id: "jayanta", name: "Jayanta", zone: "NE", pads: [p(1, 6)], nature: "benefic" },
  { id: "mahendra", name: "Mahendra", zone: "E", pads: [p(1, 5)], nature: "benefic" },
  { id: "aryaman", name: "Aryaman", zone: "N", pads: [p(1, 4)], nature: "benefic" },
  { id: "prithvi", name: "Prithvi", zone: "NW", pads: [p(1, 3)], nature: "benefic" },
  { id: "jaya", name: "Jaya", zone: "W", pads: [p(7, 3)], nature: "benefic" },
  { id: "indra", name: "Indra", zone: "S", pads: [p(7, 4)], nature: "neutral" },
  { id: "indrajaya", name: "Indrajaya", zone: "SE", pads: [p(7, 5)], nature: "neutral" },
  { id: "bhruga", name: "Bhruga", zone: "E", pads: [p(7, 6)], nature: "neutral" },
] as const;

export const MANDALA_GRID_SIZE = 9;

export function devataAtPad(row: number, col: number): Devata | undefined {
  return DEVATAS_45.find((d) =>
    d.pads.some(([r, c]) => r === row && c === col),
  );
}
