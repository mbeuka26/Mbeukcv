import type { ClassicCvData, CvTemplateId } from '@/lib/classic/types';

function isAllowedPhotoDataUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  const compact = value.trim().replace(/\s/g, '');
  if (compact.length > 2_200_000) return false;
  return /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(compact);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function periode(debut: string, fin: string, enCours?: boolean): string {
  const f = enCours ? "Aujourd'hui" : fin;
  return [debut, f].filter(Boolean).join(' — ');
}

function photoImg(cv: ClassicCvData, style: string): string {
  if (!isAllowedPhotoDataUrl(cv.photoDataUrl)) return '';
  return `<img src="${cv.photoDataUrl}" alt="" style="${style}">`;
}

function certBody(cv: ClassicCvData): string {
  return cv.certifications
    .map((c) => {
      const meta = [c.organisme, c.annee].filter(Boolean).map(esc).join(' · ');
      return `<div style="margin-bottom:4px;font-size:11px;"><strong>${esc(c.nom)}</strong>${meta ? ` — ${meta}` : ''}</div>`;
    })
    .join('');
}

function refBody(cv: ClassicCvData): string {
  return cv.references
    .map((r) => {
      const role = [r.poste, r.entreprise].filter(Boolean).map(esc).join(' · ');
      return `<div style="margin-bottom:6px;font-size:11px;"><strong>${esc(r.nom)}</strong>${
        role ? `<div style="font-size:10px;color:#555;">${role}</div>` : ''
      }${r.contact ? `<div style="font-size:10px;color:#555;">${esc(r.contact)}</div>` : ''}</div>`;
    })
    .join('');
}

function interestBody(cv: ClassicCvData): string {
  if (!cv.centresInteret.length) return '';
  return `<div style="font-size:11px;">${cv.centresInteret.map(esc).join(' · ')}</div>`;
}

function langueBody(cv: ClassicCvData): string {
  if (!cv.langues.length) return '';
  return `<div style="font-size:11px;">${cv.langues.map((l) => `${esc(l.langue)} (${esc(l.niveau)})`).join(' · ')}</div>`;
}

function titled(title: string, titleStyle: string, body: string): string {
  if (!body) return '';
  return `<div style="${titleStyle}">${title}</div>${body}`;
}

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">';

