/**
 * Copie chiffrée dans le Google Drive du client.
 * Le jeton reste en mémoire. Les fichiers restent dans le compte Google
 * après l'effacement du navigateur.
 * Nécessite VITE_GOOGLE_CLIENT_ID (client OAuth public, pas un secret).
 */

import { RecoveryError } from './recoveryCrypto';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'MbeukCV';
const CURRENT_NAME = 'recovery.current.mbeuk';
const PREVIOUS_NAME = 'recovery.previous.mbeuk';
const KEY_NAME = 'recovery.key';

interface DriveFile {
  id: string;
  name?: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

let accessToken: string | null = null;

export function googleDriveClientId(): string | null {
  const value = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return typeof value === 'string' && value.trim().length > 10 ? value.trim() : null;
}

export function googleDriveConfigured(): boolean {
  return googleDriveClientId() !== null;
}

export function driveAccessToken(): string | null {
  return accessToken;
}

export function clearDriveAccess(): void {
  accessToken = null;
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mbeuk-gis="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google est indisponible.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.mbeukGis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google est indisponible. Le travail local continue.'));
    document.head.appendChild(script);
  });
}

export async function connectGoogleDrive(prompt: '' | 'consent' = 'consent'): Promise<void> {
  const clientId = googleDriveClientId();
  if (!clientId) {
    throw new Error('Google Drive n’est pas encore activé sur cette installation.');
  }
  await loadGis();
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) throw new Error('Google est indisponible. Le travail local continue.');
  await new Promise<void>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response: TokenResponse) => {
        if (response.access_token) {
          accessToken = response.access_token;
          resolve();
          return;
        }
        reject(new Error(response.error === 'access_denied' ? 'Connexion Drive annulée.' : 'Connexion Drive impossible.'));
      },
    });
    client.requestAccessToken({ prompt });
  });
}

async function driveJson(token: string, url: string, init?: RequestInit): Promise<{ id?: string; files?: DriveFile[] }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 401) {
    accessToken = null;
    throw new RecoveryError('format', 'Session Drive expirée. Reconnectez-vous. Les données locales sont intactes.');
  }
  if (!response.ok) throw new Error('Drive n’a pas accepté la copie. Le travail local continue.');
  if (response.status === 204) return {};
  const text = await response.text();
  if (!text) return {};
  return JSON.parse(text) as { id?: string; files?: DriveFile[] };
}

async function findFile(token: string, folderId: string, name: string): Promise<DriveFile | null> {
  const query = encodeURIComponent(`name = '${name}' and '${folderId}' in parents and trashed = false`);
  const listed = await driveJson(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,
  );
  return listed.files?.[0] ?? null;
}

async function findFolder(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const listed = await driveJson(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,
  );
  return listed.files?.[0]?.id ?? null;
}

async function ensureFolder(token: string): Promise<string> {
  const existing = await findFolder(token);
  if (existing) return existing;
  const created = await driveJson(token, 'https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!created.id) throw new Error('Dossier Drive non créé.');
  return created.id;
}

async function createFile(token: string, folderId: string, name: string, content: string): Promise<void> {
  const boundary = 'mbeukcv_recovery';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name, parents: [folderId] }),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (response.status === 401) {
    accessToken = null;
    throw new RecoveryError('format', 'Session Drive expirée. Reconnectez-vous. Les données locales sont intactes.');
  }
  if (!response.ok) throw new Error('Envoi Drive impossible. Le travail local continue.');
}

async function replaceFile(token: string, fileId: string, content: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: content,
    },
  );
  if (response.status === 401) {
    accessToken = null;
    throw new RecoveryError('format', 'Session Drive expirée. Reconnectez-vous. Les données locales sont intactes.');
  }
  if (!response.ok) throw new Error('Mise à jour Drive impossible. Le travail local continue.');
}

async function copyAsPrevious(token: string, folderId: string, currentId: string): Promise<void> {
  const previous = await findFile(token, folderId, PREVIOUS_NAME);
  if (previous) {
    await driveJson(token, `https://www.googleapis.com/drive/v3/files/${previous.id}`, { method: 'DELETE' });
  }
  await driveJson(token, `https://www.googleapis.com/drive/v3/files/${currentId}/copy?fields=id`, {
    method: 'POST',
    body: JSON.stringify({ name: PREVIOUS_NAME, parents: [folderId] }),
  });
}

export async function uploadRecoveryToDrive(serialized: string, secret?: string): Promise<void> {
  const token = accessToken;
  if (!token) throw new Error('Drive n’est pas connecté.');
  const folderId = await ensureFolder(token);
  if (secret) {
    const keyFile = await findFile(token, folderId, KEY_NAME);
    if (keyFile) await replaceFile(token, keyFile.id, secret);
    else await createFile(token, folderId, KEY_NAME, secret);
  }
  const current = await findFile(token, folderId, CURRENT_NAME);
  if (current) {
    await copyAsPrevious(token, folderId, current.id);
    await replaceFile(token, current.id, serialized);
    return;
  }
  await createFile(token, folderId, CURRENT_NAME, serialized);
}

async function downloadFile(token: string, fileId: string): Promise<string> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    accessToken = null;
    throw new RecoveryError('format', 'Session Drive expirée. Reconnectez-vous. Les données locales sont intactes.');
  }
  if (!response.ok) throw new Error('Copie Drive illisible. Les données locales sont intactes.');
  return response.text();
}

export async function downloadDriveRecoveryCopies(): Promise<string[]> {
  const token = accessToken;
  if (!token) throw new Error('Drive n’est pas connecté.');
  const folderId = await ensureFolder(token);
  const copies: string[] = [];
  for (const name of [CURRENT_NAME, PREVIOUS_NAME]) {
    const file = await findFile(token, folderId, name);
    if (!file) continue;
    copies.push(await downloadFile(token, file.id));
  }
  if (copies.length === 0) throw new Error('Aucune copie dans le dossier MbeukCV de Drive.');
  return copies;
}

export async function downloadDriveRecoveryBundle(createFolder = true): Promise<{ secret: string; copies: string[] }> {
  const token = accessToken;
  if (!token) throw new Error('Drive n’est pas connecté.');
  const folderId = createFolder ? await ensureFolder(token) : await findFolder(token);
  if (!folderId) throw new Error('Aucune copie dans le dossier MbeukCV de Drive.');
  const key = await findFile(token, folderId, KEY_NAME);
  if (!key) throw new Error('Aucune copie dans le dossier MbeukCV de Drive.');
  const secret = (await downloadFile(token, key.id)).trim();
  const copies = await downloadDriveRecoveryCopies();
  return { secret, copies };
}
