import { create } from "zustand";
import {
  getEnvironment,
  notifyPromptCaptured,
  notifyAppInstalled,
} from "@/pwa/environment";

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

function mapPlatform(): Platform {
  const env = getEnvironment();
  if (env.platform === "ios" || env.platform === "ipados") return "ios";
  if (env.platform === "android") return "android";
  return "desktop";
}

function mapBrowser(): Browser {
  const b = getEnvironment().browser;
  if (b === "safari") return "safari";
  if (b === "chrome" || b === "chrome-ios") return "chrome";
  if (b === "firefox") return "firefox";
  if (b === "edge") return "edge";
  return "other";
}

function isStandalone(): boolean {
  const dm = getEnvironment().displayMode;
  return dm !== "browser" && dm !== "unknown";
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

  const platform = mapPlatform();
  const browser = mapBrowser();
  const standalone = isStandalone();

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
    notifyPromptCaptured();
    usePwaStore.setState({ phase: "available" });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyAppInstalled();
    const { phase } = usePwaStore.getState();
    if (phase !== "countdown") {
      usePwaStore.setState({ phase: "success" });
    }
  });

  setTimeout(() => {
    if (usePwaStore.getState().phase === "idle") {
      usePwaStore.setState({ phase: "unavailable" });
    }
  }, 15000);
}

export async function requestInstall(options: { inline?: boolean } = {}) {
  const { platform } = usePwaStore.getState();
  const dialog = !options.inline;

  if (platform === "ios") {
    usePwaStore.setState({ phase: "instructions", dialogOpen: dialog });
    return;
  }

  if (!deferredPrompt) {
    usePwaStore.setState({ phase: "unavailable", dialogOpen: dialog });
    return;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;

    if (outcome === "accepted") {
      usePwaStore.setState({
        phase: "countdown",
        countdown: 10,
        dialogOpen: dialog,
      });
    } else {
      usePwaStore.setState({ phase: "dismissed", dialogOpen: dialog });
    }
  } catch {
    usePwaStore.setState({ phase: "unavailable", dialogOpen: dialog });
  }
}

export function acknowledgeIosInstall() {
  usePwaStore.setState({ phase: "acknowledged" });
}
