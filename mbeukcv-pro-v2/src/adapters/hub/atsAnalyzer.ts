import type { AtsAnalyzer } from '@/ports';

export const hubAtsAnalyzer: AtsAnalyzer = {
  async analyze() {
    throw new Error('L’analyse ATS s’exécute sur cet appareil avec votre clé Claude. Le hub ne propose pas cette fonction.');
  },
};
