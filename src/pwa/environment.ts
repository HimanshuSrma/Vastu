import type {
  PwaEnvironment,
  Platform,
  FormFactor,
  Engine,
  DisplayMode,
  InstallState,
  InstallConfidence,
  BrowserApis,
  NavigatorLike,
  ScreenLike,
  DocumentLike,
  LocationLike,
  MatchMediaFn,
  StorageLike,
} from './types';

// ── Constants ──────────────────────────────────────────────

const INSTALLED_SEEN_KEY = 'vastu-pwa-installed-seen';
const PHONE_MAX_PX = 600;
const TABLET_MAX_PX = 1024;
const PROMPT_TIMEOUT_MS = 5_000;
const RELATED_APPS_TIMEOUT_MS = 2_000;

const RUNNING_MODES: ReadonlySet<DisplayMode> = new Set([
  'standalone',
  'fullscreen',
  'minimal-ui',
  'window-controls-overlay',
  'twa',
]);

// ── Pure Detection (unit-testable) ─────────────────────────

export function detectEnvironment(apis: BrowserApis): PwaEnvironment {
  const { navigator: nav, screen, location, document: doc, matchMedia } = apis;

  const automated = isAutomated(nav, doc);
  const webview = isWebview(nav.userAgent);
  const platform = detectPlatform(nav, matchMedia, screen);
  const formFactor = detectFormFactor(matchMedia, screen, platform);
  const browser = detectBrowser(nav);
  const engine = detectEngine(nav, platform);
  const osVersion = parseOsVersion(nav.userAgent);
  const iosVersion = parseIosVersion(nav.userAgent, platform);
  const displayMode = detectDisplayMode(nav, doc, matchMedia);
  const { installState, installConfidence } = detectInstallState(
    displayMode,
    nav,
    doc,
    location,
    apis.storage,
  );
  const { canA2HS, reason } = computeCanA2HS({
    automated,
    webview,
    platform,
    browser,
    engine,
    installState,
  });

  return {
    platform,
    formFactor,
    browser,
    osVersion,
    iosVersion,
    engine,
    displayMode,
    installState,
    installConfidence,
    canA2HS,
    canPromptNatively: false,
    reason,
  };
}

// ── Platform ───────────────────────────────────────────────

function detectPlatform(
  nav: NavigatorLike,
  matchMedia: MatchMediaFn,
  screen: ScreenLike,
): Platform {
  if (nav.userAgentData) {
    const p = nav.userAgentData.platform.toLowerCase();
    if (p === 'android') return 'android';
    if (p === 'ios') return 'ios';
  }

  const ua = nav.userAgent;

  // iPad desktop mode: reports MacIntel but has multi-touch
  if (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1) return 'ipados';

  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';

  // Android "Request Desktop Site": UA looks like desktop Linux, but has
  // coarse pointer + touch + small screen
  if (
    /Linux/.test(ua) &&
    nav.maxTouchPoints > 0 &&
    matchMedia('(pointer: coarse)').matches &&
    Math.min(screen.width, screen.height) < TABLET_MAX_PX
  ) {
    return 'android';
  }

  return 'desktop';
}

// ── Form Factor ────────────────────────────────────────────

function detectFormFactor(
  matchMedia: MatchMediaFn,
  screen: ScreenLike,
  platform: Platform,
): FormFactor {
  if (platform === 'desktop') return 'desktop';

  const isTouch =
    matchMedia('(pointer: coarse)').matches &&
    matchMedia('(hover: none)').matches;
  if (!isTouch) return 'desktop';

  const minDim = Math.min(screen.width, screen.height);
  if (minDim < PHONE_MAX_PX) return 'phone';
  if (minDim <= TABLET_MAX_PX) return 'tablet';
  return 'desktop';
}

// ── Browser ────────────────────────────────────────────────

