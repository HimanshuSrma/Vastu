export type Platform = 'ios' | 'ipados' | 'android' | 'desktop' | 'unknown';
export type FormFactor = 'phone' | 'tablet' | 'desktop';
export type Engine = 'webkit' | 'blink' | 'gecko' | 'unknown';

export type DisplayMode =
  | 'browser'
  | 'standalone'
  | 'minimal-ui'
  | 'fullscreen'
  | 'window-controls-overlay'
  | 'twa'
  | 'unknown';

export type InstallState =
  | 'installed-running'
  | 'installed-not-running'
  | 'not-installed'
  | 'unknown';

export type InstallConfidence = 'certain' | 'likely' | 'unknown';

export interface PwaEnvironment {
  platform: Platform;
  formFactor: FormFactor;
  browser: string;
  osVersion: string;
  iosVersion: string;
  engine: Engine;
  displayMode: DisplayMode;
  installState: InstallState;
  installConfidence: InstallConfidence;
  canA2HS: boolean;
  canPromptNatively: boolean;
  reason: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
}

export interface NavigatorLike {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone?: boolean;
  webdriver?: boolean;
  userAgentData?: {
    platform: string;
    mobile: boolean;
    brands: Array<{ brand: string; version: string }>;
  };
  getInstalledRelatedApps?: () => Promise<
    Array<{ platform: string; url: string }>
  >;
}

export interface ScreenLike {
  width: number;
  height: number;
}

export interface LocationLike {
  search: string;
  href: string;
}

export interface DocumentLike {
  referrer: string;
  prerendering?: boolean;
}

export type MatchMediaFn = (query: string) => { matches: boolean };

export interface BrowserApis {
  navigator: NavigatorLike;
  screen: ScreenLike;
  location: LocationLike;
  document: DocumentLike;
  matchMedia: MatchMediaFn;
  storage: StorageLike | null;
}
