"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { normalizeAngle, DIRECTIONS_8 } from "@/lib/utils";
import { ZONES_SIMPLE, DEVATAS_45, MANDALA_GRID_SIZE, zoneAt } from "@/lib/vastu-data";
import { useSettings } from "@/lib/store";

type OrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };
type IosOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function Compass() {
  const t = useTranslations("compass");
  const tDir = useTranslations("directions");
  const tEl = useTranslations("elements");
  const depth = useSettings((s) => s.depth);

  const [heading, setHeading] = useState<number | null>(null);
  const [permission, setPermission] = useState<"idle" | "granted" | "denied" | "unsupported">(
    "idle",
  );
  const [manual, setManual] = useState(0);
  const listenerRef = useRef<((e: OrientationEvent) => void) | null>(null);

  const angle = heading ?? manual;
  const currentZone = useMemo(() => zoneAt(angle), [angle]);

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener("deviceorientation", listenerRef.current);
      }
    };
  }, []);

  const attach = () => {
    const handler = (e: OrientationEvent) => {
      const h =
        typeof e.webkitCompassHeading === "number"
          ? e.webkitCompassHeading
          : e.alpha != null
            ? 360 - e.alpha
            : null;
      if (h != null) setHeading(normalizeAngle(h));
    };
    listenerRef.current = handler;
    window.addEventListener("deviceorientation", handler, true);
    setPermission("granted");
  };

  const enable = async () => {
    if (typeof DeviceOrientationEvent === "undefined") {
      setPermission("unsupported");
      return;
    }
    const Ctor = DeviceOrientationEvent as IosOrientationCtor;
    if (typeof Ctor.requestPermission === "function") {
      try {
        const res = await Ctor.requestPermission();
        if (res === "granted") attach();
        else setPermission("denied");
      } catch {
        setPermission("denied");
      }
    } else {
      attach();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <div className="text-4xl font-bold tabular-nums">
          {Math.round(angle)}°
        </div>
        <div className="text-sm text-[var(--muted)]">
          {t("heading")} · {tDir(currentZone.key)}
        </div>
      </div>

      <CompassDial
        angle={angle}
        depth={depth}
        translations={{
          n: t("north"),
          s: t("south"),
          e: t("east"),
          w: t("west"),
        }}
      />

      <div className="w-full max-w-md rounded-xl border bg-[var(--card)] p-4">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: currentZone.color }}
          />
          <div className="font-semibold">
            {tDir(currentZone.key)} · {tEl(currentZone.element)}
          </div>
        </div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          {currentZone.ruler} · {currentZone.planet}
        </div>
        <div className="mt-3 text-xs">
          <div className="mb-1">
            <span className="text-[var(--muted)]">✓ </span>
            {currentZone.goodFor.join(", ")}
          </div>
          <div>
            <span className="text-red-500">✗ </span>
            {currentZone.avoid.join(", ")}
          </div>
        </div>
      </div>

      {permission === "idle" && (
        <button
          onClick={enable}
          className="w-full max-w-md rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-fg)]"
        >
          {t("enableSensor")}
        </button>
      )}
      {permission === "denied" && (
        <div className="text-sm text-red-500">{t("permissionNeeded")}</div>
      )}
      {permission === "unsupported" && (
        <div className="text-sm text-[var(--muted)]">{t("notSupported")}</div>
      )}

      <div className="w-full max-w-md">
        <label className="text-xs text-[var(--muted)]">{t("manualAngle")}: {Math.round(manual)}°</label>
        <input
          type="range"
          min={0}
          max={359}
          value={manual}
          onChange={(e) => setManual(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </div>
    </div>
  );
}

function CompassDial({
  angle,
  depth,
  translations,
}: {
  angle: number;
  depth: "simple" | "full";
  translations: { n: string; s: string; e: string; w: string };
}) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  return (
    <div
      className="relative"
      style={{ width: size, height: size, maxWidth: "90vw" }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        style={{ transform: `rotate(${-angle}deg)`, transition: "transform 120ms linear" }}
      >
        {depth === "simple" ? (
          <SimpleZones cx={cx} cy={cy} r={r} />
        ) : (
          <MandalaZones cx={cx} cy={cy} r={r} />
        )}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={2} />
        {["N", "E", "S", "W"].map((label, i) => {
          const a = (i * 90 - 90) * (Math.PI / 180);
          const tx = cx + (r - 22) * Math.cos(a);
          const ty = cy + (r - 22) * Math.sin(a);
          return (
            <text
              key={label}
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={16}
              fontWeight={700}
              fill={label === "N" ? "#ef4444" : "var(--fg)"}
            >
              {label === "N" ? translations.n : label === "E" ? translations.e : label === "S" ? translations.s : translations.w}
            </text>
          );
        })}
      </svg>
      {/* Needle (fixed, pointing up = current heading direction) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${cx},${cy - r + 4} ${cx - 8},${cy} ${cx + 8},${cy}`}
            fill="#ef4444"
          />
          <polygon
            points={`${cx},${cy + r - 4} ${cx - 8},${cy} ${cx + 8},${cy}`}
            fill="var(--muted)"
          />
          <circle cx={cx} cy={cy} r={5} fill="var(--fg)" />
        </svg>
      </div>
    </div>
  );
}

function SimpleZones({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      {ZONES_SIMPLE.map((z, i) => {
        const start = (i * 45 - 22.5 - 90) * (Math.PI / 180);
        const end = ((i + 1) * 45 - 22.5 - 90) * (Math.PI / 180);
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        return (
          <path
            key={z.key}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill={z.color}
            fillOpacity={0.18}
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}

function MandalaZones({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const size = r * 2;
  const cell = size / MANDALA_GRID_SIZE;
  const originX = cx - r;
  const originY = cy - r;
  return (
    <g>
      <clipPath id="mandalaClip">
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath="url(#mandalaClip)">
        {DEVATAS_45.map((d) =>
          d.pads.map(([row, col], idx) => {
            const fill =
              d.nature === "benefic"
                ? "#22c55e"
                : d.nature === "malefic"
                  ? "#ef4444"
                  : "#a1a1aa";
            return (
              <rect
                key={`${d.id}-${idx}`}
                x={originX + col * cell}
                y={originY + row * cell}
                width={cell}
                height={cell}
                fill={fill}
                fillOpacity={0.18}
                stroke="var(--border)"
                strokeWidth={0.5}
              />
            );
          }),
        )}
      </g>
    </g>
  );
}

export { DIRECTIONS_8 };
