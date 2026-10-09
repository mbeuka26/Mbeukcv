import 'server-only';
import type { ClassicDisplayLocale } from '@/lib/classic/locales';
import { translateClassicCvLocal } from '@/lib/classic/translateClassicLocal';
import { translateClassicCv } from '@/lib/classic/translateClassic';
import type { ClassicCvData } from '@/lib/classic/types';
import { takeClaudeCredit } from '@/lib/credits';

export type ClassicTranslateEngine = 'local' | 'claude';

export interface ClassicTranslateResult {
  translated: Partial<ClassicCvData>;
  engine: ClassicTranslateEngine;
}

function claudeFallbackEnabled(): boolean {
  const raw = process.env.CLASSIC_TRANSLATE_CLAUDE_FALLBACK?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return true;
}

/**
 * Priorité au moteur local (sans crédit). Repli Claude uniquement si le local échoue
 * et si CLASSIC_TRANSLATE_CLAUDE_FALLBACK n’est pas désactivé.
 */
export async function translateClassicCvPreferred(
  cv: ClassicCvData,
  competences: string[],
  target: ClassicDisplayLocale,
  userId: string,
): Promise<ClassicTranslateResult> {
  if (target === 'fr') {
    return { translated: {}, engine: 'local' };
  }

  try {
    const translated = await translateClassicCvLocal(cv, competences, target);
    return { translated, engine: 'local' };
  } catch (localErr) {
    if (!claudeFallbackEnabled()) {
      const message = localErr instanceof Error ? localErr.message : 'Traduction locale impossible.';
      throw new Error(message);
    }

    const charged = await takeClaudeCredit(userId);
    if ('error' in charged) {
      throw new Error(charged.error);
    }

    try {
      const translated = await translateClassicCv(cv, competences, target, charged.key);
      return { translated, engine: 'claude' };
    } catch (err) {
      await charged.refund().catch(() => undefined);
      throw err;
    }
  }
}