const BASE_HEAD = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${FONT_LINK}<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { width: 210mm; min-height: 297mm; margin: 0 auto; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>`;

const SOBRE_TITLE =
  "font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:#1a3a5c;padding-top:10px;";
const MODERNE_TITLE =
  "font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:#0a0a0f;border-bottom:2px solid #d4a843;padding-bottom:4px;margin:14px 0 8px;";
const COLORE_TITLE = "font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:#c8440e;margin:14px 0 8px;";

/** Modèle "Sobre" — une colonne, table pour l'en-tête, très ATS-friendly. */
function renderSobre(cv: ClassicCvData): string {
  const exp = cv.experiences
    .map(
      (e) => `<tr><td style="padding:8px 0;vertical-align:top;">
      <div style="font-weight:700;font-size:12px;">${esc(e.poste)} — ${esc(e.entreprise)}</div>
      <div style="font-size:10px;color:#666;margin-bottom:4px;">${esc(periode(e.dateDebut, e.dateFin, e.enCours))}${e.lieu ? ' · ' + esc(e.lieu) : ''}</div>
      <div style="font-size:11px;color:#222;white-space:pre-line;">${esc(e.description)}</div>
    </td></tr>`
    )
    .join('');

  const formation = cv.formations
    .map(
      (f) => `<tr><td style="padding:6px 0;vertical-align:top;">
      <div style="font-weight:700;font-size:11px;">${esc(f.diplome)} — ${esc(f.etablissement)}</div>
      <div style="font-size:10px;color:#666;">${esc(periode(f.dateDebut, f.dateFin))}</div>
    </td></tr>`
    )
    .join('');

  const extra = [
    titled('CERTIFICATIONS', SOBRE_TITLE, certBody(cv)),
    titled("CENTRES D'INTÉRÊT", SOBRE_TITLE, interestBody(cv)),
    titled('RÉFÉRENCES', SOBRE_TITLE, refBody(cv)),
  ].join('');

  return `${BASE_HEAD}
  <table style="width:100%;padding:18mm;">
    <tr><td>
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;">${esc(cv.nom)}</div>
      <div style="font-size:13px;color:#1a3a5c;font-weight:600;margin-bottom:6px;">${esc(cv.titrePoste)}</div>
      <div style="font-size:10px;color:#555;">${[cv.email, cv.telephone, cv.ville, cv.linkedin].filter(Boolean).map(esc).join('  ·  ')}</div>
      <hr style="border:none;border-top:2px solid #d4a843;margin:14px 0;">
    </td></tr>
    ${cv.resume ? `<tr><td style="padding-bottom:10px;font-size:11px;color:#333;">${esc(cv.resume)}</td></tr>` : ''}
    ${exp ? `<tr><td style="${SOBRE_TITLE}">EXPÉRIENCE PROFESSIONNELLE</td></tr><tr><td><table style="width:100%;">${exp}</table></td></tr>` : ''}
    ${formation ? `<tr><td style="${SOBRE_TITLE}">FORMATION</td></tr><tr><td><table style="width:100%;">${formation}</table></td></tr>` : ''}
    ${cv.competences.length ? `<tr><td style="${SOBRE_TITLE}">COMPÉTENCES</td></tr><tr><td style="font-size:11px;padding-top:4px;">${cv.competences.map(esc).join(' · ')}</td></tr>` : ''}
    ${cv.langues.length ? `<tr><td style="${SOBRE_TITLE}">LANGUES</td></tr><tr><td style="font-size:11px;padding-top:4px;">${cv.langues.map((l) => `${esc(l.langue)} (${esc(l.niveau)})`).join(' · ')}</td></tr>` : ''}
    ${extra ? `<tr><td>${extra}</td></tr>` : ''}
  </table>
  </body></html>`;
}

/** Modèle "Moderne" — deux colonnes (table), bandeau latéral bleu marine. */
function renderModerne(cv: ClassicCvData): string {
  const exp = cv.experiences
    .map(
      (e) => `<div style="margin-bottom:10px;">
      <div style="font-weight:700;font-size:12px;">${esc(e.poste)}</div>
      <div style="font-size:10px;color:#1a3a5c;">${esc(e.entreprise)} · ${esc(periode(e.dateDebut, e.dateFin, e.enCours))}</div>
      <div style="font-size:10.5px;color:#333;white-space:pre-line;margin-top:2px;">${esc(e.description)}</div>
    </div>`
    )
    .join('');

  const extra = [
    titled('CERTIFICATIONS', MODERNE_TITLE, certBody(cv)),
    titled("CENTRES D'INTÉRÊT", MODERNE_TITLE, interestBody(cv)),
    titled('RÉFÉRENCES', MODERNE_TITLE, refBody(cv)),
  ].join('');

  return `${BASE_HEAD}
  <table style="width:100%;height:297mm;">
    <tr>
      <td style="width:65mm;background:#0a0a0f;color:white;padding:14mm 10mm;vertical-align:top;">
        ${photoImg(cv, 'width:32mm;height:32mm;border-radius:50%;object-fit:cover;margin-bottom:10px;')}
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:16px;">${esc(cv.nom)}</div>
        <div style="font-size:11px;color:#d4a843;margin-bottom:14px;">${esc(cv.titrePoste)}</div>
        <div style="font-size:9.5px;color:rgba(255,255,255,0.75);line-height:1.8;">${[cv.email, cv.telephone, cv.ville, cv.linkedin].filter(Boolean).map(esc).join('<br>')}</div>
        ${cv.competences.length ? `<div style="font-family:'Syne',sans-serif;font-weight:700;font-size:10px;color:#d4a843;margin-top:16px;">COMPÉTENCES</div><div style="font-size:9.5px;margin-top:4px;line-height:1.8;">${cv.competences.map(esc).join('<br>')}</div>` : ''}
        ${cv.langues.length ? `<div style="font-family:'Syne',sans-serif;font-weight:700;font-size:10px;color:#d4a843;margin-top:14px;">LANGUES</div><div style="font-size:9.5px;margin-top:4px;line-height:1.8;">${cv.langues.map((l) => `${esc(l.langue)} — ${esc(l.niveau)}`).join('<br>')}</div>` : ''}
      </td>
      <td style="padding:14mm 12mm;vertical-align:top;">
        ${cv.resume ? `<div style="font-size:11px;color:#333;margin-bottom:14px;">${esc(cv.resume)}</div>` : ''}
        ${exp ? `<div style="${MODERNE_TITLE}">EXPÉRIENCE</div>${exp}` : ''}
        ${cv.formations.length ? `<div style="${MODERNE_TITLE}">FORMATION</div>${cv.formations.map((f) => `<div style="margin-bottom:6px;"><div style="font-weight:700;font-size:11px;">${esc(f.diplome)}</div><div style="font-size:10px;color:#666;">${esc(f.etablissement)} · ${esc(periode(f.dateDebut, f.dateFin))}</div></div>`).join('')}` : ''}
        ${extra}
      </td>
    </tr>
  </table>
  </body></html>`;
}

/** Modèle "Coloré" — bandeau d'en-tête coloré pleine largeur, une colonne. */
function renderColore(cv: ClassicCvData): string {
  const exp = cv.experiences
    .map(
      (e) => `<div style="margin-bottom:10px;border-left:3px solid #c8440e;padding-left:10px;">
      <div style="font-weight:700;font-size:12px;">${esc(e.poste)} · ${esc(e.entreprise)}</div>
      <div style="font-size:10px;color:#666;">${esc(periode(e.dateDebut, e.dateFin, e.enCours))}</div>
      <div style="font-size:10.5px;color:#333;white-space:pre-line;margin-top:3px;">${esc(e.description)}</div>
    </div>`
    )
    .join('');

  return `${BASE_HEAD}
  <table style="width:100%;">
    <tr><td style="background:#c8440e;color:white;padding:16mm 18mm;">
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:24px;">${esc(cv.nom)}</div>
      <div style="font-size:13px;margin-bottom:8px;">${esc(cv.titrePoste)}</div>
      <div style="font-size:10px;">${[cv.email, cv.telephone, cv.ville].filter(Boolean).map(esc).join('  ·  ')}</div>
    </td></tr>
    <tr><td style="padding:14mm 18mm;">
      ${cv.resume ? `<div style="font-size:11px;color:#333;margin-bottom:14px;">${esc(cv.resume)}</div>` : ''}
      ${exp ? `<div style="${COLORE_TITLE}">EXPÉRIENCE</div>${exp}` : ''}
      ${cv.formations.length ? `<div style="${COLORE_TITLE}">FORMATION</div>${cv.formations.map((f) => `<div style="margin-bottom:6px;font-size:11px;"><strong>${esc(f.diplome)}</strong> — ${esc(f.etablissement)} (${esc(periode(f.dateDebut, f.dateFin))})</div>`).join('')}` : ''}
      ${cv.competences.length ? `<div style="${COLORE_TITLE}">COMPÉTENCES</div><div style="font-size:11px;">${cv.competences.map(esc).join(' · ')}</div>` : ''}
      ${titled('LANGUES', COLORE_TITLE, langueBody(cv))}
      ${titled('CERTIFICATIONS', COLORE_TITLE, certBody(cv))}
      ${titled("CENTRES D'INTÉRÊT", COLORE_TITLE, interestBody(cv))}
      ${titled('RÉFÉRENCES', COLORE_TITLE, refBody(cv))}
    </td></tr>
  </table>
  </body></html>`;
}

const RENDERERS: Record<CvTemplateId, (cv: ClassicCvData) => string> = {
  sobre: renderSobre,
  moderne: renderModerne,
  colore: renderColore,
};

export function renderClassicCvHtml(cv: ClassicCvData): string {
  return RENDERERS[cv.templateId](cv);
}

export const TEMPLATE_LABELS: Record<CvTemplateId, string> = {
  sobre: 'Sobre — une colonne, ATS-friendly',
  moderne: 'Moderne — deux colonnes, bandeau sombre',
  colore: "Coloré — bandeau d'en-tête",
};
