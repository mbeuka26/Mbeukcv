import { documentsZodSchema } from '../contracts/documents.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const valid = {
  cv_fr_html: 'a'.repeat(50),
  cv_en_html: 'b'.repeat(50),
  lettre_fr_html: 'c'.repeat(50),
  lettre_en_html: 'd'.repeat(50),
};

assert(documentsZodSchema.safeParse(valid).success, 'dossier complet accepté');
assert(!documentsZodSchema.safeParse({ ...valid, cv_fr_html: 'court' }).success, 'html trop court refusé');
const missing = { ...valid } as Partial<typeof valid>;
delete missing.lettre_en_html;
assert(!documentsZodSchema.safeParse(missing).success, 'champ manquant refusé');

console.log('schéma documents : ok');
