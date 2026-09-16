"use client";

import { useEffect } from "react";

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot() {
  useEffect(() => {
    if (!AD_CLIENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {}
  }, []);

  if (!AD_CLIENT) {
    return (
      <div
        className="fixed bottom-16 inset-x-0 z-30 text-center text-[10px] text-[var(--muted)] py-1 border-t border-dashed bg-[var(--card)]/70"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        ad slot · set NEXT_PUBLIC_ADSENSE_CLIENT + NEXT_PUBLIC_ADSENSE_SLOT
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-16 inset-x-0 z-30"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
