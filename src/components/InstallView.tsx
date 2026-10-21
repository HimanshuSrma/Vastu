"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  Check,
  Share,
  Plus,
  SquareArrowOutUpRight,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  usePwaStore,
  requestInstall,
  acknowledgeIosInstall,
  initPwaInstall,
} from "@/lib/pwa-install";

export function InstallView() {
  const t = useTranslations("install");

  useEffect(() => {
    initPwaInstall();
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--muted)]"
        >
          <ArrowLeft size={16} />
          {t("continue")}
        </Link>
        <PhaseRouter />
      </div>
    </div>
  );
}

function PhaseRouter() {
  const phase = usePwaStore((s) => s.phase);
  const platform = usePwaStore((s) => s.platform);
  const standalone = usePwaStore((s) => s.standalone);

  if (standalone || phase === "already_installed") return <AlreadyInstalled />;
  if (platform === "ios") return <IosFlow />;

  switch (phase) {
    case "idle":
    case "available":
    case "unavailable":
      return <InstallCta />;
    case "prompting":
      return <Prompting />;
    case "countdown":
      return <CountdownView />;
    case "success":
      return <SuccessView />;
    case "dismissed":
      return <DismissedView />;
    default:
      return <InstallCta />;
  }
}

function InstallCta() {
  const t = useTranslations("install");
  const phase = usePwaStore((s) => s.phase);
  const isUnavailable = phase === "unavailable";

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-10">
      <img
        src="/icons/icon.svg"
        alt=""
        className="mb-5 h-24 w-24 rounded-3xl shadow-lg"
        width={96}
        height={96}
      />
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        {isUnavailable ? t("unavailableMessage") : t("description")}
      </p>
      {!isUnavailable && (
        <button
          onClick={() => requestInstall({ inline: true })}
          className="mt-8 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-[var(--accent-fg)]"
        >
          <Download size={18} />
          {t("installButton")}
        </button>
      )}
    </div>
  );
}

function Prompting() {
  const t = useTranslations("install");

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-14">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
      <p className="mt-5 text-sm text-[var(--muted)]">{t("preparing")}</p>
    </div>
  );
}

function CountdownView() {
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
  const RADIUS = 50;
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
    <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-14">
      <div className="relative h-[140px] w-[140px]">
        <svg
          width="140"
          height="140"
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          <circle
            cx="70"
            cy="70"
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
        <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold">
          {countdown}
        </span>
      </div>
      <p className="mt-5 text-sm text-[var(--muted)]" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

function SuccessView() {
  const t = useTranslations("install");

  return (
    <div className="animate-fade-scale flex flex-col items-center rounded-2xl bg-emerald-600 px-6 py-14 text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
        <Check size={42} strokeWidth={3} />
      </div>
      <h1 className="mt-5 text-2xl font-bold">{t("successTitle")}</h1>
      <p className="mt-2 text-center text-sm opacity-90">
        {t("successMessage")}
      </p>
      <img
        src="/icons/icon.svg"
        alt=""
        className="mt-5 h-16 w-16 rounded-xl"
        width={64}
        height={64}
      />
      <Link
        href="/"
        className="mt-8 rounded-xl bg-white/20 px-8 py-3 text-sm font-semibold backdrop-blur"
      >
        {t("continue")}
      </Link>
    </div>
  );
}

function DismissedView() {
  const t = useTranslations("install");

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-10">
      <Download size={44} className="text-[var(--muted)]" />
      <h1 className="mt-4 text-lg font-bold">{t("dismissedTitle")}</h1>
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        {t("dismissedMessage")}
      </p>
      <button
        onClick={() => requestInstall({ inline: true })}
        className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}

function IosFlow() {
  const phase = usePwaStore((s) => s.phase);

  if (phase === "acknowledged") return <IosAcknowledgedView />;
  return <IosInstructionsView />;
}

function IosInstructionsView() {
  const t = useTranslations("install");
  const browser = usePwaStore((s) => s.browser);

  if (browser !== "safari") {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-10">
        <SquareArrowOutUpRight size={44} className="text-[var(--accent)]" />
        <h1 className="mt-4 text-lg font-bold">{t("iosTitle")}</h1>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          {t("iosNeedSafari")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-10">
      <img
        src="/icons/icon.svg"
        alt=""
        className="mb-5 h-20 w-20 rounded-2xl shadow-lg"
        width={80}
        height={80}
      />
      <h1 className="text-xl font-bold">{t("iosTitle")}</h1>

      <div className="mt-6 w-full space-y-4">
        <div className="flex items-center gap-4 rounded-xl border-2 border-[var(--accent)] p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
            <Share size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold">{t("iosStep1Label")}</p>
            <p className="text-xs text-[var(--muted)]">{t("iosStep1Hint")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            <Plus size={22} />
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
        className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-[var(--accent-fg)]"
      >
        <Check size={18} />
        {t("iosAdded")}
      </button>
    </div>
  );
}

function IosAcknowledgedView() {
  const t = useTranslations("install");

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
        <Check size={32} strokeWidth={3} />
      </div>
      <h1 className="mt-4 text-lg font-bold">{t("iosAcknowledgedTitle")}</h1>
      <p className="mt-2 text-center text-sm text-[var(--muted)]">
        {t("iosAcknowledgedMessage")}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {t("continue")}
      </Link>
    </div>
  );
}

function AlreadyInstalled() {
  const t = useTranslations("install");

  return (
    <div className="flex flex-col items-center rounded-2xl border bg-[var(--card)] px-6 py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
        <Check size={32} strokeWidth={3} />
      </div>
      <h1 className="mt-4 text-lg font-bold">{t("alreadyInstalled")}</h1>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {t("continue")}
      </Link>
    </div>
  );
}