function detectBrowser(nav: NavigatorLike): string {
  if (nav.userAgentData?.brands) {
    const has = (name: string) =>
      nav.userAgentData!.brands.some((b) => b.brand === name);
    if (has('Microsoft Edge')) return 'edge';
    if (has('Opera')) return 'opera';
    if (has('Samsung Internet')) return 'samsung';
    if (has('Google Chrome') || has('Chromium')) return 'chrome';
  }

  const ua = nav.userAgent;
  if (/EdgiOS|Edg\//.test(ua)) return 'edge';
  if (/OPiOS|OPR\//.test(ua)) return 'opera';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if ((/FxiOS/.test(ua) || /Firefox\//.test(ua)) && !/Seamonkey/.test(ua))
    return 'firefox';
  if (/CriOS/.test(ua)) return 'chrome-ios';
  if (/Chrome\//.test(ua) && !/Edg|OPR/.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'safari';
  return 'unknown';
}

// ── Engine ─────────────────────────────────────────────────

function detectEngine(nav: NavigatorLike, platform: Platform): Engine {
  // All iOS/iPadOS browsers forced to WebKit by Apple
  if (platform === 'ios' || platform === 'ipados') return 'webkit';

  const ua = nav.userAgent;
  if (/Gecko\//.test(ua) && /Firefox/.test(ua)) return 'gecko';
  if (/Chrome\/|Chromium\/|OPR\/|Edg\//.test(ua)) return 'blink';
  if (/AppleWebKit\//.test(ua) && /Safari\//.test(ua)) return 'webkit';
  return 'unknown';
}

// ── OS / iOS Version ───────────────────────────────────────

function parseOsVersion(ua: string): string {
  const patterns: Array<[RegExp, boolean]> = [
    [/Android\s+([\d.]+)/, false],
    [/(?:iPhone|CPU) OS (\d+[_.\d]*)/, true],
    [/Mac OS X (\d+[_.\d]*)/, true],
    [/Windows NT ([\d.]+)/, false],
  ];
  for (const [re, fixUnderscores] of patterns) {
    const m = ua.match(re);
    if (m) return fixUnderscores ? m[1].replace(/_/g, '.') : m[1];
  }
  return '';
}

function parseIosVersion(ua: string, platform: Platform): string {
  if (platform !== 'ios' && platform !== 'ipados') return '';
  const m = ua.match(/(?:iPhone|CPU) OS (\d+[_.\d]*)/);
  if (m) return m[1].replace(/_/g, '.');
  // iPadOS desktop mode hides iOS version; approximate from macOS version
  const mac = ua.match(/Mac OS X (\d+[_.\d]*)/);
  if (mac && platform === 'ipados') return mac[1].replace(/_/g, '.');
  return '';
}

// ── Display Mode ───────────────────────────────────────────

function detectDisplayMode(
  nav: NavigatorLike,
  doc: DocumentLike,
  matchMedia: MatchMediaFn,
): DisplayMode {
  if (doc.referrer.startsWith('android-app://')) return 'twa';
  if (nav.standalone === true) return 'standalone';

  const modes: DisplayMode[] = [
    'window-controls-overlay',
    'fullscreen',
    'minimal-ui',
    'standalone',
    'browser',
  ];
  for (const mode of modes) {
    if (matchMedia(`(display-mode: ${mode})`).matches) return mode;
  }
  return 'unknown';
}

// ── Install State (sync) ───────────────────────────────────

function detectInstallState(
  displayMode: DisplayMode,
  nav: NavigatorLike,
  doc: DocumentLike,
  location: LocationLike,
  storage: StorageLike | null,
): { installState: InstallState; installConfidence: InstallConfidence } {
  // Layer 1: running as installed app (certain)
  if (nav.standalone === true) {
    return { installState: 'installed-running', installConfidence: 'certain' };
  }
  if (RUNNING_MODES.has(displayMode)) {
    return { installState: 'installed-running', installConfidence: 'certain' };
  }
  if (doc.referrer.startsWith('android-app://')) {
    return { installState: 'installed-running', installConfidence: 'certain' };
  }

  // ?source=pwa is proof ONLY combined with a standalone display mode
  const params = new URLSearchParams(location.search);
  if (params.get('source') === 'pwa' && RUNNING_MODES.has(displayMode)) {
    return { installState: 'installed-running', installConfidence: 'certain' };
  }

  // Layer 2: persisted appinstalled signal
  const seen = safeStorageGet(storage, INSTALLED_SEEN_KEY);
  if (seen === 'true') {
    return { installState: 'installed-not-running', installConfidence: 'likely' };
  }

  // Async checks (getInstalledRelatedApps, prompt timeout) refine later
  return { installState: 'unknown', installConfidence: 'unknown' };
}

// ── Can A2HS ───────────────────────────────────────────────

function computeCanA2HS(input: {
  automated: boolean;
  webview: boolean;
  platform: Platform;
  browser: string;
  engine: Engine;
  installState: InstallState;
}): { canA2HS: boolean; reason: string } {
  if (input.automated)
    return { canA2HS: false, reason: 'automated environment' };
  if (input.webview) return { canA2HS: false, reason: 'in-app webview' };
  if (input.installState === 'installed-running')
    return { canA2HS: false, reason: 'already running as installed app' };

  const isApple = input.platform === 'ios' || input.platform === 'ipados';
  if (isApple && input.browser !== 'safari')
    return { canA2HS: false, reason: 'requires Safari on iOS' };
  if (isApple) return { canA2HS: true, reason: '' };

  if (input.platform === 'desktop' && input.browser === 'safari')
    return { canA2HS: true, reason: '' };
  if (input.engine === 'blink') return { canA2HS: true, reason: '' };
  if (input.engine === 'gecko' && input.platform === 'android')
    return { canA2HS: true, reason: '' };

  return { canA2HS: false, reason: 'browser does not support installation' };
}

// ── Automation / Webview ───────────────────────────────────

function isAutomated(nav: NavigatorLike, doc: DocumentLike): boolean {
  if (nav.webdriver) return true;
  if (doc.prerendering) return true;
  return /HeadlessChrome|Googlebot|bingbot|Lighthouse|Playwright|Puppeteer|YandexBot/.test(
    nav.userAgent,
  );
}

function isWebview(ua: string): boolean {
  if (/; wv\)/.test(ua)) return true;
  if (/FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat/.test(ua))
    return true;
  return false;
}

// ── Storage Helpers ────────────────────────────────────────

function safeStorageGet(
  storage: StorageLike | null,
  key: string,
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* lockdown mode / private browsing / storage blocked */
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// ════════════════════════════════════════════════════════════
// Singleton State & Subscription (browser-only)
// ════════════════════════════════════════════════════════════

type Listener = (env: PwaEnvironment) => void;

let cached: PwaEnvironment | null = null;
const listeners = new Set<Listener>();
let setupDone = false;
let promptCaptured = false;
let teardowns: Array<() => void> = [];

function buildApis(): BrowserApis {
  const nav = navigator;
  let storage: StorageLike | null = null;
  try {
    storage = globalThis.localStorage;
  } catch {
    /* not available */
  }

  const navAny = nav as unknown as Record<string, unknown>;
  const docAny = document as unknown as Record<string, unknown>;

  return {
    navigator: {
      userAgent: nav.userAgent,
      platform: nav.platform,
      maxTouchPoints: nav.maxTouchPoints || 0,
      standalone: navAny.standalone as boolean | undefined,
      webdriver: navAny.webdriver as boolean | undefined,
      userAgentData: navAny.userAgentData as
        | NavigatorLike['userAgentData']
        | undefined,
      getInstalledRelatedApps:
        typeof navAny.getInstalledRelatedApps === 'function'
          ? (navAny.getInstalledRelatedApps as NavigatorLike['getInstalledRelatedApps'])!.bind(nav)
          : undefined,
    },
    screen: { width: screen.width, height: screen.height },
    location: { search: location.search, href: location.href },
    document: {
      referrer: document.referrer,
      prerendering: docAny.prerendering as boolean | undefined,
    },
    matchMedia: (q: string) => window.matchMedia(q),
    storage,
  };
}

const SSR_FALLBACK: PwaEnvironment = {
  platform: 'unknown',
  formFactor: 'desktop',
  browser: 'unknown',
  osVersion: '',
  iosVersion: '',
  engine: 'unknown',
  displayMode: 'unknown',
  installState: 'unknown',
  installConfidence: 'unknown',
  canA2HS: false,
  canPromptNatively: false,
  reason: 'server-side rendering',
};

function refresh(): void {
  const prev = cached;
  const next: PwaEnvironment = {
    ...detectEnvironment(buildApis()),
    canPromptNatively: promptCaptured,
  };
  cached = next;
  if (prev && JSON.stringify(prev) !== JSON.stringify(next)) {
    listeners.forEach((fn) => fn(next));
  }
}

export function getEnvironment(): PwaEnvironment {
  if (typeof window === 'undefined') return SSR_FALLBACK;
  if (!setupDone) setup();
  return cached!;
}

export function subscribe(cb: Listener): () => void {
  if (typeof window !== 'undefined' && !setupDone) setup();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function setup(): void {
  if (setupDone) return;
  setupDone = true;

  cached = {
    ...detectEnvironment(buildApis()),
    canPromptNatively: promptCaptured,
  };

  let rafId: number | null = null;
  const debouncedRefresh = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      refresh();
    });
  };

  // Display-mode change (fires when user installs on desktop/Android)
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', debouncedRefresh);
  teardowns.push(() => mql.removeEventListener('change', debouncedRefresh));

  // Resize + orientation (iPad Split View, rotation)
  window.addEventListener('resize', debouncedRefresh);
  window.addEventListener('orientationchange', debouncedRefresh);
  teardowns.push(() => {
    window.removeEventListener('resize', debouncedRefresh);
    window.removeEventListener('orientationchange', debouncedRefresh);
  });

  // Visibility + bfcache: re-evaluate when app resurfaces
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) refresh();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', onPageShow);
  teardowns.push(() => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pageshow', onPageShow as EventListener);
  });

  // Async: getInstalledRelatedApps (Android Chrome)
  checkRelatedApps();

  // Heuristic: no beforeinstallprompt in 5s on blink → likely installed
  if (cached.engine === 'blink') {
    setTimeout(() => {
      if (!promptCaptured && cached && cached.installState === 'unknown') {
        cached = { ...cached, installConfidence: 'likely' };
        listeners.forEach((fn) => fn(cached!));
      }
    }, PROMPT_TIMEOUT_MS);
  }
}

async function checkRelatedApps(): Promise<void> {
  const apis = buildApis();
  const nav = apis.navigator;
  if (typeof nav.getInstalledRelatedApps !== 'function') return;

  try {
    const apps = await Promise.race([
      nav.getInstalledRelatedApps!(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('timeout')),
          RELATED_APPS_TIMEOUT_MS,
        ),
      ),
    ]);

    if (!cached) return;

    if (apps.length > 0) {
      cached = {
        ...cached,
        installState: 'installed-not-running',
        installConfidence: 'certain',
      };
      listeners.forEach((fn) => fn(cached!));
    } else if (safeStorageGet(apis.storage, INSTALLED_SEEN_KEY) === 'true') {
      // Empty result after flag was set → user may have uninstalled
      removeStorage(INSTALLED_SEEN_KEY);
      cached = {
        ...cached,
        installState: 'not-installed',
        installConfidence: 'certain',
      };
      listeners.forEach((fn) => fn(cached!));
    }
  } catch {
    // Timeout or API rejection — leave state as-is
  }
}

// ── External Notifications (called by pwa-install.ts) ──────

export function notifyPromptCaptured(): void {
  promptCaptured = true;
  if (cached) {
    cached = { ...cached, canPromptNatively: true };
    listeners.forEach((fn) => fn(cached!));
  }
}

export function notifyAppInstalled(): void {
  writeStorage(INSTALLED_SEEN_KEY, 'true');
  if (cached) {
    cached = {
      ...cached,
      installState: 'installed-not-running',
      installConfidence: 'certain',
    };
    listeners.forEach((fn) => fn(cached!));
  }
}

// ── Testing Reset ──────────────────────────────────────────

export function _reset(): void {
  teardowns.forEach((fn) => fn());
  teardowns = [];
  cached = null;
  listeners.clear();
  setupDone = false;
  promptCaptured = false;
}
