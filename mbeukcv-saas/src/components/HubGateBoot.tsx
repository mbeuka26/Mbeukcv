'use client';

import { useEffect } from 'react';
import '@/mbeuk-gate/mbeuk-hub-gate.css';
import { hubFunctionsUrl } from '@/lib/hubFunctionsUrl';

export function HubGateBoot() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    let alive = true;

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
      });
      if (!alive) return;
      const releaseWithoutHubSession = () => {
        const status = String(gate.status);
        if (status !== 'anonymous' && status !== 'error') return;
        const root = document.querySelector('#mbeuk-app');
        if (!(root instanceof HTMLElement)) return;
        root.hidden = false;
        root.inert = false;
        root.setAttribute('aria-hidden', 'false');
      };
      releaseWithoutHubSession();
      gate.addEventListener('statechange', releaseWithoutHubSession);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return null;
}
