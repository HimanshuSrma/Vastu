import { create } from "zustand";

export type InstallPhase =
  | "idle"
  | "available"
  | "prompting"
  | "countdown"
  | "success"
  | "dismissed"
  | "instructions"
  | "acknowledged"
  | "already_installed"
  | "unavailable";

export type Platform = "ios" | "android" | "desktop";
export type Browser = "safari" | "chrome" | "firefox" | "edge" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/EdgiOS|Edg\//.test(ua)) return "edge";
  if (/CriOS|Chrome/.test(ua) && !/Edg/.test(ua)) return "chrome";
  if (/FxiOS|Firefox/.test(ua)) return "firefox";
  if (/Safari/.test(ua)) return "safari";
  return "other";
}

export function checkStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const BANNER_DISMISSED_KEY = "vastu-install-dismissed";

interface PwaStore {
  phase: InstallPhase;
  platform: Platform;
  browser: Browser;
  standalone: boolean;
  countdown: number;
  dialogOpen: boolean;
  bannerDismissed: boolean;

  setPhase: (p: InstallPhase) => void;
  setCountdown: (n: number) => void;
  openDialog: () => void;
  closeDialog: () => void;
  dismissBanner: () => void;
}

export const usePwaStore = create<PwaStore>()((set) => ({
  phase: "idle",
  platform: "desktop",
  browser: "other",
  standalone: false,
  countdown: 10,
  dialogOpen: false,
  bannerDismissed: false,

  setPhase: (phase) => set({ phase }),
  setCountdown: (countdown) => set({ countdown }),
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false, countdown: 10 }),
  dismissBanner: () => {
    set({ bannerDismissed: true });
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, "1");
    } catch {
      /* noop */
    }
  },
}));

export function initPwaInstall() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  const platform = detectPlatform();
  const browser = detectBrowser();
  const standalone = checkStandalone();

  let bannerDismissed = false;
  try {
    bannerDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === "1";
  } catch {
    /* noop */
  }

  if (standalone) {
    usePwaStore.setState({
      platform,
      browser,
      standalone,
      bannerDismissed,
      phase: "already_installed",
    });
    return;
  }

  usePwaStore.setState({ platform, browser, standalone, bannerDismissed });

  if (platform === "ios") {
    usePwaStore.setState({
      phase: browser === "safari" ? "available" : "unavailable",
    });
    return;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    usePwaStore.setState({ phase: "available" });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    const { phase } = usePwaStore.getState();
    if (phase !== "countdown") {
      usePwaStore.setState({ phase: "success" });
    }
  });

  setTimeout(() => {
    if (usePwaStore.getState().phase === "idle") {
      usePwaStore.setState({ phase: "unavailable" });
    }
  }, 3000);
}

export async function requestInstall() {
  const { platform } = usePwaStore.getState();

  if (platform === "ios") {
    usePwaStore.setState({ phase: "instructions", dialogOpen: true });
    return;
  }

  if (!deferredPrompt) {
    usePwaStore.setState({ phase: "unavailable" });
    return;
  }

  usePwaStore.setState({ phase: "prompting" });

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;

    if (outcome === "accepted") {
      usePwaStore.setState({ phase: "countdown", countdown: 10 });
    } else {
      usePwaStore.setState({ phase: "dismissed" });
    }
  } catch {
    usePwaStore.setState({ phase: "unavailable" });
  }
}

export function acknowledgeIosInstall() {
  usePwaStore.setState({ phase: "acknowledged" });
}
