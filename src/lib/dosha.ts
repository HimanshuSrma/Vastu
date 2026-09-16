import type { Direction16 } from "./utils";
import type { RoomKey } from "./rooms";
import { ROOM_RULES } from "./rooms";

export type Severity = "low" | "medium" | "high";

export type PlacedRoom = {
  room: RoomKey;
  direction: Direction16;
};

export type Dosha = {
  id: string;
  room: RoomKey;
  direction: Direction16;
  severity: Severity;
  messageKey: string;
  remedyKey: string;
};

const REMEDIES: Record<string, string> = {
  kitchen_ne: "Move stove to SE corner of kitchen; red/orange decor",
  kitchen_nne: "Shift stove to SE; keep NE side of room clean and empty",
  kitchen_ene: "Move cooking platform to SE; face east while cooking",
  kitchen_sw: "Shift platform toward SE within room; face east while cooking",
  toilet_ne: "Keep door closed always; sea-salt bowl; paint white; relocate if possible",
  toilet_nne: "Door closed; salt bowl; camphor daily",
  toilet_sw: "Door closed; salt bowl; camphor daily; heavy vastu remedy",
  toilet_ssw: "Door closed; salt bowl; camphor daily",
  master_bedroom_ne: "Move heavy furniture to SW of room; sleep head-south",
  master_bedroom_nne: "Sleep head-south; heavy bed against SW wall",
  pooja_room_sw: "Relocate to NE; if impossible, do not sleep facing this room",
  pooja_room_s: "Relocate to NE; keep lamp lit dawn and dusk",
  entrance_sw: "Add threshold, Ganesha idol above; well-lit; NW wind chime",
  entrance_ssw: "Add Ganesha above door; brass threshold; keep well-lit",
  staircase_ne: "Pyramid remedy under stair; keep NE inside clean and light",
  staircase_nne: "Pyramid remedy under stair; NE zone bright and clean",
  default: "Consult a Vastu expert; consider color/element correction for the zone",
};

export function detectDoshas(rooms: PlacedRoom[]): Dosha[] {
  const out: Dosha[] = [];
  for (const placed of rooms) {
    const rule = ROOM_RULES.find((r) => r.key === placed.room);
    if (!rule) continue;
    if (rule.avoid.includes(placed.direction)) {
      const severity = severityFor(placed.room, placed.direction);
      out.push({
        id: `${placed.room}_${placed.direction}`,
        room: placed.room,
        direction: placed.direction,
        severity,
        messageKey: `${placed.room} in ${placed.direction} conflicts with Vastu`,
        remedyKey: remedyFor(placed.room, placed.direction),
      });
    }
  }
  return out.sort((a, b) => rank(b.severity) - rank(a.severity));
}

const HIGH_KEYS = new Set([
  "toilet_NE","toilet_NNE","toilet_ENE","toilet_SW","toilet_SSW","toilet_WSW",
  "kitchen_NE","kitchen_NNE","kitchen_ENE",
  "pooja_room_SW","pooja_room_SSW","pooja_room_S",
  "entrance_SW","entrance_SSW",
  "staircase_NE","staircase_NNE",
]);

const MED_KEYS = new Set([
  "master_bedroom_NE","master_bedroom_NNE","master_bedroom_ENE",
  "kitchen_SW","kitchen_SSW",
  "store_NE","store_NNE",
]);

function severityFor(room: RoomKey, dir: Direction16): Severity {
  const k = `${room}_${dir}`;
  if (HIGH_KEYS.has(k)) return "high";
  if (MED_KEYS.has(k)) return "medium";
  return "low";
}

function remedyFor(room: RoomKey, dir: Direction16): string {
  const k = `${room}_${dir.toLowerCase()}`;
  return REMEDIES[k] ?? REMEDIES.default;
}

function rank(s: Severity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}
