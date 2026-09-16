"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Download,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Undo2,
  X,
  Target,
} from "lucide-react";
import { ZONES_SIMPLE, DEVATAS_45, MANDALA_GRID_SIZE } from "@/lib/vastu-data";
import { DEG_PER_DIR } from "@/lib/utils";
import { useSettings } from "@/lib/store";

const PAN_STEP = 4;

type Transform = { rot: number; ox: number; oy: number; sc: number };
const DEFAULT_TX: Transform = { rot: 0, ox: 0, oy: 0, sc: 100 };
type Pt = { x: number; y: number };

function centroidOfPolygon(pts: Pt[]): Pt | null {
  const n = pts.length;
  if (n < 3) return null;
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const { x: x0, y: y0 } = pts[i];
    const { x: x1, y: y1 } = pts[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a /= 2;
  if (a === 0) return null;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function FloorPlan() {
  const t = useTranslations("plan");
  const depth = useSettings((s) => s.depth);
  const [pages, setPages] = useState<string[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [opacity, setOpacity] = useState(35);
  const [busy, setBusy] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [polygons, setPolygons] = useState<Record<number, Pt[]>>({});
  const [centroids, setCentroids] = useState<Record<number, Pt | null>>({});
  const [overlayOffsets, setOverlayOffsets] = useState<Record<number, Pt>>({});
  const polygon = polygons[pageIdx] ?? [];
  const centroid = centroids[pageIdx] ?? null;
  const overlayOffset = overlayOffsets[pageIdx] ?? { x: 0, y: 0 };

  const setOverlayOffsetForPage = (o: Pt) => {
    setOverlayOffsets((prev) => ({ ...prev, [pageIdx]: o }));
  };

  const setPolyForPage = (updater: (prev: Pt[]) => Pt[]) => {
    setPolygons((prev) => ({ ...prev, [pageIdx]: updater(prev[pageIdx] ?? []) }));
  };
  const setCentroidForPage = (c: Pt | null) => {
    setCentroids((prev) => ({ ...prev, [pageIdx]: c }));
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const currentImg = pages[pageIdx] ?? null;
  const tx = transforms[pageIdx] ?? DEFAULT_TX;
  const stateRef = useRef({ tx, pageIdx });
  stateRef.current = { tx, pageIdx };

  const patchTx = (patch: Partial<Transform>) => {
    setTransforms((prev) => {
      const next = [...prev];
      next[pageIdx] = { ...(next[pageIdx] ?? DEFAULT_TX), ...patch };
      return next;
    });
  };

  const clampScale = (v: number) => Math.max(20, Math.min(400, v));
  const clampOff = (v: number) => Math.max(-100, Math.min(100, v));

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (f.type === "application/pdf") {
      await loadPdf(f);
    } else {
      const url = await readAsDataURL(f);
      setPages([url]);
      setTransforms([{ ...DEFAULT_TX }]);
      setPageIdx(0);
    }
  };

  const loadPdf = async (f: File) => {
    setLoadingPdf(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      const buf = await f.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const urls: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        urls.push(canvas.toDataURL("image/png"));
      }
      setPages(urls);
      setTransforms(urls.map(() => ({ ...DEFAULT_TX })));
      setPageIdx(0);
    } finally {
      setLoadingPdf(false);
    }
  };

  const clearAll = () => {
    setPages([]);
    setTransforms([]);
    setPageIdx(0);
  };

  const resetCurrent = () => patchTx({ rot: 0, ox: 0, oy: 0, sc: 100 });

  const transform = `translate(${tx.ox}%, ${tx.oy}%) rotate(${tx.rot}deg) scale(${tx.sc / 100})`;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!currentImg) return;
    if (drawMode) {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPolyForPage((prev) => [...prev, { x, y }]);
      setCentroidForPage(null);
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: stateRef.current.tx.sc,
      };
      panRef.current = null;
    } else if (pointersRef.current.size === 1) {
      panRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: stateRef.current.tx.ox,
        oy: stateRef.current.tx.oy,
      };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (drawMode) return;
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2 && pinchRef.current && stageRef.current) {
      const [a, b] = Array.from(pointersRef.current.values()).slice(0, 2);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = d / pinchRef.current.dist;
      patchTx({ sc: clampScale(Math.round(pinchRef.current.scale * ratio)) });
    } else if (pointersRef.current.size === 1 && panRef.current && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - panRef.current.x) / rect.width) * 100;
      const dyPct = ((e.clientY - panRef.current.y) / rect.height) * 100;
      patchTx({
        ox: clampOff(Math.round(panRef.current.ox + dxPct)),
        oy: clampOff(Math.round(panRef.current.oy + dyPct)),
      });
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (drawMode) return;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      panRef.current = null;
    } else if (pointersRef.current.size === 1) {
      const p = Array.from(pointersRef.current.values())[0];
      panRef.current = {
        x: p.x,
        y: p.y,
        ox: stateRef.current.tx.ox,
        oy: stateRef.current.tx.oy,
      };
    }
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!currentImg || drawMode) return;
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 8) return;
    const delta = -e.deltaY * 0.4;
    patchTx({ sc: clampScale(Math.round(stateRef.current.tx.sc + delta)) });
  }

  const handleDownload = async () => {
    if (!currentImg || busy) return;
    setBusy(true);
    try {
      const SIZE = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cardBg =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--card")
          .trim() || "#ffffff";
      ctx.fillStyle = cardBg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      const img = await loadImage(currentImg);
      const fit = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      const dw = img.naturalWidth * fit;
      const dh = img.naturalHeight * fit;
      const ox = (tx.ox / 100) * SIZE;
      const oy = (tx.oy / 100) * SIZE;

      ctx.save();
      ctx.translate(SIZE / 2 + ox, SIZE / 2 + oy);
      ctx.rotate((tx.rot * Math.PI) / 180);
      ctx.scale(tx.sc / 100, tx.sc / 100);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      if (svgRef.current) {
        const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", String(SIZE));
        clone.setAttribute("height", String(SIZE));
        const svgStr = new XMLSerializer().serializeToString(clone);
        const svgUrl =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
        const overlayImg = await loadImage(svgUrl);
        ctx.globalAlpha = opacity / 100;
        ctx.drawImage(overlayImg, 0, 0, SIZE, SIZE);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
      const chipW = 44;
      const chipH = 22;
      roundRect(ctx, SIZE / 2 - chipW / 2, 14, chipW, chipH, 11);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", SIZE / 2, 14 + chipH / 2 + 1);

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const suffix = pages.length > 1 ? `-page${pageIdx + 1}` : "";
          a.download = `vastu-plan${suffix}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          resolve();
        }, "image/png");
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("instructions")}</p>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
        >
          {loadingPdf ? t("loadingPdf") : t("upload")}
        </button>
        <button
          onClick={resetCurrent}
          disabled={!currentImg}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
        >
          {t("reset")}
        </button>
        <button
          onClick={clearAll}
          disabled={!currentImg}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
        >
          {t("clear")}
        </button>
        <button
          onClick={handleDownload}
          disabled={!currentImg || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
        >
          <Download size={14} />
          {busy ? t("downloading") : t("download")}
        </button>
        <button
          onClick={() => setDrawMode((v) => !v)}
          disabled={!currentImg}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm disabled:opacity-40 ${drawMode ? "bg-accent text-accent-fg border-transparent" : ""}`}
        >
          <PenLine size={14} />
          {drawMode ? t("exitDraw") : t("drawBoundary")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {pages.length > 1 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
          <button
            onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
            disabled={pageIdx === 0}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            {t("prev")}
          </button>
          <div className="font-medium">
            {t("pageOf", { current: pageIdx + 1, total: pages.length })}
          </div>
          <button
            onClick={() => setPageIdx((i) => Math.min(pages.length - 1, i + 1))}
            disabled={pageIdx === pages.length - 1}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 disabled:opacity-40"
          >
            {t("next")}
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div
        ref={stageRef}
        className="relative aspect-square w-full rounded-2xl border overflow-hidden bg-card touch-none select-none"
        style={{ cursor: currentImg ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {currentImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImg}
            alt={`floor plan page ${pageIdx + 1}`}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            style={{ transform }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">
            {loadingPdf ? t("loadingPdf") : t("upload")}
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: opacity / 100 }}
        >
          <g transform={`translate(${overlayOffset.x} ${overlayOffset.y})`}>
            {depth === "simple" ? <ZoneOverlay /> : <MandalaOverlay />}
          </g>
        </svg>
        {(polygon.length > 0 || centroid) && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {polygon.length >= 2 && (
              <polyline
                points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth={0.4}
                strokeLinejoin="round"
              />
            )}
            {centroid && polygon.length >= 3 && (
              <polygon
                points={polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="#0ea5e9"
                fillOpacity={0.12}
                stroke="#0ea5e9"
                strokeWidth={0.4}
              />
            )}
            {polygon.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={0.9} fill="#0ea5e9" stroke="#fff" strokeWidth={0.2} />
            ))}
            {centroid && (
              <g>
                <circle cx={centroid.x} cy={centroid.y} r={1} fill="#ef4444" stroke="#fff" strokeWidth={0.25} />
                <line x1={centroid.x - 1.4} y1={centroid.y} x2={centroid.x + 1.4} y2={centroid.y} stroke="#ef4444" strokeWidth={0.2} />
                <line x1={centroid.x} y1={centroid.y - 1.4} x2={centroid.x} y2={centroid.y + 1.4} stroke="#ef4444" strokeWidth={0.2} />
              </g>
            )}
          </svg>
        )}
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
          N
        </div>
      </div>

      {drawMode && (
        <div className="mt-3 rounded-xl border bg-card p-3 text-sm">
          <div className="mb-2 text-xs text-muted">
            {polygon.length < 3 ? t("tapToAdd") : `${polygon.length} pts`}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setPolyForPage((p) => p.slice(0, -1));
                setCentroidForPage(null);
              }}
              disabled={polygon.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <Undo2 size={14} />
              {t("undoPoint")}
            </button>
            <button
              onClick={() => {
                setPolyForPage(() => []);
                setCentroidForPage(null);
              }}
              disabled={polygon.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <X size={14} />
              {t("clearPoly")}
            </button>
            <button
              onClick={() => setCentroidForPage(centroidOfPolygon(polygon))}
              disabled={polygon.length < 3}
              className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg disabled:opacity-40"
            >
              <Target size={14} />
              {t("closePoly")}
            </button>
          </div>
          {centroid && (
            <>
              <div className="mt-2 text-xs">
                <span className="font-semibold text-red-500">✕ </span>
                {t("brahmasthan")} · {centroid.x.toFixed(1)}%, {centroid.y.toFixed(1)}%
              </div>
              <div className="mt-2 flex gap-2 flex-wrap">
                <button
                  onClick={() =>
                    setOverlayOffsetForPage({ x: centroid.x - 50, y: centroid.y - 50 })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
                >
                  <Target size={14} />
                  {t("alignOverlay")}
                </button>
                <button
                  onClick={() => setOverlayOffsetForPage({ x: 0, y: 0 })}
                  disabled={overlayOffset.x === 0 && overlayOffset.y === 0}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  <X size={14} />
                  {t("resetOverlay")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div
        className={`mt-4 ${drawMode ? "opacity-40 pointer-events-none" : ""}`}
        aria-disabled={drawMode}
      >
        <div className="text-xs text-muted mb-2">
          {t("pan")} · X: {tx.ox}% · Y: {tx.oy}%
        </div>
        <div className="mx-auto grid grid-cols-3 gap-1 w-40">
          <div />
          <PanBtn onClick={() => patchTx({ oy: clampOff(tx.oy - PAN_STEP) })} label="up">
            <ArrowUp size={20} />
          </PanBtn>
          <div />
          <PanBtn onClick={() => patchTx({ ox: clampOff(tx.ox - PAN_STEP) })} label="left">
            <ArrowLeft size={20} />
          </PanBtn>
          <button
            onClick={() => patchTx({ ox: 0, oy: 0 })}
            className="h-10 rounded-lg border text-xs"
          >
            •
          </button>
          <PanBtn onClick={() => patchTx({ ox: clampOff(tx.ox + PAN_STEP) })} label="right">
            <ArrowRight size={20} />
          </PanBtn>
          <div />
          <PanBtn onClick={() => patchTx({ oy: clampOff(tx.oy + PAN_STEP) })} label="down">
            <ArrowDown size={20} />
          </PanBtn>
          <div />
        </div>
      </div>

      <div
        className={`mt-4 space-y-3 ${drawMode ? "opacity-40 pointer-events-none" : ""}`}
        aria-disabled={drawMode}
      >
        <div>
          <label className="text-xs text-muted">{t("rotate")}: {tx.rot}°</label>
          <input
            type="range"
            min={-180}
            max={180}
            value={tx.rot}
            onChange={(e) => patchTx({ rot: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="text-xs text-muted">{t("scale")}: {tx.sc}%</label>
          <input
            type="range"
            min={20}
            max={400}
            value={tx.sc}
            onChange={(e) => patchTx({ sc: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs text-muted">{t("opacity")}: {opacity}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
    </div>
  );
}

function readAsDataURL(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function PanBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="h-10 rounded-lg border grid place-items-center active:bg-accent/10"
    >
      {children}
    </button>
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
