import { getCustomClaudeKey } from '@/services/byok';
import { analyzeAts } from '@/ats/analyzeAts';
import type { AtsAnalyzer } from '@/ports';

export const localAtsAnalyzer: AtsAnalyzer = {
  async analyze(cvTexte, offreTexte) {
    const key = getCustomClaudeKey();
    if (!key) {
      throw new Error('Ajoutez votre clé API Claude dans le mode IA avant d’analyser.');
    }
    return analyzeAts(cvTexte, offreTexte, key);
  },
};
