"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { normalizeAngle, DIRECTIONS_16, DEG_PER_DIR } from "@/lib/utils";
import {
  tiltCompensatedHeading,
  applyScreenAngle,
  smoothStep,
  readScreenAngle,
} from "@/lib/heading";
import { declinationDegrees } from "@/lib/declination";
import { ZONES_SIMPLE, DEVATAS_45, MANDALA_GRID_SIZE, zoneAt } from "@/lib/vastu-data";
import { useSettings } from "@/lib/store";

type OrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};
type IosOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type SensorState =
  | "idle"
  | "prompting"
  | "waiting"
  | "granted"
  | "denied"
  | "blocked"
  | "unsupported"
  | "relative";

const KEY_STATE = "vastu-ios-sensor";
const KEY_DENIALS = "vastu-ios-denials";
const KEY_DECL = "vastu-declination";
const DECL_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DENIALS = 3;

type DeclCache = { lat: number; lon: number; decl: number; t: number };

function readLS(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function writeLS(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

export function Compass() {
  const t = useTranslations("compass");
  const tDir = useTranslations("directions");
  const tEl = useTranslations("elements");
  const depth = useSettings((s) => s.depth);

  const [displayHeading, setDisplayHeading] = useState<number | null>(null);
  const [state, setState] = useState<SensorState>("idle");
  const [denials, setDenials] = useState(0);
  const [decl, setDecl] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locState, setLocState] = useState<
    "idle" | "prompt" | "asking" | "ok" | "err" | "blocked" | "unsupported"
  >("idle");
  const smoothedRef = useRef<number | null>(null);
  const rawRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const screenAngleRef = useRef(0);
  const declRef = useRef(0);
  const trueNorthRef = useRef(false);
  const listenersRef = useRef<{ abs?: EventListener; rel?: EventListener }>({});
  const attachedRef = useRef(false);
  const gotAbsoluteRef = useRef(false);
  const isIos = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof DeviceOrientationEvent === "undefined") {
      setState("unsupported");
      return;
    }
    const Ctor = DeviceOrientationEvent as IosOrientationCtor;
    isIos.current = typeof Ctor.requestPermission === "function";

    screenAngleRef.current = readScreenAngle();
    const onOri = () => {
      screenAngleRef.current = readScreenAngle();
    };
    window.addEventListener("orientationchange", onOri);
    window.screen?.orientation?.addEventListener?.("change", onOri);

    const prior = readLS(KEY_STATE);
    const priorDenials = Number(readLS(KEY_DENIALS) ?? "0");
    setDenials(priorDenials);
    loadCachedDeclination();
    void initLocationFlow();

    if (!isIos.current) {
      attach();
      const t = window.setTimeout(() => {
        if (rawRef.current == null) setState("unsupported");
      }, 3000);
      return () => {
        window.clearTimeout(t);
        detach();
        cancelRaf();
        window.removeEventListener("orientationchange", onOri);
        window.screen?.orientation?.removeEventListener?.("change", onOri);
      };
    }

    // iOS path.
    if (prior === "granted") {
      setState("prompting");
      armFirstTap();
    } else if (priorDenials >= MAX_DENIALS) {
      setState("blocked");
    } else {
      setState("prompting");
      armFirstTap();
    }

    return () => {
      detach();
      cancelRaf();
      disarmFirstTap();
      window.removeEventListener("orientationchange", onOri);
      window.screen?.orientation?.removeEventListener?.("change", onOri);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadCachedDeclination() {
    const raw = readLS(KEY_DECL);
    if (!raw) return;
    try {
      const c = JSON.parse(raw) as DeclCache;
      if (typeof c.decl === "number") {
        declRef.current = c.decl;
        setDecl(c.decl);
      }
    } catch {}
  }

  async function initLocationFlow() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocState("unsupported");
      return;
    }
    // Fresh cache → skip re-asking.
    const raw = readLS(KEY_DECL);
    if (raw) {
      try {
        const c = JSON.parse(raw) as DeclCache;
        if (Date.now() - c.t < DECL_TTL_MS) {
          setLocState("ok");
          return;
        }
      } catch {}
    }
    // Fire the native browser prompt directly. Works on iOS Safari and
    // Android Chrome without a user gesture; declined path shows retry UI.
    requestLocation();
  }

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocState("unsupported");
      return;
    }
    setLocState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const d = declinationDegrees(pos.coords.latitude, pos.coords.longitude);
          declRef.current = d;
          setDecl(d);
          setLocState("ok");
          writeLS(
            KEY_DECL,
            JSON.stringify({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              decl: d,
              t: Date.now(),
            } satisfies DeclCache),
          );
        } catch {
          setLocState("err");
        }
      },
      (err) => {
        setLocState(err.code === err.PERMISSION_DENIED ? "blocked" : "err");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600_000 },
    );
  }

  const firstTapRef = useRef<((e: Event) => void) | null>(null);
  function armFirstTap() {
    disarmFirstTap();
    const handler = () => {
      void requestIos();
    };
    firstTapRef.current = handler;
    document.addEventListener("pointerdown", handler, { once: true });
  }
  function disarmFirstTap() {
    if (firstTapRef.current) {
      document.removeEventListener("pointerdown", firstTapRef.current);
      firstTapRef.current = null;
    }
  }

  function handleAbsolute(ev: Event) {
    const e = ev as OrientationEvent;
    gotAbsoluteRef.current = true;
    updateAccuracy(e);
    // iOS webkitCompassHeading is already true north (when accuracy > 0).
    if (typeof e.webkitCompassHeading === "number") {
      const h = applyScreenAngle(e.webkitCompassHeading, screenAngleRef.current);
      ingest(h, true, true);
      return;
    }
    // Non-iOS absolute: alpha is Earth-frame magnetic yaw. Compensate tilt.
    if (e.alpha != null && e.beta != null && e.gamma != null) {
      const magnetic = tiltCompensatedHeading(e.alpha, e.beta, e.gamma);
      const h = applyScreenAngle(magnetic + declRef.current, screenAngleRef.current);
      ingest(h, true, false);
    }
  }

  function handleRelative(ev: Event) {
    const e = ev as OrientationEvent;
    if (gotAbsoluteRef.current) return;
    updateAccuracy(e);
    if (typeof e.webkitCompassHeading === "number") {
      const h = applyScreenAngle(e.webkitCompassHeading, screenAngleRef.current);
      ingest(h, true, true);
      return;
    }
    if (e.absolute === true && e.alpha != null && e.beta != null && e.gamma != null) {
      const magnetic = tiltCompensatedHeading(e.alpha, e.beta, e.gamma);
      const h = applyScreenAngle(magnetic + declRef.current, screenAngleRef.current);
      ingest(h, true, false);
      return;
    }
    if (e.alpha != null && e.beta != null && e.gamma != null) {
      // Relative sensor — best-effort tilt-compensated, but frame drifts.
      const magnetic = tiltCompensatedHeading(e.alpha, e.beta, e.gamma);
      ingest(applyScreenAngle(magnetic, screenAngleRef.current), false, false);
    }
  }

  function updateAccuracy(e: OrientationEvent) {
    if (typeof e.webkitCompassAccuracy === "number") {
      // iOS: -1 = invalid, otherwise +/- deg.
      setAccuracy(e.webkitCompassAccuracy < 0 ? null : e.webkitCompassAccuracy);
    }
  }

  function ingest(sample: number, isAbsolute: boolean, isTrueNorth: boolean) {
    rawRef.current = normalizeAngle(sample);
    setState((s) => {
      if (s === "waiting" || s === "idle" || s === "prompting")
        return isAbsolute ? "granted" : "relative";
      if (s === "relative" && isAbsolute) return "granted";
      return s;
    });
    // Track true-north status via ref so we can label UI without extra renders.
    trueNorthRef.current = isTrueNorth || declRef.current !== 0;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(tick);
  }

  function tick() {
    rafRef.current = null;
    const target = rawRef.current;
    if (target == null) return;
    const next = smoothStep(smoothedRef.current, target);
    smoothedRef.current = next;
    setDisplayHeading(next);
    const drift = ((target - next + 540) % 360) - 180;
    if (Math.abs(drift) > 0.3) {
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
    window.addEventListener(
      "deviceorientationabsolute",
      listenersRef.current.abs,
      true,
    );
    window.addEventListener(
      "deviceorientation",
      listenersRef.current.rel,
      true,
    );
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
    if (typeof Ctor.requestPermission !== "function") {
      attach();
      return;
    }
    try {
      const res = await Ctor.requestPermission();
      if (res === "granted") {
        writeLS(KEY_STATE, "granted");
        writeLS(KEY_DENIALS, "0");
        setDenials(0);
        attach();
      } else {
        onDeny();
      }
    } catch {
      onDeny();
    }
  }

  function onDeny() {
    const next = denials + 1;
    setDenials(next);
    writeLS(KEY_DENIALS, String(next));
    writeLS(KEY_STATE, "denied");
    if (next >= MAX_DENIALS) {
      setState("blocked");
      return;
    }
    setState("denied");
    // Re-arm for another attempt on next tap.
    armFirstTap();
  }

  function resetPermission() {
    writeLS(KEY_STATE, "");
    writeLS(KEY_DENIALS, "0");
    setDenials(0);
    setState("prompting");
    armFirstTap();
  }

  const angle = displayHeading ?? 0;
  const currentZone = useMemo(() => zoneAt(angle), [angle]);
  const hasReading = displayHeading != null;
  const isDegraded = state === "relative";
  const isTrueNorth = trueNorthRef.current;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center min-h-14">
        {hasReading ? (
          <>
            <div className="text-4xl font-bold tabular-nums">
              {Math.round(angle)}°
            </div>
            <div className="text-sm text-muted">{tDir(currentZone.key)}</div>
            <div className="mt-1 flex justify-center gap-2 text-[10px]">
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  isTrueNorth
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                }`}
              >
                {isTrueNorth ? t("trueNorth") : t("magneticNorth")}
              </span>
              {decl != null && (
                <span className="rounded-full bg-muted/20 px-2 py-0.5 text-muted">
                  {t("declination", { val: decl.toFixed(1) })}
                </span>
              )}
              {accuracy != null && (
                <span className="rounded-full bg-muted/20 px-2 py-0.5 text-muted">
                  {t("accuracy", { val: Math.round(accuracy) })}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted">
            {state === "waiting" || state === "prompting"
              ? t("waiting")
              : " "}
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
            <div
              className="h-3 w-3 rounded-full"
              style={{ background: currentZone.color }}
            />
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

      {hasReading && decl == null && (locState === "err" || locState === "blocked") && (
        <div className="w-full max-w-md rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs">
          <div className="mb-2 text-yellow-700 dark:text-yellow-400">
            {t("locationDeclined")}
          </div>
          <button
            onClick={requestLocation}
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg"
          >
            {t("enableLocation")}
          </button>
        </div>
      )}

      {state === "prompting" && (
        <button
          onClick={requestIos}
          className="w-full max-w-md rounded-xl bg-accent px-4 py-3 font-semibold text-accent-fg"
        >
          {t("enableSensor")}
        </button>
      )}

      {state === "denied" && (
        <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <div className="mb-2 text-red-600 dark:text-red-400">
            {t("deniedRetry", { left: MAX_DENIALS - denials })}
          </div>
          <button
            onClick={requestIos}
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg"
          >
            {t("tryAgain")}
          </button>
        </div>
      )}

      {state === "blocked" && (
        <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <div className="mb-2 font-semibold text-red-600 dark:text-red-400">
            {t("blockedTitle")}
          </div>
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-xs text-muted">
            <li>{t("blockedStep1")}</li>
            <li>{t("blockedStep2")}</li>
            <li>{t("blockedStep3")}</li>
            <li>{t("blockedStep4")}</li>
          </ol>
          <button
            onClick={resetPermission}
            className="w-full rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            {t("iDidIt")}
          </button>
        </div>
      )}

      {state === "waiting" && !hasReading && (
        <div className="text-xs text-muted">{t("calibrate")}</div>
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
  const rInner = r - 24;

  return (
    <div
      className="relative"
      style={{ width: size, height: size, maxWidth: "92vw" }}
    >
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
          <SimpleZones16 cx={cx} cy={cy} r={rInner} />
        ) : (
          <MandalaZones cx={cx} cy={cy} r={rInner} />
        )}
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="var(--border)" strokeWidth={1} />
        <DegreeRing cx={cx} cy={cy} rOuter={r} rInner={rInner} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={2} />
        {["N", "E", "S", "W"].map((label, i) => {
          const a = (i * 90 - 90) * (Math.PI / 180);
          const tx = cx + (rInner - 14) * Math.cos(a);
          const ty = cy + (rInner - 14) * Math.sin(a);
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
              {label === "N"
                ? translations.n
                : label === "E"
                  ? translations.e
                  : label === "S"
                    ? translations.s
                    : translations.w}
            </text>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${cx},${cy - r + 4} ${cx - 10},${cy - 8} ${cx + 10},${cy - 8}`}
            fill="#ef4444"
          />
          <polygon
            points={`${cx},${cy + r - 4} ${cx - 6},${cy + 8} ${cx + 6},${cy + 8}`}
            fill="var(--muted)"
          />
          <circle cx={cx} cy={cy} r={6} fill="var(--fg)" />
        </svg>
      </div>
    </div>
  );
}

