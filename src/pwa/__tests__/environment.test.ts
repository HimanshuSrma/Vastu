/**
 * Unit tests for src/pwa/environment.ts
 *
 * Requires vitest: pnpm add -D vitest
 * Run: pnpm vitest run src/pwa/__tests__/environment.test.ts
 *
 * Known limitations:
 * - iOS cannot detect an existing Home Screen shortcut from the browser.
 * - getInstalledRelatedApps (async) is not testable through the pure
 *   detectEnvironment function; it runs in the subscription layer.
 */

import { describe, it, expect } from 'vitest';
import { detectEnvironment } from '../environment';
import type { BrowserApis, PwaEnvironment } from '../types';

// ── Test Helpers ───────────────────────────────────────────

interface FixtureOverrides {
  navigator?: Partial<BrowserApis['navigator']>;
  screen?: Partial<BrowserApis['screen']>;
  location?: Partial<BrowserApis['location']>;
  document?: Partial<BrowserApis['document']>;
  storage?: BrowserApis['storage'];
  matchMediaResults?: Record<string, boolean>;
}

function createApis(overrides: FixtureOverrides = {}): BrowserApis {
  const mmResults = overrides.matchMediaResults ?? {};
  return {
    navigator: {
      userAgent: '',
      platform: '',
      maxTouchPoints: 0,
      ...(overrides.navigator ?? {}),
    },
    screen: { width: 1920, height: 1080, ...(overrides.screen ?? {}) },
    location: { search: '', href: '', ...(overrides.location ?? {}) },
    document: { referrer: '', ...(overrides.document ?? {}) },
    matchMedia: (q: string) => ({ matches: mmResults[q] ?? false }),
    storage: overrides.storage ?? null,
  };
}

// ── User Agent Strings ─────────────────────────────────────

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadDesktopSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.108 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.108 Safari/537.36',
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 342.0.0.0.0',
  googlebot:
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  androidWebview:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.108 Mobile Safari/537.36',
  firefoxAndroid:
    'Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0',
  desktopSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
};

// ── Fixture Table ──────────────────────────────────────────

