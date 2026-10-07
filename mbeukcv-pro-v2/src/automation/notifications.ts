/**
 * Notifications navigateur (Notification API standard) — jamais
 * d'exception levée : sur un navigateur/contexte qui ne les supporte
 * pas (Safari iOS en PWA non installée, permissions refusées, etc.),
 * les fonctions échouent silencieusement plutôt que de casser
 * l'automatisation elle-même.
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
}

export function showNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icon-192.png' });
  } catch {
    // Best-effort — un échec d'affichage ne doit jamais interrompre l'app.
  }
}
