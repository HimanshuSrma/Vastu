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

type SensorState = "idle" | "waiting" | "granted" | "denied" | "unsupported" | "relative";

const SMOOTH = 0.2; // exponential moving-average alpha (0..1). Lower = smoother.

export function Compass() {
  const t = useTranslations("compass");
  const tDir = useTranslations("directions");
  const tEl = useTranslations("elements");
  const depth = useSettings((s) => s.depth);

  const [displayHeading, setDisplayHeading] = useState<number | null>(null);
  const [state, setState] = useState<SensorState>("idle");
  const smoothedRef = useRef<number | null>(null);
  const rawRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const listenersRef = useRef<{ abs?: EventListener; rel?: EventListener }>({});
  const attachedRef = useRef(false);
  const gotAbsoluteRef = useRef(false);
  const needsIosPrompt = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof DeviceOrientationEvent === "undefined") {
      setState("unsupported");
      return;
    }
    const Ctor = DeviceOrientationEvent as IosOrientationCtor;
    const iosGate = typeof Ctor.requestPermission === "function";

    if (iosGate) {
      needsIosPrompt.current = true;
      setState("idle");
      const onFirstTap = () => {
        void requestIos();
      };
      document.addEventListener("pointerdown", onFirstTap, { once: true });
      return () => {
        document.removeEventListener("pointerdown", onFirstTap);
        detach();
        cancelRaf();
      };
    }

    attach();
    const noSensorTimer = window.setTimeout(() => {
      if (rawRef.current == null) setState("unsupported");
    }, 3000);

    return () => {
      window.clearTimeout(noSensorTimer);
      detach();
      cancelRaf();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAbsolute(ev: Event) {
    const e = ev as OrientationEvent;
    gotAbsoluteRef.current = true;
    const h =
      typeof e.webkitCompassHeading === "number"
        ? e.webkitCompassHeading
        : e.alpha != null
          ? 360 - e.alpha
          : null;
    if (h == null) return;
    ingest(normalizeAngle(h), true);
  }

  function handleRelative(ev: Event) {
    const e = ev as OrientationEvent;
    // Only use relative event if absolute never fires and it carries an iOS true-north hint,
    // or event.absolute === true.
    if (gotAbsoluteRef.current) return;
    if (typeof e.webkitCompassHeading === "number") {
      ingest(normalizeAngle(e.webkitCompassHeading), true);
      return;
    }
    if (e.absolute === true && e.alpha != null) {
      ingest(normalizeAngle(360 - e.alpha), true);
      return;
    }
    // Fallback: relative alpha only (no true north). Mark degraded but still show something.
    if (e.alpha != null) {
      ingest(normalizeAngle(360 - e.alpha), false);
    }
  }

  function ingest(sample: number, isTrueNorth: boolean) {
    rawRef.current = sample;
    setState((s) => {
      if (s === "waiting" || s === "idle") return isTrueNorth ? "granted" : "relative";
      if (s === "relative" && isTrueNorth) return "granted";
      return s;
    });
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(tick);
  }

  function tick() {
    rafRef.current = null;
    const target = rawRef.current;
    if (target == null) return;
    const prev = smoothedRef.current;
    let next: number;
    if (prev == null) {
      next = target;
    } else {
      // shortest signed delta on a circle
      let delta = ((target - prev + 540) % 360) - 180;
      next = normalizeAngle(prev + delta * SMOOTH);
      // if very close to target, snap so we stop scheduling
      if (Math.abs(delta) < 0.2) next = target;
    }
    smoothedRef.current = next;
    setDisplayHeading(next);
    if (Math.abs((((rawRef.current ?? next) - next + 540) % 360) - 180) > 0.2) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  function cancelRaf() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function attach() {
    if (attachedRef.current) return;
    listenersRef.current.abs = handleAbsolute as EventListener;
    listenersRef.current.rel = handleRelative as EventListener;
    window.addEventListener("deviceorientationabsolute", listenersRef.current.abs, true);
    window.addEventListener("deviceorientation", listenersRef.current.rel, true);
    attachedRef.current = true;
    setState("waiting");
  }

  function detach() {
    const { abs, rel } = listenersRef.current;
    if (abs) window.removeEventListener("deviceorientationabsolute", abs);
    if (rel) window.removeEventListener("deviceorientation", rel);
    listenersRef.current = {};
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

  const angle = displayHeading ?? 0;
  const currentZone = useMemo(() => zoneAt(angle), [angle]);
  const hasReading = displayHeading != null;
  const isDegraded = state === "relative";

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

      {isDegraded && (
        <div className="w-full max-w-md rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
          {t("relative")}
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
          transformOrigin: "50% 50%",
          willChange: "transform",
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
