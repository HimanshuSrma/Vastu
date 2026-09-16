import type { Direction8 } from "./utils";
import type { RoomKey } from "./rooms";
import { ROOM_RULES } from "./rooms";

export type Severity = "low" | "medium" | "high";

export type PlacedRoom = {
  room: RoomKey;
  direction: Direction8;
};

export type Dosha = {
  id: string;
  room: RoomKey;
  direction: Direction8;
  severity: Severity;
  messageKey: string;
  remedyKey: string;
};

const REMEDIES: Record<string, string> = {
  kitchen_ne: "Move stove to SE corner of kitchen; place red/orange decor",
  kitchen_sw: "Shift cooking platform toward SE within room; keep east-facing while cooking",
  toilet_ne: "Keep door always closed; place sea-salt bowl; paint white; ideally relocate",
  toilet_sw: "Keep closed; salt bowl; camphor daily; heavy vastu remedy recommended",
  master_ne: "Move heavy furniture to SW of room; sleep with head to south",
  pooja_sw: "Relocate to NE; if not possible, do not sleep facing this room",
  entrance_sw: "Add threshold, Ganesha idol above; keep well-lit; wind chime NW",
  staircase_ne: "Cannot easily remedy; add pyramid remedy under stair; keep NE inside clean and light",
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

function severityFor(room: RoomKey, dir: Direction8): Severity {
  if (room === "toilet" && (dir === "NE" || dir === "SW")) return "high";
  if (room === "kitchen" && dir === "NE") return "high";
  if (room === "pooja_room" && (dir === "SW" || dir === "S")) return "high";
  if (room === "entrance" && dir === "SW") return "high";
  if (room === "staircase" && dir === "NE") return "high";
  if (room === "master_bedroom" && dir === "NE") return "medium";
  return "low";
}

function remedyFor(room: RoomKey, dir: Direction8): string {
  const key = `${roomShort(room)}_${dir.toLowerCase()}`;
  return REMEDIES[key] ?? REMEDIES.default;
}

function roomShort(r: RoomKey): string {
  switch (r) {
    case "master_bedroom":
      return "master";
    case "pooja_room":
      return "pooja";
    default:
      return r;
  }
}

function rank(s: Severity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}
