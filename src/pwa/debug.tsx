'use client';

import { useState, useSyncExternalStore } from 'react';
import { getEnvironment, subscribe } from './environment';

export function PwaDebugPanel() {
  // Enabled only in dev when the page is opened with ?a2hs=debug. Computed
  // once during render; the server snapshot is null so SSR and the first
  // client render agree before the external store takes over.
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (process.env.NODE_ENV === 'production') return false;
    return new URLSearchParams(window.location.search).get('a2hs') === 'debug';
  });
  const env = useSyncExternalStore(subscribe, getEnvironment, () => null);

  if (!enabled || !env) return null;

  return (
    <pre
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        color: '#4ade80',
        padding: 12,
        borderRadius: 8,
        fontSize: 11,
        lineHeight: 1.4,
        maxHeight: '50vh',
        maxWidth: '90vw',
        overflow: 'auto',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      {JSON.stringify(env, null, 2)}
    </pre>
  );
}
