"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { normalizeAngle, DIRECTIONS_16, DEG_PER_DIR } from "@/lib/utils";
import { ZONES_SIMPLE, DEVATAS_45, MANDALA_GRID_SIZE, zoneAt } from "@/lib/vastu-data";
import { useSettings } from "@/lib/store";

type OrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };
type IosOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type SensorState = "idle" | "waiting" | "granted" | "denied" | "unsupported";

export function Compass() {
  const t = useTranslations("compass");
  const tDir = useTranslations("directions");
  const tEl = useTranslations("elements");
  const depth = useSettings((s) => s.depth);

  const [heading, setHeading] = useState<number | null>(null);
  const [state, setState] = useState<SensorState>("idle");
  const listenerRef = useRef<((e: OrientationEvent) => void) | null>(null);
  const needsIosPrompt = useRef(false);
  const attachedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof DeviceOrientationEvent === "undefined") {
      setState("unsupported");
      return;
    }
    const Ctor = DeviceOrientationEvent as IosOrientationCtor;
    if (typeof Ctor.requestPermission === "function") {
      needsIosPrompt.current = true;
      setState("idle");
      const onFirstTap = () => {
        void requestIos();
        document.removeEventListener("pointerdown", onFirstTap);
      };
      document.addEventListener("pointerdown", onFirstTap, { once: true });
      return () => document.removeEventListener("pointerdown", onFirstTap);
    }
    attach();
    const t = setTimeout(() => {
      if (!attachedRef.current || heading == null) {
        setState((s) => (s === "waiting" ? "unsupported" : s));
      }
    }, 3000);
    return () => {
      clearTimeout(t);
      detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attach() {
    if (attachedRef.current) return;
    const handler = (e: OrientationEvent) => {
      const h =
        typeof e.webkitCompassHeading === "number"
          ? e.webkitCompassHeading
          : e.alpha != null
            ? 360 - e.alpha
            : null;
      if (h != null) {
        setHeading(normalizeAngle(h));
        setState("granted");
      }
    };
    listenerRef.current = handler;
    window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
    window.addEventListener("deviceorientation", handler, true);
    attachedRef.current = true;
    setState("waiting");
  }

  function detach() {
    const h = listenerRef.current;
    if (h) {
      window.removeEventListener("deviceorientation", h);
      window.removeEventListener("deviceorientationabsolute", h as EventListener);
    }
    attachedRef.current = false;
  }

  async function requestIos() {
    const Ctor = DeviceOrientationEvent as IosOrientationCtor;
    try {
      const res = await Ctor.requestPermission!();
      if (res === "granted") attach();
      else setState("denied");
    } catch {
      setState("denied");
    }
  }

  const angle = heading ?? 0;
  const currentZone = useMemo(() => zoneAt(angle), [angle]);
  const hasReading = heading != null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center min-h-14">
        {hasReading ? (
          <>
            <div className="text-4xl font-bold tabular-nums">
              {Math.round(angle)}°
            </div>
            <div className="text-sm text-muted">{tDir(currentZone.key)}</div>
          </>
        ) : (
          <div className="text-sm text-muted">
            {state === "waiting" ? t("waiting") : " "}
          </div>
        )}
      </div>

      <CompassDial
        angle={angle}
        depth={depth}
        active={hasReading}
        translations={{ n: t("north"), s: t("south"), e: t("east"), w: t("west") }}
      />

      {hasReading && (
        <div className="w-full max-w-md rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ background: currentZone.color }} />
            <div className="font-semibold">
              {tDir(currentZone.key)} · {tEl(currentZone.element)}
            </div>
          </div>
          <div className="mt-2 text-sm text-muted">
            {currentZone.ruler} · {currentZone.planet}
          </div>
          <div className="mt-3 text-xs">
            <div className="mb-1">
              <span className="text-muted">✓ </span>
              {currentZone.goodFor.join(", ")}
            </div>
            <div>
              <span className="text-red-500">✗ </span>
              {currentZone.avoid.join(", ")}
            </div>
          </div>
        </div>
      )}

      {state === "idle" && needsIosPrompt.current && (
        <button
          onClick={requestIos}
          className="w-full max-w-md rounded-xl bg-accent px-4 py-3 font-semibold text-accent-fg"
        >
          {t("enableSensor")}
        </button>
      )}
      {state === "waiting" && !hasReading && (
        <div className="text-xs text-muted">{t("calibrate")}</div>
      )}
      {state === "denied" && (
        <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {t("denied")}
        </div>
      )}
      {state === "unsupported" && (
        <div className="w-full max-w-md rounded-xl border p-3 text-sm text-muted">
          {t("notSupported")}
        </div>
      )}
    </div>
  );
}

function CompassDial({
  angle,
  depth,
  active,
  translations,
}: {
  angle: number;
  depth: "simple" | "full";
  active: boolean;
  translations: { n: string; s: string; e: string; w: string };
}) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;

  return (
    <div className="relative" style={{ width: size, height: size, maxWidth: "92vw" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        style={{
          transform: `rotate(${-angle}deg)`,
          transition: "transform 120ms linear",
          opacity: active ? 1 : 0.4,
        }}
      >
        {depth === "simple" ? (
          <SimpleZones16 cx={cx} cy={cy} r={r} />
        ) : (
          <MandalaZones cx={cx} cy={cy} r={r} />
        )}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={2} />
        {["N", "E", "S", "W"].map((label, i) => {
          const a = (i * 90 - 90) * (Math.PI / 180);
          const tx = cx + (r - 20) * Math.cos(a);
          const ty = cy + (r - 20) * Math.sin(a);
          return (
            <text
              key={label}
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={18}
              fontWeight={800}
              fill={label === "N" ? "#ef4444" : "var(--fg)"}
            >
              {label === "N" ? translations.n : label === "E" ? translations.e : label === "S" ? translations.s : translations.w}
            </text>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={`${cx},${cy - r + 4} ${cx - 10},${cy - 8} ${cx + 10},${cy - 8}`} fill="#ef4444" />
          <polygon points={`${cx},${cy + r - 4} ${cx - 6},${cy + 8} ${cx + 6},${cy + 8}`} fill="var(--muted)" />
          <circle cx={cx} cy={cy} r={6} fill="var(--fg)" />
        </svg>
      </div>
    </div>
  );
}

function SimpleZones16({ cx, cy, r }: { cx: number; cy: number; r: number }) {
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
              fillOpacity={0.22}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={700}
              fill="var(--fg)"
              fillOpacity={0.8}
            >
              {z.key}
            </text>
          </g>
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
      <clipPath id="mandalaClipDial">
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath="url(#mandalaClipDial)">
        {DEVATAS_45.map((d) =>
          d.pads.map(([row, col], idx) => {
            const fill =
              d.nature === "benefic" ? "#22c55e" : d.nature === "malefic" ? "#ef4444" : "#a1a1aa";
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

export { DIRECTIONS_16 };
