import type { Direction16 } from "./utils";

export type Element = "earth" | "water" | "fire" | "air" | "space";

export type ZoneSimple = {
  key: Direction16;
  element: Element;
  ruler: string;
  planet: string;
  goodFor: string[];
  avoid: string[];
  color: string;
};

// 16-zone (Shodasha Dik) Vastu map — each 22.5° wedge.
// Ruler/planet follow the 8 cardinal + 8 upapada tradition
// (each corner/cardinal splits into two sub-zones sharing element).
export const ZONES_SIMPLE: readonly ZoneSimple[] = [
  { key: "N",   element: "water", ruler: "Kubera",     planet: "Mercury", goodFor: ["cash locker", "safe"],           avoid: ["kitchen", "toilet"],                 color: "#3b82f6" },
  { key: "NNE", element: "water", ruler: "Kubera-Ishanya", planet: "Mercury-Jupiter", goodFor: ["study", "meditation"], avoid: ["heavy storage", "toilet"],       color: "#38bdf8" },
  { key: "NE",  element: "water", ruler: "Ishanya",    planet: "Jupiter", goodFor: ["pooja room", "water tank"],      avoid: ["toilet", "kitchen", "staircase"],    color: "#22d3ee" },
  { key: "ENE", element: "air",   ruler: "Ishanya-Indra", planet: "Jupiter-Sun", goodFor: ["prayer", "reading"],       avoid: ["septic tank", "toilet"],             color: "#67e8f9" },
  { key: "E",   element: "air",   ruler: "Indra",      planet: "Sun",     goodFor: ["entrance", "verandah"],          avoid: ["toilet", "heavy storage"],           color: "#facc15" },
  { key: "ESE", element: "fire",  ruler: "Indra-Agni", planet: "Sun-Venus", goodFor: ["living room", "bathing"],      avoid: ["master bedroom"],                    color: "#fbbf24" },
  { key: "SE",  element: "fire",  ruler: "Agni",       planet: "Venus",   goodFor: ["kitchen", "electrical panel"],   avoid: ["master bedroom", "pooja", "water"],  color: "#f97316" },
  { key: "SSE", element: "fire",  ruler: "Agni-Yama",  planet: "Venus-Mars", goodFor: ["stove", "boiler"],            avoid: ["bedroom", "children room"],          color: "#fb923c" },
  { key: "S",   element: "fire",  ruler: "Yama",       planet: "Mars",    goodFor: ["storage", "heavy items"],        avoid: ["entrance", "open space"],            color: "#ef4444" },
  { key: "SSW", element: "earth", ruler: "Yama-Nairitya", planet: "Mars-Rahu", goodFor: ["wardrobe", "records"],      avoid: ["entrance", "toilet"],                color: "#dc2626" },
  { key: "SW",  element: "earth", ruler: "Nairitya",   planet: "Rahu",    goodFor: ["master bedroom", "heavy storage"], avoid: ["entrance", "toilet", "kitchen"],   color: "#78350f" },
  { key: "WSW", element: "earth", ruler: "Nairitya-Varuna", planet: "Rahu-Saturn", goodFor: ["study", "safe"],        avoid: ["toilet", "cut"],                     color: "#92400e" },
  { key: "W",   element: "earth", ruler: "Varuna",     planet: "Saturn",  goodFor: ["dining", "children room"],       avoid: ["main entrance (if SW-heavy)"],       color: "#a78bfa" },
  { key: "WNW", element: "air",   ruler: "Varuna-Vayu", planet: "Saturn-Moon", goodFor: ["dining", "toilet"],         avoid: ["master bedroom"],                    color: "#c4b5fd" },
  { key: "NW",  element: "air",   ruler: "Vayu",       planet: "Moon",    goodFor: ["guest bedroom", "store", "toilet"], avoid: ["master bedroom", "pooja"],       color: "#22c55e" },
  { key: "NNW", element: "air",   ruler: "Vayu-Kubera", planet: "Moon-Mercury", goodFor: ["cash flow", "marketing"],  avoid: ["master bedroom"],                    color: "#4ade80" },
] as const;