const fixtures: Array<{
  name: string;
  apis: BrowserApis;
  expected: Partial<PwaEnvironment>;
}> = [
  {
    name: 'iPhone Safari browser',
    apis: createApis({
      navigator: {
        userAgent: UA.iphoneSafari,
        platform: 'iPhone',
        maxTouchPoints: 5,
      },
      screen: { width: 390, height: 844 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    }),
    expected: {
      platform: 'ios',
      formFactor: 'phone',
      browser: 'safari',
      engine: 'webkit',
      displayMode: 'browser',
      installState: 'unknown',
      canA2HS: true,
    },
  },
  {
    name: 'iPhone standalone',
    apis: createApis({
      navigator: {
        userAgent: UA.iphoneSafari,
        platform: 'iPhone',
        maxTouchPoints: 5,
        standalone: true,
      },
      screen: { width: 390, height: 844 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
      },
    }),
    expected: {
      platform: 'ios',
      formFactor: 'phone',
      displayMode: 'standalone',
      installState: 'installed-running',
      installConfidence: 'certain',
      canA2HS: false,
    },
  },
  {
    name: 'iPad desktop-mode Safari',
    apis: createApis({
      navigator: {
        userAgent: UA.ipadDesktopSafari,
        platform: 'MacIntel',
        maxTouchPoints: 5,
      },
      screen: { width: 1024, height: 1366 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    }),
    expected: {
      platform: 'ipados',
      formFactor: 'tablet',
      browser: 'safari',
      engine: 'webkit',
      displayMode: 'browser',
      canA2HS: true,
    },
  },
  {
    name: 'iPad standalone',
    apis: createApis({
      navigator: {
        userAgent: UA.ipadDesktopSafari,
        platform: 'MacIntel',
        maxTouchPoints: 5,
        standalone: true,
      },
      screen: { width: 1024, height: 1366 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
      },
    }),
    expected: {
      platform: 'ipados',
      displayMode: 'standalone',
      installState: 'installed-running',
      installConfidence: 'certain',
      canA2HS: false,
    },
  },
  {
    name: 'Chrome iOS',
    apis: createApis({
      navigator: {
        userAgent: UA.chromeIos,
        platform: 'iPhone',
        maxTouchPoints: 5,
      },
      screen: { width: 390, height: 844 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    }),
    expected: {
      platform: 'ios',
      browser: 'chrome-ios',
      engine: 'webkit',
      canA2HS: false,
      reason: 'requires Safari on iOS',
    },
  },
  {
    name: 'Android Chrome browser',
    apis: createApis({
      navigator: {
        userAgent: UA.androidChrome,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    }),
    expected: {
      platform: 'android',
      formFactor: 'phone',
      browser: 'chrome',
      engine: 'blink',
      displayMode: 'browser',
      canA2HS: true,
    },
  },
  {
    name: 'Android WebAPK launch (standalone)',
    apis: createApis({
      navigator: {
        userAgent: UA.androidChrome,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: standalone)': true,
      },
    }),
    expected: {
      platform: 'android',
      displayMode: 'standalone',
      installState: 'installed-running',
      installConfidence: 'certain',
      canA2HS: false,
    },
  },
  {
    name: 'TWA referrer',
    apis: createApis({
      navigator: {
        userAgent: UA.androidChrome,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      document: { referrer: 'android-app://com.example.twa' },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
      },
    }),
    expected: {
      displayMode: 'twa',
      installState: 'installed-running',
      installConfidence: 'certain',
    },
  },
  {
    name: 'Desktop Chrome installed window',
    apis: createApis({
      navigator: {
        userAgent: UA.desktopChrome,
        platform: 'Win32',
        maxTouchPoints: 0,
      },
      matchMediaResults: {
        '(display-mode: standalone)': true,
      },
    }),
    expected: {
      platform: 'desktop',
      formFactor: 'desktop',
      displayMode: 'standalone',
      installState: 'installed-running',
      installConfidence: 'certain',
      canA2HS: false,
    },
  },
  {
    name: 'Instagram iOS webview',
    apis: createApis({
      navigator: {
        userAgent: UA.instagramIos,
        platform: 'iPhone',
        maxTouchPoints: 5,
      },
      screen: { width: 390, height: 844 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    }),
    expected: {
      platform: 'ios',
      canA2HS: false,
      reason: 'in-app webview',
    },
  },
  {
    name: 'Googlebot',
    apis: createApis({
      navigator: {
        userAgent: UA.googlebot,
        platform: '',
        maxTouchPoints: 0,
      },
    }),
    expected: {
      canA2HS: false,
      reason: 'automated environment',
    },
  },
  {
    name: 'Android webview (wv token)',
    apis: createApis({
      navigator: {
        userAgent: UA.androidWebview,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    }),
    expected: {
      platform: 'android',
      canA2HS: false,
      reason: 'in-app webview',
    },
  },
];

describe('detectEnvironment — fixture table', () => {
  fixtures.forEach(({ name, apis, expected }) => {
    it(name, () => {
      const result = detectEnvironment(apis);
      for (const [key, value] of Object.entries(expected)) {
        expect(result[key as keyof PwaEnvironment], `${key}`).toBe(value);
      }
    });
  });
});

// ── Targeted Tests ─────────────────────────────────────────

describe('install state', () => {
  it('detects installed-not-running from localStorage flag', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.androidChrome,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
      storage: {
        getItem: (key: string) =>
          key === 'vastu-pwa-installed-seen' ? 'true' : null,
      },
    });
    const result = detectEnvironment(apis);
    expect(result.installState).toBe('installed-not-running');
    expect(result.installConfidence).toBe('likely');
  });

  it('?source=pwa alone without standalone mode is not proof', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.androidChrome,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      location: { search: '?source=pwa', href: '' },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    });
    const result = detectEnvironment(apis);
    expect(result.installState).toBe('unknown');
  });
});

