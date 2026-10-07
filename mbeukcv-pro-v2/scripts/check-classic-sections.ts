import { createEmptyClassicCv, type CvTemplateId } from '../src/modes/classique/types.ts';
import { renderClassicCvHtml } from '../src/modes/classique/templates/renderClassicCv.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const templates: CvTemplateId[] = ['sobre', 'moderne', 'colore'];
const cv = createEmptyClassicCv('cv-test');
cv.nom = 'Ada <script>Ngo';
cv.certifications = [{ id: 'c1', nom: 'PMP', organisme: 'PMI', annee: '2024' }];
cv.langues = [{ id: 'l1', langue: 'Anglais', niveau: 'Courant' }];
cv.references = [{ id: 'r1', nom: 'Camille Mbe', poste: 'Directrice', entreprise: 'Atelier Nord', contact: 'camille@example.com' }];
cv.centresInteret = ['Photographie'];
cv.photoDataUrl = 'data:image/svg+xml;base64,aaaa';

for (const templateId of templates) {
  const html = renderClassicCvHtml({ ...cv, templateId });
  assert(html.includes('CERTIFICATIONS'), `${templateId} : certifications`);
  assert(html.includes('PMP'), `${templateId} : nom de certification`);
  assert(html.includes('LANGUES'), `${templateId} : langues`);
  assert(html.includes('Anglais'), `${templateId} : langue saisie`);
  assert(html.includes('RÉFÉRENCES') || html.includes('R&Eacute;F&Eacute;RENCES'), `${templateId} : références`);
  assert(html.includes('Camille Mbe'), `${templateId} : référence saisie`);
  assert(html.includes('Photographie'), `${templateId} : centre d'intérêt`);
  assert(!html.toLowerCase().includes('<script'), `${templateId} : balise script absente`);
  assert(html.includes('&lt;script&gt;'), `${templateId} : nom échappé`);
  assert(!html.includes('data:image/svg+xml'), `${templateId} : photo svg refusée`);
}

const withPng = renderClassicCvHtml({
  ...cv,
  templateId: 'moderne',
  photoDataUrl: 'data:image/png;base64,aaaa',
});
assert(withPng.includes('data:image/png;base64,aaaa'), 'photo png conservée');

console.log('sections CV classique : ok');
