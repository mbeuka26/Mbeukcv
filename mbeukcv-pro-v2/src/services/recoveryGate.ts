/** Empêche la copie automatique de se réécrire pendant une restauration. */

let depth = 0;

export function suspendRecovery(): void {
  depth += 1;
}

export function resumeRecovery(): void {
  depth = Math.max(0, depth - 1);
}

export function recoverySuspended(): boolean {
  return depth > 0;
}