export function zoneAt(deg: number): ZoneSimple {
  const a = ((deg % 360) + 360) % 360;
  const idx = Math.round(a / 22.5) % 16;
  return ZONES_SIMPLE[idx];
}

// 45-Devata Vastu Purusha Mandala unchanged.
export type Devata = {
  id: string;
  name: string;
  zone: Direction16 | "C";
  pads: [number, number][];
  nature: "benefic" | "neutral" | "malefic";
};

const p = (r: number, c: number): [number, number] => [r, c];

export const DEVATAS_45: readonly Devata[] = [
  {
    id: "brahma", name: "Brahma", zone: "C",
    pads: [p(3,3),p(3,4),p(3,5),p(4,3),p(4,4),p(4,5),p(5,3),p(5,4),p(5,5)],
    nature: "benefic",
  },
  { id: "aryaka",       name: "Aryaka",       zone: "N",   pads: [p(2,3),p(2,4),p(2,5)], nature: "benefic" },
  { id: "vivaswan",     name: "Vivaswan",     zone: "E",   pads: [p(3,5),p(4,5),p(5,5)], nature: "benefic" },
  { id: "mitra",        name: "Mitra",        zone: "S",   pads: [p(6,3),p(6,4),p(6,5)], nature: "benefic" },
  { id: "prithvidhara", name: "Prithvidhara", zone: "W",   pads: [p(3,3),p(4,3),p(5,3)], nature: "benefic" },
  { id: "apa",          name: "Apa",          zone: "NE",  pads: [p(2,2)],               nature: "benefic" },
  { id: "apavatsa",     name: "Apavatsa",     zone: "SE",  pads: [p(6,2)],               nature: "benefic" },
  { id: "savitr",       name: "Savitr",       zone: "SW",  pads: [p(6,6)],               nature: "benefic" },
  { id: "savitra",      name: "Savitra",      zone: "NW",  pads: [p(2,6)],               nature: "benefic" },

  { id: "diti",         name: "Diti",         zone: "NW",  pads: [p(0,0)],               nature: "malefic" },
  { id: "aditi",        name: "Aditi",        zone: "NW",  pads: [p(0,1)],               nature: "benefic" },
  { id: "shiva",        name: "Shiva",        zone: "N",   pads: [p(0,2)],               nature: "benefic" },
  { id: "bhujaga",      name: "Bhujaga",      zone: "N",   pads: [p(0,3)],               nature: "neutral" },
  { id: "kubera",       name: "Kubera",       zone: "N",   pads: [p(0,4)],               nature: "benefic" },
  { id: "naga",         name: "Naga",         zone: "N",   pads: [p(0,5)],               nature: "neutral" },
  { id: "mukhya",       name: "Mukhya",       zone: "N",   pads: [p(0,6)],               nature: "benefic" },
  { id: "bhallata",     name: "Bhallata",     zone: "NE",  pads: [p(0,7)],               nature: "benefic" },
  { id: "soma",         name: "Soma",         zone: "NE",  pads: [p(0,8)],               nature: "benefic" },

  { id: "aditi_e",      name: "Aditi (E)",    zone: "NE",  pads: [p(1,8)],               nature: "benefic" },
  { id: "surya",        name: "Surya",        zone: "E",   pads: [p(2,8)],               nature: "benefic" },
  { id: "satyaka",      name: "Satyaka",      zone: "E",   pads: [p(3,8)],               nature: "benefic" },
  { id: "bhrisha",      name: "Bhrisha",      zone: "E",   pads: [p(4,8)],               nature: "neutral" },
  { id: "antariksha",   name: "Antariksha",   zone: "E",   pads: [p(5,8)],               nature: "neutral" },
  { id: "anila",        name: "Anila",        zone: "SE",  pads: [p(6,8)],               nature: "malefic" },
  { id: "pusha",        name: "Pusha",        zone: "SE",  pads: [p(7,8)],               nature: "benefic" },

  { id: "vitatha",      name: "Vitatha",      zone: "SE",  pads: [p(8,8)],               nature: "malefic" },
  { id: "grihakshata",  name: "Grihakshata",  zone: "SE",  pads: [p(8,7)],               nature: "malefic" },
  { id: "yama",         name: "Yama",         zone: "S",   pads: [p(8,6)],               nature: "malefic" },
  { id: "gandharva",    name: "Gandharva",    zone: "S",   pads: [p(8,5)],               nature: "neutral" },
  { id: "bhringaraja",  name: "Bhringaraja",  zone: "S",   pads: [p(8,4)],               nature: "malefic" },
  { id: "mriga",        name: "Mriga",        zone: "S",   pads: [p(8,3)],               nature: "neutral" },
  { id: "pitri",        name: "Pitri",        zone: "S",   pads: [p(8,2)],               nature: "malefic" },
  { id: "dauwarika",    name: "Dauwarika",    zone: "SW",  pads: [p(8,1)],               nature: "neutral" },
  { id: "sugriva",      name: "Sugriva",      zone: "SW",  pads: [p(8,0)],               nature: "neutral" },

  { id: "pushpadanta",  name: "Pushpadanta",  zone: "SW",  pads: [p(7,0)],               nature: "neutral" },
  { id: "varuna",       name: "Varuna",       zone: "W",   pads: [p(6,0)],               nature: "benefic" },
  { id: "asura",        name: "Asura",        zone: "W",   pads: [p(5,0)],               nature: "malefic" },
  { id: "shosha",       name: "Shosha",       zone: "W",   pads: [p(4,0)],               nature: "malefic" },
  { id: "papayakshma",  name: "Papayakshma",  zone: "W",   pads: [p(3,0)],               nature: "malefic" },
  { id: "roga",         name: "Roga",         zone: "NW",  pads: [p(2,0)],               nature: "malefic" },
  { id: "ahi",          name: "Ahi",          zone: "NW",  pads: [p(1,0)],               nature: "neutral" },

  { id: "rudra",        name: "Rudra",        zone: "NW",  pads: [p(1,1)],               nature: "neutral" },
  { id: "rajayakshma",  name: "Rajayakshma",  zone: "NE",  pads: [p(1,7)],               nature: "malefic" },
  { id: "vidari",       name: "Vidari",       zone: "SE",  pads: [p(7,7)],               nature: "malefic" },
  { id: "putana",       name: "Putana",       zone: "SW",  pads: [p(7,1)],               nature: "malefic" },

  { id: "jayanta",      name: "Jayanta",      zone: "NE",  pads: [p(1,6)],               nature: "benefic" },
  { id: "mahendra",     name: "Mahendra",     zone: "E",   pads: [p(1,5)],               nature: "benefic" },
  { id: "aryaman",      name: "Aryaman",      zone: "N",   pads: [p(1,4)],               nature: "benefic" },
  { id: "prithvi",      name: "Prithvi",      zone: "NW",  pads: [p(1,3)],               nature: "benefic" },
  { id: "jaya",         name: "Jaya",         zone: "W",   pads: [p(7,3)],               nature: "benefic" },
  { id: "indra",        name: "Indra",        zone: "S",   pads: [p(7,4)],               nature: "neutral" },
  { id: "indrajaya",    name: "Indrajaya",    zone: "SE",  pads: [p(7,5)],               nature: "neutral" },
  { id: "bhruga",       name: "Bhruga",       zone: "E",   pads: [p(7,6)],               nature: "neutral" },
] as const;

export const MANDALA_GRID_SIZE = 9;

export function devataAtPad(row: number, col: number): Devata | undefined {
  return DEVATAS_45.find((d) =>
    d.pads.some(([r, c]) => r === row && c === col),
  );
}
