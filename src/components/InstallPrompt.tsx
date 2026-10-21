"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  X,
  Check,
  Share,
  Plus,
  SquareArrowOutUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePwaStore,
  requestInstall,
  acknowledgeIosInstall,
} from "@/lib/pwa-install";

export function InstallPrompt() {
  const phase = usePwaStore((s) => s.phase);
  const standalone = usePwaStore((s) => s.standalone);
  const bannerDismissed = usePwaStore((s) => s.bannerDismissed);
  const dialogOpen = usePwaStore((s) => s.dialogOpen);

  if (standalone || phase === "already_installed") return null;

  const isInstallPage =
    typeof window !== "undefined" &&
    /\/install\/?$/.test(window.location.pathname);
  if (isInstallPage) return null;

  const showBanner = !bannerDismissed && !dialogOpen && phase === "available";

  return (
    <>
      {showBanner && <InstallBanner />}
      {dialogOpen && <InstallDialog />}
    </>
  );
}

function InstallBanner() {
  const t = useTranslations("install");
  const dismissBanner = usePwaStore((s) => s.dismissBanner);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-2">
      <div className="flex items-center gap-3 rounded-xl border bg-[var(--card)] p-3">
        <img
          src="/icons/icon.svg"
          alt=""
          className="h-10 w-10 rounded-lg"
          width={40}
          height={40}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{t("bannerTitle")}</p>
          <p className="truncate text-xs text-[var(--muted)]">
            {t("bannerSubtitle")}
          </p>
        </div>
        <button
          onClick={() => requestInstall()}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)]"
        >
          {t("install")}
        </button>
        <button
          onClick={dismissBanner}
          className="shrink-0 p-1 text-[var(--muted)]"
          aria-label={t("close")}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function InstallDialog() {
  const phase = usePwaStore((s) => s.phase);
  const closeDialog = usePwaStore((s) => s.closeDialog);
  const canClose =
    phase !== "success" && phase !== "countdown" && phase !== "prompting";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={canClose ? closeDialog : undefined}
      />
      <div
        className={cn(
          "relative z-10 mx-4 mb-4 w-full max-w-md overflow-hidden rounded-2xl shadow-xl sm:mb-0",
          phase === "success"
            ? "bg-emerald-600 text-white"
            : "bg-[var(--card)] text-[var(--fg)]",
        )}
        role="dialog"
        aria-modal="true"
      >
        {canClose && (
          <button
            onClick={closeDialog}
            className="absolute right-3 top-3 z-10 rounded-full p-1.5 hover:bg-black/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
        <DialogBody />
      </div>
    </div>
  );
}

function DialogBody() {
  const phase = usePwaStore((s) => s.phase);
  const platform = usePwaStore((s) => s.platform);

  if (
    platform === "ios" &&
    (phase === "available" || phase === "instructions")
  ) {
    return <IosInstructions />;
  }

  switch (phase) {
    case "available":
    case "idle":
      return <InstallCta />;
    case "prompting":
      return <Prompting />;
    case "countdown":
      return <Countdown />;
    case "success":
      return <SuccessScreen />;
    case "dismissed":
      return <Dismissed />;
    case "acknowledged":
      return <IosAcknowledged />;
    case "unavailable":
      return <Unavailable />;
    default:
      return <InstallCta />;
  }
}

function InstallCta() {
  const t = useTranslations("install");

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <img
        src="/icons/icon.svg"
        alt=""
        className="mb-4 h-20 w-20 rounded-2xl shadow-lg"
        width={80}
        height={80}
      />
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <p className="mt-1 text-center text-sm text-[var(--muted)]">
        {t("description")}
      </p>
      <button
        onClick={() => requestInstall()}
        className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        <Download size={18} />
        {t("installButton")}
      </button>
    </div>
  );
}

function Prompting() {
  const t = useTranslations("install");

  return (
    <div className="flex flex-col items-center px-6 py-10">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
      <p className="mt-4 text-sm text-[var(--muted)]">{t("preparing")}</p>
    </div>
  );
}

