'use client';

import { useEffect } from 'react';
import '@/mbeuk-gate/mbeuk-hub-gate.css';
import { hubFunctionsUrl } from '@/lib/hubFunctionsUrl';

const PUBLIC_ROUTES = ['/login', '/reinitialiser'];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function clearHubOverlays() {
  document.querySelectorAll('.mbeuk-gate').forEach((node) => node.remove());
}

export function HubGateBoot() {
  useEffect(() => {
    const pathname = window.location.pathname;
    if (isPublicRoute(pathname)) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    let alive = true;

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      clearHubOverlays();
    };
    window.addEventListener('pageshow', onPageShow);

    const start = () => {
      if (!alive) return;
      if (!document.querySelector('#mbeuk-app')) return;

      void (async () => {
        const { bootMbeukHubGate } = await import('@/mbeuk-gate/boot.js');
        const gate = await bootMbeukHubGate({
          productName: 'MbeukCV',
          productDescription: 'CV, correspondance avec les offres et candidatures.',
          sector: 'generic',
          authMode: 'existing',
          allowTrial: false,
          protectedRoot: '#mbeuk-app',
          headerTarget: '#hub-user-status',
          functionsUrl: hubFunctionsUrl(),
          anonKey: anon,
          skipLiveHub: true,
          silentHealth: true,
        });
        if (!alive) return;

        const releaseWhenAppUsable = () => {
          const status = String(gate.status);
          if (status !== 'anonymous' && status !== 'error') return;
          clearHubOverlays();
          const root = document.querySelector('#mbeuk-app');
          if (!(root instanceof HTMLElement)) return;
          root.hidden = false;
          root.inert = false;
          root.setAttribute('aria-hidden', 'false');
        };

        releaseWhenAppUsable();
        gate.addEventListener('statechange', releaseWhenAppUsable);
      })();
    };

    start();
    const retryTimer = window.setTimeout(start, 50);

    return () => {
      alive = false;
      window.clearTimeout(retryTimer);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return null;
}
