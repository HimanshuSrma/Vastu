'use client';

import { useEffect, useState } from 'react';
import { getEnvironment, subscribe } from './environment';
import type { PwaEnvironment } from './types';

export function PwaDebugPanel() {
  const [env, setEnv] = useState<PwaEnvironment | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('a2hs') !== 'debug') return;

    setVisible(true);
    setEnv(getEnvironment());
    return subscribe(setEnv);
  }, []);

  if (!visible || !env) return null;

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
