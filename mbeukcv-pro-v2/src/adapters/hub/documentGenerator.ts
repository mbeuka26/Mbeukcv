import { generateDocumentsViaBackend } from '@/services/backendApi';
import type { DocumentGenerator } from '@/ports';

export const hubDocumentGenerator: DocumentGenerator = {
  async generate(payload) {
    return generateDocumentsViaBackend(payload);
  },
};
