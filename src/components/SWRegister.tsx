"use client";

import { useEffect } from "react";
import { initPwaInstall } from "@/lib/pwa-install";

export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    initPwaInstall();
  }, []);
  return null;
}
