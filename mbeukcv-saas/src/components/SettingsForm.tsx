'use client';

import { FormEvent, useState } from 'react';

export interface KeyStatus {
  claudeKey: boolean;
}

export function SettingsForm({ initial }: { initial: KeyStatus }) {
  const [status, setStatus] = useState(initial);
  const [claude, setClaude] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claude.trim() ? { claudeKey: claude.trim() } : {}),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Enregistrement impossible.');
      return;
    }
    setStatus(body as KeyStatus);
    setClaude('');
    setMessage('Réglages enregistrés. La clé n’est pas réaffichée.');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="sheet space-y-3 p-4">
        <legend className="font-serif text-xl">Clé Claude</legend>
        <p className="text-sm text-muted">
          La clé est chiffrée sur le compte. Un champ vide ne remplace pas une clé déjà enregistrée. La collecte des offres utilise la clé de la plateforme, pas une clé par client.
        </p>
        <p className="text-sm">Claude : {status.claudeKey ? 'configurée' : 'non configurée'}.</p>
        <label className="label">
          Clé API Claude
          <input className="field mt-1" type="password" value={claude} onChange={(event) => setClaude(event.target.value)} placeholder="sk-ant-..." autoComplete="off" />
        </label>
        <a className="inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Créer une clé Claude</a>
      </fieldset>
      <button className="btn" type="submit" disabled={pending}>{pending ? 'Enregistrement' : 'Enregistrer'}</button>
      {message && <p className="text-sm text-[#2f6b45]">{message}</p>}
      {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
    </form>
  );
}
