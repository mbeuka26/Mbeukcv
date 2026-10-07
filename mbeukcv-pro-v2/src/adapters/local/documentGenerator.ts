import { getCustomClaudeKey } from '@/services/byok';
import { generateDocuments } from '@/services/generateDocs';
import type { DocumentGenerator } from '@/ports';

export const localDocumentGenerator: DocumentGenerator = {
  async generate(payload) {
    const key = getCustomClaudeKey();
    if (!key) {
      throw new Error('Ajoutez votre clé API Claude avant de générer.');
    }
    return generateDocuments({ ...payload, customClaudeKey: key });
  },
};
