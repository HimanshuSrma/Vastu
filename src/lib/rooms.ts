import type { Direction8 } from "./utils";

export type RoomKey =
  | "kitchen"
  | "master_bedroom"
  | "pooja_room"
  | "study"
  | "toilet"
  | "living_room"
  | "dining"
  | "guest_bedroom"
  | "children_bedroom"
  | "store"
  | "entrance"
  | "staircase";

export type RoomRule = {
  key: RoomKey;
  ideal: Direction8[];
  acceptable: Direction8[];
  avoid: Direction8[];
  reasonKey: string;
};

export const ROOM_RULES: readonly RoomRule[] = [
  { key: "kitchen", ideal: ["SE"], acceptable: ["NW"], avoid: ["NE", "N", "SW"], reasonKey: "fire zone; Agni rules SE" },
  { key: "master_bedroom", ideal: ["SW"], acceptable: ["S", "W"], avoid: ["NE", "SE"], reasonKey: "SW stability; earth element grounds sleep" },
  { key: "pooja_room", ideal: ["NE"], acceptable: ["E", "N"], avoid: ["SW", "S", "SE"], reasonKey: "Ishanya devata; spiritual current" },
  { key: "study", ideal: ["NE", "N", "E"], acceptable: ["W"], avoid: ["S", "SW"], reasonKey: "Jupiter/Mercury zones aid focus" },
  { key: "toilet", ideal: ["NW", "W"], acceptable: ["S"], avoid: ["NE", "SW", "N", "E"], reasonKey: "waste in Vayu zone, never NE/SW" },
  { key: "living_room", ideal: ["N", "NE", "E"], acceptable: ["NW"], avoid: ["SW"], reasonKey: "guests welcomed via light-heavy east/north" },
  { key: "dining", ideal: ["W"], acceptable: ["E", "N"], avoid: ["SW"], reasonKey: "Varuna zone aids nourishment" },
  { key: "guest_bedroom", ideal: ["NW"], acceptable: ["W"], avoid: ["NE"], reasonKey: "Vayu zone favors movement/short stay" },
  { key: "children_bedroom", ideal: ["W", "NW"], acceptable: ["E"], avoid: ["SW"], reasonKey: "SW belongs to head of house" },
  { key: "store", ideal: ["SW", "S", "NW"], acceptable: [], avoid: ["NE"], reasonKey: "heavy storage grounds south/southwest" },
  { key: "entrance", ideal: ["N", "NE", "E"], acceptable: ["W"], avoid: ["SW", "S"], reasonKey: "prana enters from light-facing directions" },
  { key: "staircase", ideal: ["SW", "S", "W"], acceptable: ["NW"], avoid: ["NE"], reasonKey: "NE staircase drains spiritual energy" },
] as const;
