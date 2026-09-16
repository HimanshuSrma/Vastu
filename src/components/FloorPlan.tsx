"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Download } from "lucide-react";
import { ZONES_SIMPLE, DEVATAS_45, MANDALA_GRID_SIZE } from "@/lib/vastu-data";
import { DEG_PER_DIR } from "@/lib/utils";
import { useSettings } from "@/lib/store";

const PAN_STEP = 4; // percent of container per tap

export function FloorPlan() {
  const t = useTranslations("plan");
  const depth = useSettings((s) => s.depth);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(100);
  const [opacity, setOpacity] = useState(35);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImgUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const resetAll = () => {
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setScale(100);
  };

  const transform = `translate(${offsetX}%, ${offsetY}%) rotate(${rotation}deg) scale(${scale / 100})`;

  const handleDownload = async () => {
    if (!imgUrl || busy) return;
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

      const img = await loadImage(imgUrl);
      const fit = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      const dw = img.naturalWidth * fit;
      const dh = img.naturalHeight * fit;
      const ox = (offsetX / 100) * SIZE;
      const oy = (offsetY / 100) * SIZE;

      ctx.save();
      ctx.translate(SIZE / 2 + ox, SIZE / 2 + oy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale / 100, scale / 100);
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
      const chipX = SIZE / 2 - chipW / 2;
      const chipY = 14;
      roundRect(ctx, chipX, chipY, chipW, chipH, 11);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", SIZE / 2, chipY + chipH / 2 + 1);

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `vastu-plan-${Date.now()}.png`;
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
          {t("upload")}
        </button>
        <button
          onClick={resetAll}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          {t("reset")}
        </button>
        <button
          onClick={() => {
            setImgUrl(null);
            resetAll();
          }}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          {t("clear")}
        </button>
        <button
          onClick={handleDownload}
          disabled={!imgUrl || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
        >
          <Download size={14} />
          {busy ? t("downloading") : t("download")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="relative aspect-square w-full rounded-2xl border overflow-hidden bg-card">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt="floor plan"
            className="absolute inset-0 h-full w-full object-contain"
            style={{ transform, transition: "transform 120ms linear" }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">
            {t("upload")}
          </div>
        )}
        <svg
          ref={svgRef}
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

      {/* Pan D-pad */}
      <div className="mt-4">
        <div className="text-xs text-muted mb-2">
          {t("pan")} · X: {offsetX}% · Y: {offsetY}%
        </div>
        <div className="mx-auto grid grid-cols-3 gap-1 w-40">
          <div />
          <PanBtn onClick={() => setOffsetY((v) => v - PAN_STEP)} label="up">
            <ArrowUp size={20} />
          </PanBtn>
          <div />
          <PanBtn onClick={() => setOffsetX((v) => v - PAN_STEP)} label="left">
            <ArrowLeft size={20} />
          </PanBtn>
          <button
            onClick={() => {
              setOffsetX(0);
              setOffsetY(0);
            }}
            className="h-10 rounded-lg border text-xs"
          >
            •
          </button>
          <PanBtn onClick={() => setOffsetX((v) => v + PAN_STEP)} label="right">
            <ArrowRight size={20} />
          </PanBtn>
          <div />
          <PanBtn onClick={() => setOffsetY((v) => v + PAN_STEP)} label="down">
            <ArrowDown size={20} />
          </PanBtn>
          <div />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-muted">
            {t("rotate")}: {rotation}°
          </label>
          <input
            type="range"
            min={-180}
            max={180}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="text-xs text-muted">
            {t("scale")}: {scale}%
          </label>
          <input
            type="range"
            min={20}
            max={300}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="text-xs text-muted">
            {t("opacity")}: {opacity}%
          </label>
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
    </div>
  );
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
