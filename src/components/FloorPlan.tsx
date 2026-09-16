"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ZONES_SIMPLE, DEVATAS_45, MANDALA_GRID_SIZE } from "@/lib/vastu-data";
import { DEG_PER_DIR } from "@/lib/utils";
import { useSettings } from "@/lib/store";

export function FloorPlan() {
  const t = useTranslations("plan");
  const depth = useSettings((s) => s.depth);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(35);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImgUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("instructions")}</p>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)]"
        >
          {t("upload")}
        </button>
        <button
          onClick={() => setRotation(0)}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          {t("reset")}
        </button>
        <button
          onClick={() => setImgUrl(null)}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          {t("clear")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="relative aspect-square w-full rounded-2xl border overflow-hidden bg-[var(--card)]">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt="floor plan"
            className="absolute inset-0 h-full w-full object-contain"
            style={{ transform: `rotate(${rotation}deg)`, transition: "transform 120ms linear" }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-[var(--muted)]">
            {t("upload")}
          </div>
        )}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: opacity / 100 }}
        >
          {depth === "simple" ? <ZoneOverlay /> : <MandalaOverlay />}
        </svg>
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
          N
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-[var(--muted)]">
            {t("rotate")}: {rotation}°
          </label>
          <input
            type="range"
            min={-180}
            max={180}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">
            {t("opacity")}: {opacity}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      </div>
    </div>
  );
}

function ZoneOverlay() {
  const cx = 50, cy = 50, r = 50;
  return (
    <g>
      {ZONES_SIMPLE.map((z, i) => {
        const start = (i * DEG_PER_DIR - DEG_PER_DIR / 2 - 90) * (Math.PI / 180);
        const end = ((i + 1) * DEG_PER_DIR - DEG_PER_DIR / 2 - 90) * (Math.PI / 180);
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const midA = (start + end) / 2;
        const lx = cx + r * 0.78 * Math.cos(midA);
        const ly = cy + r * 0.78 * Math.sin(midA);
        return (
          <g key={z.key}>
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
              fill={z.color}
              fillOpacity={0.35}
              stroke="#000"
              strokeOpacity={0.3}
              strokeWidth={0.25}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={2.8}
              fontWeight={700}
              fill="#000"
            >
              {z.key}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function MandalaOverlay() {
  const cell = 100 / MANDALA_GRID_SIZE;
  return (
    <g>
      {DEVATAS_45.map((d) =>
        d.pads.map(([row, col], idx) => {
          const fill =
            d.nature === "benefic"
              ? "#22c55e"
              : d.nature === "malefic"
                ? "#ef4444"
                : "#a1a1aa";
          return (
            <g key={`${d.id}-${idx}`}>
              <rect
                x={col * cell}
                y={row * cell}
                width={cell}
                height={cell}
                fill={fill}
                fillOpacity={0.35}
                stroke="#000"
                strokeOpacity={0.3}
                strokeWidth={0.2}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}
