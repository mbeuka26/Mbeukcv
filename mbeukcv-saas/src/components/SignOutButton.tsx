'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/browser';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function signOut() {
    await createSupabaseBrowser().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" data-mbeuk-logout onClick={() => void signOut()} className={className ?? 'text-sm underline-offset-2 hover:underline'}>
      Fermer la session
    </button>
  );
}