function Countdown() {
  const t = useTranslations("install");
  const countdown = usePwaStore((s) => s.countdown);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const current = usePwaStore.getState().countdown;
      if (current <= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        usePwaStore.setState({ phase: "success" });
        return;
      }
      usePwaStore.setState({ countdown: current - 1 });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progress = (10 - countdown) / 10;
  const RADIUS = 45;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE * (1 - progress);

  const message =
    countdown > 7
      ? t("preparing")
      : countdown > 4
        ? t("almostThere")
        : countdown > 1
          ? t("finalizing")
          : t("checking");

  return (
    <div className="flex flex-col items-center px-6 py-10">
      <div className="relative h-[120px] w-[120px]">
        <svg
          width="120"
          height="120"
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="countdown-arc"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
          {countdown}
        </span>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

function SuccessScreen() {
  const t = useTranslations("install");
  const closeDialog = usePwaStore((s) => s.closeDialog);

  return (
    <div className="animate-fade-scale flex flex-col items-center px-6 py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
        <Check size={36} strokeWidth={3} />
      </div>
      <h2 className="mt-4 text-xl font-bold">{t("successTitle")}</h2>
      <p className="mt-2 text-center text-sm opacity-90">
        {t("successMessage")}
      </p>
      <img
        src="/icons/icon.svg"
        alt=""
        className="mt-4 h-14 w-14 rounded-xl"
        width={56}
        height={56}
      />
      <button
        onClick={closeDialog}
        className="mt-6 rounded-xl bg-white/20 px-8 py-3 text-sm font-semibold backdrop-blur"
      >
        {t("continue")}
      </button>
    </div>
  );
}

function Dismissed() {
  const t = useTranslations("install");
  const closeDialog = usePwaStore((s) => s.closeDialog);

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <X size={40} className="text-[var(--muted)]" />
      <h2 className="mt-3 text-lg font-bold">{t("dismissedTitle")}</h2>
      <p className="mt-1 text-center text-sm text-[var(--muted)]">
        {t("dismissedMessage")}
      </p>
      <button
        onClick={closeDialog}
        className="mt-6 rounded-xl border px-5 py-2.5 text-sm"
      >
        {t("close")}
      </button>
    </div>
  );
}

function IosInstructions() {
  const t = useTranslations("install");
  const browser = usePwaStore((s) => s.browser);

  if (browser !== "safari") {
    return (
      <div className="flex flex-col items-center px-6 py-8">
        <SquareArrowOutUpRight size={40} className="text-[var(--accent)]" />
        <h2 className="mt-3 text-lg font-bold">{t("iosTitle")}</h2>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          {t("iosNeedSafari")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <img
        src="/icons/icon.svg"
        alt=""
        className="mb-4 h-16 w-16 rounded-2xl shadow-lg"
        width={64}
        height={64}
      />
      <h2 className="text-lg font-bold">{t("iosTitle")}</h2>

      <div className="mt-5 w-full space-y-4">
        <div className="flex items-center gap-4 rounded-xl border-2 border-[var(--accent)] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
            <Share size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold">{t("iosStep1Label")}</p>
            <p className="text-xs text-[var(--muted)]">{t("iosStep1Hint")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            <Plus size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold">{t("iosStep2Label")}</p>
            <p className="text-xs text-[var(--muted)]">{t("iosStep2Hint")}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]">
        <Share size={14} />
        <span>{t("iosArrowHint")}</span>
      </div>

      <button
        onClick={() => acknowledgeIosInstall()}
        className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        <Check size={18} />
        {t("iosAdded")}
      </button>
    </div>
  );
}

function IosAcknowledged() {
  const t = useTranslations("install");
  const closeDialog = usePwaStore((s) => s.closeDialog);

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
        <Check size={28} strokeWidth={3} />
      </div>
      <h2 className="mt-3 text-lg font-bold">{t("iosAcknowledgedTitle")}</h2>
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        {t("iosAcknowledgedMessage")}
      </p>
      <button
        onClick={closeDialog}
        className="mt-6 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {t("continue")}
      </button>
    </div>
  );
}

function Unavailable() {
  const t = useTranslations("install");
  const closeDialog = usePwaStore((s) => s.closeDialog);

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <Download size={40} className="text-[var(--muted)]" />
      <h2 className="mt-3 text-lg font-bold">{t("unavailableTitle")}</h2>
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        {t("unavailableMessage")}
      </p>
      <button
        onClick={closeDialog}
        className="mt-6 rounded-xl border px-5 py-2.5 text-sm"
      >
        {t("close")}
      </button>
    </div>
  );
}
