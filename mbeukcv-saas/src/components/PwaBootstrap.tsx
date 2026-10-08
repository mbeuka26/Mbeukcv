'use client';

import { useEffect } from 'react';

/** Enregistre manifest + service worker sur toutes les pages (y compris login). */
export function PwaBootstrap() {
  useEffect(() => {
    void import('@/mbeuk-gate/pwa.js').then((mod) => mod.ensureMbeukPwa());
  }, []);
  return null;
}
