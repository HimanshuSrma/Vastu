import Dexie, { type Table } from "dexie";
import type { PlacedRoom } from "./dosha";

export type StoredPlan = {
  id?: number;
  name: string;
  createdAt: number;
  imageDataUrl: string;
  rotationDeg: number;
  placedRooms: PlacedRoom[];
};

export type Settings = {
  id: "app";
  theme: "system" | "light" | "dark";
  depth: "simple" | "full";
  locale: "en" | "hi";
};

export class VastuDB extends Dexie {
  plans!: Table<StoredPlan, number>;
  settings!: Table<Settings, "app">;

  constructor() {
    super("vastu-compass");
    this.version(1).stores({
      plans: "++id, name, createdAt",
      settings: "id",
    });
  }
}

let _db: VastuDB | null = null;
export function db(): VastuDB {
  if (typeof window === "undefined") {
    throw new Error("VastuDB is client-only");
  }
  if (!_db) _db = new VastuDB();
  return _db;
}

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  theme: "system",
  depth: "simple",
  locale: "en",
};
