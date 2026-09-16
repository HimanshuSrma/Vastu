import type { Direction16 } from "./utils";

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
  ideal: Direction16[];
  acceptable: Direction16[];
  avoid: Direction16[];
  reasonKey: string;
};

export const ROOM_RULES: readonly RoomRule[] = [
  { key: "kitchen",          ideal: ["SE","SSE","ESE"],       acceptable: ["NW","WNW"],       avoid: ["NE","NNE","ENE","N","SW","SSW","WSW"], reasonKey: "fire zone; Agni rules SE" },
  { key: "master_bedroom",   ideal: ["SW","SSW","WSW"],       acceptable: ["S","W"],          avoid: ["NE","NNE","ENE","SE","ESE","SSE"],      reasonKey: "SW earth grounds sleep" },
  { key: "pooja_room",       ideal: ["NE","NNE","ENE"],       acceptable: ["E","N"],          avoid: ["SW","SSW","WSW","S","SE","SSE","ESE"], reasonKey: "Ishanya devata; spiritual current" },
  { key: "study",            ideal: ["NE","NNE","N","E","ENE"], acceptable: ["W","WNW"],     avoid: ["S","SW","SSW","WSW"],                   reasonKey: "Jupiter/Mercury aid focus" },
  { key: "toilet",           ideal: ["NW","WNW","NNW"],       acceptable: ["S","W","WSW"],    avoid: ["NE","NNE","ENE","SW","SSW","WSW","N","E"], reasonKey: "waste in Vayu zone, never NE/SW" },
  { key: "living_room",      ideal: ["N","NNE","NE","E","ENE"], acceptable: ["NW","NNW"],    avoid: ["SW","SSW","WSW"],                       reasonKey: "guests via light-heavy east/north" },
  { key: "dining",           ideal: ["W","WNW","WSW"],        acceptable: ["E","N"],          avoid: ["SW","SSW"],                             reasonKey: "Varuna zone aids nourishment" },
  { key: "guest_bedroom",    ideal: ["NW","NNW","WNW"],       acceptable: ["W"],              avoid: ["NE","NNE","ENE"],                       reasonKey: "Vayu zone favors short stay" },
  { key: "children_bedroom", ideal: ["W","WNW","NW"],         acceptable: ["E","ENE"],        avoid: ["SW","SSW","WSW"],                       reasonKey: "SW belongs to head of house" },
  { key: "store",            ideal: ["SW","SSW","S","NW"],    acceptable: ["WSW"],            avoid: ["NE","NNE","ENE"],                       reasonKey: "heavy storage grounds south/southwest" },
  { key: "entrance",         ideal: ["N","NNE","NE","E","ENE"], acceptable: ["W","NW"],      avoid: ["SW","SSW","WSW","S","SSE"],             reasonKey: "prana enters from light-facing directions" },
  { key: "staircase",        ideal: ["SW","SSW","WSW","S","W"], acceptable: ["NW"],          avoid: ["NE","NNE","ENE"],                       reasonKey: "NE staircase drains spiritual energy" },
] as const;
