'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/browser';

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'auth' | 'license' | 'promo'>('auth');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [promo, setPromo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function hubClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    return import('@/mbeuk-gate/hub-gate-client.js').then(({ HubGateClient }) => (
      new HubGateClient({ functionsUrl: `${url}/functions/v1`, anonKey: anon })
    ));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setPending(true);
    setError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setPending(false);
      setError('Email invalide. Saisissez correctement votre email puis reconnectez-vous.');
      return;
    }
    try {
      if (mode === 'signup') {
        if (fullName.trim().length < 2) {
          setPending(false);
          setError('Indiquez votre nom.');
          return;
        }
        if (password.length < 8) {
          setPending(false);
          setError('Le mot de passe doit contenir au moins 8 caractères.');
          return;
        }
        if (phone.replace(/\D/g, '').length < 8) {
          setPending(false);
          setError('Indiquez un numéro de téléphone.');
          return;
        }
      }
      const { getDeviceIdentity } = await import('@/mbeuk-gate/device-fingerprint.js');
      const client = await hubClient();
      const device = await getDeviceIdentity();
      const payload = mode === 'login'
        ? await client.login({ email: trimmed, password }, device)
        : await client.register({
            email: trimmed,
            password,
            full_name: fullName.trim(),
            phone: phone.trim(),
          }, device);
      if (payload.license_valid !== true || !payload.supabase_session?.access_token) {
        setPending(false);
        setStep('license');
        setInfo(mode === 'signup'
          ? 'Compte créé. Il reste en attente tant que la licence n’est pas confirmée par le paiement.'
          : 'Ce compte n’a pas encore de licence active. Achetez la licence, puis rouvrez une session.');
        return;
      }
      const bridge = payload.supabase_session;
      const { error: sessionError } = await createSupabaseBrowser().auth.setSession({
        access_token: bridge.access_token,
        refresh_token: bridge.refresh_token,
      });
      if (sessionError) {
        setError(sessionError.message);
        setPending(false);
        return;
      }
      setPending(false);
      router.push('/accueil');
      router.refresh();
    } catch (error) {
      const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;
      if (status === 404 && mode === 'login') {
        const supabase = createSupabaseBrowser();
        const result = await supabase.auth.signInWithPassword({ email: trimmed, password });
        setPending(false);
        if (result.error) {
          setError(result.error.message);
          return;
        }
        router.push('/accueil');
        router.refresh();
        return;
      }
      if (status === 404) {
        setPending(false);
        setError('La création de compte passe par le Hub. Les fonctions d’authentification ne sont pas encore déployées.');
        return;
      }
      const { authFeedback } = await import('@/mbeuk-gate/mbeuk-hub-gate.js');
      setPending(false);
      setError(authFeedback(error));
    }
  }

  async function continueToCheckout() {
    setPending(true);
    setError(null);
    try {
      const client = await hubClient();
      const code = promo.trim();
      if (code) {
        const result = await client.validatePromo(code);
        if (!result.valid) {
          setPending(false);
          setError(result.message || 'Code promo invalide. Vérifiez le code et réessayez.');
          return;
        }
      }
      const checkout = await client.checkout({ promoCode: code || undefined });
      if (!checkout.checkout_url) {
        setPending(false);
        setError('Le paiement n’a pas renvoyé d’adresse.');
        return;
      }
      window.location.assign(checkout.checkout_url);
    } catch (error) {
      const { authFeedback } = await import('@/mbeuk-gate/mbeuk-hub-gate.js');
      setPending(false);
      setError(authFeedback(error));
    }
  }

  if (!configured) {
    return (
      <p className="text-sm text-muted">
        La base centrale n’est pas configurée. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </p>
    );
  }

  if (step === 'license' || step === 'promo') {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-2xl">Licence</h2>
        <p className="text-sm text-muted">
          {info || 'Le compte Hub existe. L’espace s’ouvre quand Chariow confirme le paiement et que la licence est active.'}
        </p>
        {step === 'promo' && (
          <label className="label">
            Code promo
            <input className="field mt-1" name="promo_code" autoComplete="off" value={promo} onChange={(event) => setPromo(event.target.value)} />
            <span className="mt-1 block text-sm text-muted">Saisissez un code si vous en avez un. Sinon, continuez vers le paiement.</span>
          </label>
        )}
        {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
        {step === 'license' ? (
          <button type="button" className="btn" onClick={() => { setError(null); setStep('promo'); }}>
            Acheter une licence
          </button>
        ) : (
          <button type="button" className="btn" disabled={pending} onClick={() => void continueToCheckout()}>
            {pending ? 'Veuillez patienter' : 'Continuer vers le paiement'}
          </button>
        )}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => { setStep('auth'); setMode('login'); setError(null); }}
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button type="button" className={mode === 'login' ? 'btn' : 'btn-ghost'} onClick={() => { setMode('login'); setStep('auth'); }}>
          Ouvrir une session
        </button>
        <button type="button" className={mode === 'signup' ? 'btn' : 'btn-ghost'} onClick={() => { setMode('signup'); setStep('auth'); }}>
          Créer un compte
        </button>
      </div>
      {mode === 'signup' && (
        <>
          <label className="label">
            Nom
            <input className="field mt-1" name="full_name" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="label">
            Téléphone
            <input className="field mt-1" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
        </>
      )}
      <label className="label">
        E-mail
        <input className="field mt-1" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="label">
        Mot de passe
        <input className="field mt-1" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : 6} value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button
        type="button"
        className="text-sm font-semibold text-accent underline-offset-2 hover:underline"
        onClick={() => void (async () => {
          if (!email.trim()) {
            setError('Indiquez l’e-mail du compte, puis redemandez le lien.');
            return;
          }
          setPending(true);
          setError(null);
          setInfo(null);
          const trimmed = email.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setPending(false);
            setError('Email invalide. Saisissez correctement votre email puis reconnectez-vous.');
            return;
          }
          try {
            const { HubGateClient } = await import('@/mbeuk-gate/hub-gate-client.js');
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
            const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
            const client = new HubGateClient({ functionsUrl: `${url}/functions/v1`, anonKey: anon });
            await client.forgotPassword(trimmed);
            setPending(false);
            setInfo('Si un compte existe, un email de réinitialisation a été envoyé.');
          } catch (error) {
            const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;
            if (status !== 404) {
              const { authFeedback } = await import('@/mbeuk-gate/mbeuk-hub-gate.js');
              setPending(false);
              setError(authFeedback(error));
              return;
            }
            const supabase = createSupabaseBrowser();
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
              redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser`,
            });
            setPending(false);
            if (resetError) {
              setError(resetError.message);
              return;
            }
            setInfo('Si ce compte existe, un lien de réinitialisation vient d’être envoyé.');
          }
        })()}
      >
        Mot de passe oublié
      </button>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Veuillez patienter' : mode === 'login' ? 'Entrer' : 'Créer le compte'}
      </button>
      {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
      {info && <p className="text-sm text-muted">{info}</p>}
    </form>
  );
}