function DegreeRing({
  cx,
  cy,
  rOuter,
  rInner,
}: {
  cx: number;
  cy: number;
  rOuter: number;
  rInner: number;
}) {
  const ticks = [];
  for (let deg = 0; deg < 360; deg++) {
    const isMajor = deg % 10 === 0;
    const isMid = deg % 5 === 0;
    const len = isMajor ? 10 : isMid ? 6 : 3;
    const rad = (deg - 90) * (Math.PI / 180);
    const x1 = cx + rOuter * Math.cos(rad);
    const y1 = cy + rOuter * Math.sin(rad);
    const x2 = cx + (rOuter - len) * Math.cos(rad);
    const y2 = cy + (rOuter - len) * Math.sin(rad);
    ticks.push(
      <line
        key={`t${deg}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--fg)"
        strokeWidth={isMajor ? 1 : 0.6}
        strokeOpacity={isMajor ? 0.85 : isMid ? 0.6 : 0.4}
      />,
    );
  }
  const labels = [];
  const lr = rInner + 10;
  for (let deg = 0; deg < 360; deg += 10) {
    const rad = (deg - 90) * (Math.PI / 180);
    const lx = cx + lr * Math.cos(rad);
    const ly = cy + lr * Math.sin(rad);
    labels.push(
      <text
        key={`l${deg}`}
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={8}
        fontWeight={700}
        fill={deg === 0 ? "#ef4444" : "var(--fg)"}
        fillOpacity={0.85}
        transform={`rotate(${deg} ${lx} ${ly})`}
      >
        {deg}
      </text>,
    );
  }
  return (
    <g>
      {ticks}
      {labels}
    </g>
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

export { DIRECTIONS_16 };
