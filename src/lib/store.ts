"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "system" | "light" | "dark";
export type Depth = "simple" | "full";

type SettingsState = {
  theme: Theme;
  depth: Depth;
  setTheme: (t: Theme) => void;
  setDepth: (d: Depth) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      depth: "simple",
      setTheme: (theme) => set({ theme }),
      setDepth: (depth) => set({ depth }),
    }),
    {
      name: "vastu-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
