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
      <div className="mt-8 border-t border-dashed py-3 text-center text-[10px] text-muted">
        ad slot · set NEXT_PUBLIC_ADSENSE_CLIENT + NEXT_PUBLIC_ADSENSE_SLOT
      </div>
    );
  }

  return (
    <div className="mt-8 border-t">
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