describe('version parsing', () => {
  it('parses iOS version', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.iphoneSafari,
        platform: 'iPhone',
        maxTouchPoints: 5,
      },
      screen: { width: 390, height: 844 },
      matchMediaResults: { '(pointer: coarse)': true, '(hover: none)': true },
    });
    const result = detectEnvironment(apis);
    expect(result.iosVersion).toBe('17.5');
    expect(result.osVersion).toBe('17.5');
  });

  it('parses Android version', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.androidChrome,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      matchMediaResults: { '(pointer: coarse)': true, '(hover: none)': true },
    });
    const result = detectEnvironment(apis);
    expect(result.osVersion).toBe('14');
    expect(result.iosVersion).toBe('');
  });

  it('approximates iPadOS version from macOS version', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.ipadDesktopSafari,
        platform: 'MacIntel',
        maxTouchPoints: 5,
      },
      screen: { width: 1024, height: 1366 },
      matchMediaResults: { '(pointer: coarse)': true, '(hover: none)': true },
    });
    const result = detectEnvironment(apis);
    expect(result.platform).toBe('ipados');
    expect(result.iosVersion).toBe('10.15.7');
  });
});

describe('automation detection', () => {
  it('navigator.webdriver', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.desktopChrome,
        platform: 'Win32',
        maxTouchPoints: 0,
        webdriver: true,
      },
    });
    const result = detectEnvironment(apis);
    expect(result.canA2HS).toBe(false);
    expect(result.reason).toBe('automated environment');
  });

  it('document.prerendering', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.desktopChrome,
        platform: 'Win32',
        maxTouchPoints: 0,
      },
      document: { referrer: '', prerendering: true },
    });
    const result = detectEnvironment(apis);
    expect(result.canA2HS).toBe(false);
    expect(result.reason).toBe('automated environment');
  });

  it('Lighthouse UA', () => {
    const apis = createApis({
      navigator: {
        userAgent:
          'Mozilla/5.0 Chrome/126.0 Mobile Safari/537.36 Chrome-Lighthouse',
        platform: 'Linux',
        maxTouchPoints: 0,
      },
    });
    const result = detectEnvironment(apis);
    expect(result.canA2HS).toBe(false);
    expect(result.reason).toBe('automated environment');
  });
});

describe('engine detection', () => {
  it('Firefox Android → gecko', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.firefoxAndroid,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      },
      screen: { width: 412, height: 915 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    });
    const result = detectEnvironment(apis);
    expect(result.engine).toBe('gecko');
    expect(result.canA2HS).toBe(true);
  });

  it('Desktop Safari → webkit + canA2HS', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.desktopSafari,
        platform: 'MacIntel',
        maxTouchPoints: 0,
      },
      matchMediaResults: { '(display-mode: browser)': true },
    });
    const result = detectEnvironment(apis);
    expect(result.platform).toBe('desktop');
    expect(result.engine).toBe('webkit');
    expect(result.browser).toBe('safari');
    expect(result.canA2HS).toBe(true);
  });
});

describe('known limitations', () => {
  it('iOS cannot detect existing Home Screen shortcut from browser', () => {
    const apis = createApis({
      navigator: {
        userAgent: UA.iphoneSafari,
        platform: 'iPhone',
        maxTouchPoints: 5,
      },
      screen: { width: 390, height: 844 },
      matchMediaResults: {
        '(pointer: coarse)': true,
        '(hover: none)': true,
        '(display-mode: browser)': true,
      },
    });
    const result = detectEnvironment(apis);
    expect(result.installState).toBe('unknown');
    expect(result.installConfidence).toBe('unknown');
  });
});
