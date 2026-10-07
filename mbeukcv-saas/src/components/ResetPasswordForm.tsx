'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/browser';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setPending(false);
      setError('Le lien n’est plus valable. Demandez un nouveau lien depuis la page Compte.');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/accueil');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="label">
        Nouveau mot de passe
        <input className="field mt-1" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button className="btn" type="submit" disabled={pending}>{pending ? 'Veuillez patienter' : 'Enregistrer le mot de passe'}</button>
      {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
    </form>
  );
}
