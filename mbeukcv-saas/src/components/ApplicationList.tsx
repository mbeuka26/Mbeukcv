'use client';

import { useMemo, useState } from 'react';

export interface ApplicationItem {
  id: string;
  when: string;
  status: string;
  title: string;
  url: string | null;
  company?: string | null;
  source?: string | null;
  channel?: string | null;
  invitationId?: string | null;
}

export function ApplicationList({ items }: { items: ApplicationItem[] }) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.title} ${item.status} ${item.when}`.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <div className="mt-6">
      <label className="label">
        Rechercher une candidature
        <input className="field mt-1 max-w-md" value={query} placeholder="Titre ou statut" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <p className="mb-2 mt-3 text-sm text-muted">{visible.length} dossier{visible.length > 1 ? 's' : ''}</p>
      {visible.length === 0 ? (
        <div className="sheet p-6">
          <h2 className="font-serif text-xl">Aucun dossier pour cette recherche</h2>
        </div>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface">
          {visible.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted">
                {item.when} · {item.status}
                {item.company ? ` · ${item.company}` : ''}
                {item.source ? ` · ${item.source}` : item.channel === 'mbeuk_exchange' ? ' · Mbeuk Job Exchange' : ''}
                {item.invitationId ? ' · via invitation' : ''}
              </p>
              {item.url && (
                <a className="text-sm text-accent underline-offset-2 hover:underline" href={item.url} target="_blank" rel="noreferrer">
                  Offre d’origine
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
