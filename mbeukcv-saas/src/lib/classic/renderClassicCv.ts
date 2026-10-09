import { photoImgTag } from '@/lib/classic/photo';
import { formatRichText, formatSkillsList } from '@/lib/classic/richText';
import type { ClassicCvData, CvTemplateId } from '@/lib/classic/types';

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
  return formatRichText(cv.centresInteret.join('\n'));
}

function langueBody(cv: ClassicCvData): string {
  if (!cv.langues.length) return '';
  return `<div style="font-size:11px;">${cv.langues.map((l) => `${esc(l.langue)} (${esc(l.niveau)})`).join(' · ')}</div>`;
}

function titled(title: string, titleStyle: string, body: string): string {
  if (!body) return '';
  return `<div style="${titleStyle}">${title}</div>${body}`;
}

function expBlock(cv: ClassicCvData, titleStyle: string, itemStyle: string): string {
  if (!cv.experiences.length) return '';
  const items = cv.experiences
    .map(
      (e) => `<div style="${itemStyle}">
      <div style="font-weight:700;font-size:12px;">${esc(e.poste)}${e.entreprise ? ` — ${esc(e.entreprise)}` : ''}</div>
      <div style="font-size:10px;color:#666;margin-bottom:4px;">${esc(periode(e.dateDebut, e.dateFin, e.enCours))}${e.lieu ? ' · ' + esc(e.lieu) : ''}</div>
      ${e.description ? formatRichText(e.description) : ''}
    </div>`,
    )
    .join('');
  return `<div style="${titleStyle}">EXPÉRIENCE PROFESSIONNELLE</div>${items}`;
}

function formBlock(cv: ClassicCvData, titleStyle: string): string {
  if (!cv.formations.length) return '';
  const items = cv.formations
    .map(
      (f) => `<div style="margin-bottom:8px;">
      <div style="font-weight:700;font-size:11px;">${esc(f.diplome)} — ${esc(f.etablissement)}</div>
      <div style="font-size:10px;color:#666;">${esc(periode(f.dateDebut, f.dateFin))}${f.lieu ? ' · ' + esc(f.lieu) : ''}</div>
      ${f.description ? formatRichText(f.description) : ''}
    </div>`,
    )
    .join('');
  return `<div style="${titleStyle}">FORMATION</div>${items}`;
}

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">';

const BASE_HEAD = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${FONT_LINK}<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { width: 210mm; min-height: 297mm; margin: 0 auto; font-family: 'Inter', system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #1d1916; }
</style></head><body>`;

const SOBRE_TITLE =
  "font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:#1a3a5c;padding-top:10px;";
const MODERNE_TITLE =
  "font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:#0a0a0f;border-bottom:2px solid #d4a843;padding-bottom:4px;margin:14px 0 8px;";
const COLORE_TITLE = "font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:#c8440e;margin:14px 0 8px;";
const EU_TITLE = "font-family:'Syne',sans-serif;font-weight:700;font-size:11px;color:#003399;text-transform:uppercase;letter-spacing:0.06em;margin:14px 0 6px;border-bottom:1px solid #003399;padding-bottom:3px;";

function headerWithPhoto(cv: ClassicCvData, inner: string, photoStyle: string): string {
  const photo = photoImgTag(cv.photoDataUrl, photoStyle);
  if (!photo) return inner;
  return `<table style="width:100%;margin-bottom:10px;"><tr>
    <td style="vertical-align:top;">${inner}</td>
    <td style="width:28mm;text-align:right;vertical-align:top;">${photo}</td>
  </tr></table>`;
}

function renderSobre(cv: ClassicCvData): string {
  const head = headerWithPhoto(
    cv,
    `<div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;">${esc(cv.nom)}</div>
      <div style="font-size:13px;color:#1a3a5c;font-weight:600;margin-bottom:6px;">${esc(cv.titrePoste)}</div>
      <div style="font-size:10px;color:#555;">${[cv.email, cv.telephone, cv.ville, cv.linkedin].filter(Boolean).map(esc).join('  ·  ')}</div>`,
    'width:26mm;height:32mm;object-fit:cover;border:1px solid #ccc;',
  );

  const extra = [
    titled('CERTIFICATIONS', SOBRE_TITLE, certBody(cv)),
    titled("CENTRES D'INTÉRÊT", SOBRE_TITLE, interestBody(cv)),
    titled('RÉFÉRENCES', SOBRE_TITLE, refBody(cv)),
  ].join('');

  return `${BASE_HEAD}<div style="padding:16mm;">
    ${head}
    <hr style="border:none;border-top:2px solid #d4a843;margin:14px 0;">
    ${cv.resume ? `<div style="margin-bottom:10px;">${formatRichText(cv.resume)}</div>` : ''}
    ${expBlock(cv, SOBRE_TITLE, 'margin-bottom:10px;')}
    ${formBlock(cv, SOBRE_TITLE)}
    ${cv.competences.length ? `<div style="${SOBRE_TITLE}">COMPÉTENCES</div>${formatSkillsList(cv.competences)}` : ''}
    ${cv.langues.length ? `<div style="${SOBRE_TITLE}">LANGUES</div>${langueBody(cv)}` : ''}
    ${extra}
  </div></body></html>`;
}

function renderModerne(cv: ClassicCvData): string {
  return `${BASE_HEAD}
  <table style="width:100%;min-height:297mm;">
    <tr>
      <td style="width:65mm;background:#0a0a0f;color:white;padding:14mm 10mm;vertical-align:top;">
        ${photoImgTag(cv.photoDataUrl, 'width:32mm;height:32mm;border-radius:50%;object-fit:cover;margin-bottom:10px;display:block;')}
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:16px;">${esc(cv.nom)}</div>
        <div style="font-size:11px;color:#d4a843;margin-bottom:14px;">${esc(cv.titrePoste)}</div>
        <div style="font-size:9.5px;color:rgba(255,255,255,0.75);line-height:1.8;">${[cv.email, cv.telephone, cv.ville, cv.linkedin].filter(Boolean).map(esc).join('<br>')}</div>
        ${cv.competences.length ? `<div style="font-family:'Syne',sans-serif;font-weight:700;font-size:10px;color:#d4a843;margin-top:16px;">COMPÉTENCES</div>${formatSkillsList(cv.competences).replace(/color:#222/g, 'color:rgba(255,255,255,0.9)')}` : ''}
        ${cv.langues.length ? `<div style="font-family:'Syne',sans-serif;font-weight:700;font-size:10px;color:#d4a843;margin-top:14px;">LANGUES</div><div style="font-size:9.5px;margin-top:4px;line-height:1.8;">${cv.langues.map((l) => `${esc(l.langue)} — ${esc(l.niveau)}`).join('<br>')}</div>` : ''}
      </td>
      <td style="padding:14mm 12mm;vertical-align:top;">
        ${cv.resume ? `<div style="margin-bottom:14px;">${formatRichText(cv.resume)}</div>` : ''}
        ${expBlock(cv, MODERNE_TITLE, 'margin-bottom:10px;')}
        ${formBlock(cv, MODERNE_TITLE)}
        ${titled('CERTIFICATIONS', MODERNE_TITLE, certBody(cv))}
        ${titled("CENTRES D'INTÉRÊT", MODERNE_TITLE, interestBody(cv))}
        ${titled('RÉFÉRENCES', MODERNE_TITLE, refBody(cv))}
      </td>
    </tr>
  </table></body></html>`;
}

function renderColore(cv: ClassicCvData): string {
  return `${BASE_HEAD}
  <table style="width:100%;">
    <tr><td style="background:#c8440e;color:white;padding:14mm 18mm;">
      <table style="width:100%;"><tr>
        <td>
          <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:24px;">${esc(cv.nom)}</div>
          <div style="font-size:13px;margin-bottom:8px;">${esc(cv.titrePoste)}</div>
          <div style="font-size:10px;">${[cv.email, cv.telephone, cv.ville].filter(Boolean).map(esc).join('  ·  ')}</div>
        </td>
        <td style="width:30mm;text-align:right;">${photoImgTag(cv.photoDataUrl, 'width:28mm;height:34mm;object-fit:cover;border:2px solid rgba(255,255,255,0.5);')}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:14mm 18mm;">
      ${cv.resume ? `<div style="margin-bottom:14px;">${formatRichText(cv.resume)}</div>` : ''}
      ${expBlock(cv, COLORE_TITLE, 'margin-bottom:10px;border-left:3px solid #c8440e;padding-left:10px;')}
      ${formBlock(cv, COLORE_TITLE)}
      ${cv.competences.length ? `<div style="${COLORE_TITLE}">COMPÉTENCES</div>${formatSkillsList(cv.competences)}` : ''}
      ${titled('LANGUES', COLORE_TITLE, langueBody(cv))}
      ${titled('CERTIFICATIONS', COLORE_TITLE, certBody(cv))}
      ${titled("CENTRES D'INTÉRÊT", COLORE_TITLE, interestBody(cv))}
      ${titled('RÉFÉRENCES', COLORE_TITLE, refBody(cv))}
    </td></tr>
  </table></body></html>`;
}

/** Europass (inspiré CV européen — sections normalisées). */
function renderEuropass(cv: ClassicCvData): string {
  return `${BASE_HEAD}
  <div style="border-top:6px solid #003399;padding:14mm 16mm;">
    <table style="width:100%;"><tr>
      <td>
        <div style="font-size:10px;color:#003399;font-weight:600;">CURRICULUM VITAE</div>
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:#003399;">${esc(cv.nom)}</div>
        <div style="font-size:13px;margin:4px 0 8px;">${esc(cv.titrePoste)}</div>
        <div style="font-size:10px;">${[cv.email, cv.telephone, cv.ville, cv.linkedin].filter(Boolean).map(esc).join(' · ')}</div>
      </td>
      <td style="width:32mm;text-align:right;">${photoImgTag(cv.photoDataUrl, 'width:28mm;height:36mm;object-fit:cover;border:1px solid #003399;')}</td>
    </tr></table>
    ${cv.resume ? `<div style="${EU_TITLE}">Profil</div>${formatRichText(cv.resume)}` : ''}
    ${expBlock(cv, EU_TITLE, 'margin-bottom:10px;')}
    ${formBlock(cv, EU_TITLE)}
    ${cv.competences.length ? `<div style="${EU_TITLE}">Compétences</div>${formatSkillsList(cv.competences)}` : ''}
    ${cv.langues.length ? `<div style="${EU_TITLE}">Langues</div>${langueBody(cv)}` : ''}
    ${titled('CERTIFICATIONS', EU_TITLE, certBody(cv))}
  </div></body></html>`;
}

/** Format canadien — résumé professionnel, mise en page aérée. */
function renderCanadien(cv: ClassicCvData): string {
  return `${BASE_HEAD}
  <div style="padding:16mm 18mm;">
    <table style="width:100%;border-bottom:2px solid #2c5282;padding-bottom:12px;margin-bottom:12px;"><tr>
      <td>
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:24px;color:#2c5282;">${esc(cv.nom)}</div>
        <div style="font-size:14px;font-weight:600;">${esc(cv.titrePoste)}</div>
      </td>
      <td style="width:30mm;text-align:right;">${photoImgTag(cv.photoDataUrl, 'width:26mm;height:32mm;object-fit:cover;')}</td>
    </tr></table>
    <div style="font-size:10px;margin-bottom:12px;">${[cv.email, cv.telephone, cv.ville, cv.linkedin].filter(Boolean).map(esc).join(' | ')}</div>
    ${cv.resume ? `<div style="font-weight:700;font-size:12px;color:#2c5282;">PROFESSIONAL SUMMARY / RÉSUMÉ</div>${formatRichText(cv.resume)}` : ''}
    ${expBlock(cv, "font-weight:700;font-size:12px;color:#2c5282;margin-top:14px;", 'margin-bottom:10px;')}
    ${formBlock(cv, "font-weight:700;font-size:12px;color:#2c5282;margin-top:14px;")}
    ${cv.competences.length ? `<div style="font-weight:700;font-size:12px;color:#2c5282;margin-top:14px;">CORE COMPETENCIES</div>${formatSkillsList(cv.competences)}` : ''}
    ${cv.langues.length ? `<div style="font-weight:700;font-size:12px;color:#2c5282;margin-top:14px;">LANGUAGES</div>${langueBody(cv)}` : ''}
  </div></body></html>`;
}

/** Belgique — proche Europass, accent bilingue FR/NL. */
function renderBelgique(cv: ClassicCvData): string {
  return `${BASE_HEAD}
  <div style="padding:14mm 16mm;border-left:8px solid #ef3340;">
    <table style="width:100%;"><tr>
      <td>
        <div style="font-size:9px;color:#666;">CV / RESUME</div>
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:21px;">${esc(cv.nom)}</div>
        <div style="font-size:12px;font-weight:600;color:#1a3a5c;">${esc(cv.titrePoste)}</div>
        <div style="font-size:10px;margin-top:6px;">${[cv.email, cv.telephone, cv.ville].filter(Boolean).map(esc).join(' · ')}</div>
      </td>
      <td style="width:28mm;">${photoImgTag(cv.photoDataUrl, 'width:26mm;height:32mm;object-fit:cover;border:2px solid #fdda24;')}</td>
    </tr></table>
    ${cv.resume ? `<div style="${EU_TITLE.replace('#003399', '#1a3a5c')}">Profil</div>${formatRichText(cv.resume)}` : ''}
    ${expBlock(cv, EU_TITLE.replace('#003399', '#1a3a5c'), 'margin-bottom:10px;')}
    ${formBlock(cv, EU_TITLE.replace('#003399', '#1a3a5c'))}
    ${cv.competences.length ? `<div style="${EU_TITLE.replace('#003399', '#1a3a5c')}">Compétences</div>${formatSkillsList(cv.competences)}` : ''}
    ${cv.langues.length ? `<div style="${EU_TITLE.replace('#003399', '#1a3a5c')}">Langues / Talen</div>${langueBody(cv)}` : ''}
  </div></body></html>`;
}

/** Allemagne — Lebenslauf structuré. */
function renderAllemand(cv: ClassicCvData): string {
  const deTitle = "font-family:'Syne',sans-serif;font-weight:700;font-size:11px;color:#111;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #111;margin:16px 0 8px;padding-bottom:4px;";
  return `${BASE_HEAD}
  <div style="padding:18mm 20mm;">
    <table style="width:100%;"><tr>
      <td>
        <div style="font-size:11px;color:#666;">Lebenslauf</div>
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;">${esc(cv.nom)}</div>
        <div style="font-size:12px;margin:4px 0;">${esc(cv.titrePoste)}</div>
        <div style="font-size:10px;">${[cv.email, cv.telephone, cv.ville].filter(Boolean).map(esc).join(' · ')}</div>
      </td>
      <td style="width:32mm;text-align:right;">${photoImgTag(cv.photoDataUrl, 'width:30mm;height:38mm;object-fit:cover;')}</td>
    </tr></table>
    ${cv.resume ? `<div style="${deTitle}">Kurzprofil</div>${formatRichText(cv.resume)}` : ''}
    ${expBlock(cv, deTitle, 'margin-bottom:10px;')}
    ${formBlock(cv, deTitle)}
    ${cv.competences.length ? `<div style="${deTitle}">Fähigkeiten</div>${formatSkillsList(cv.competences)}` : ''}
    ${cv.langues.length ? `<div style="${deTitle}">Sprachen</div>${langueBody(cv)}` : ''}
  </div></body></html>`;
}

/** USA — une colonne, résumé en tête. */
function renderUsa(cv: ClassicCvData): string {
  const t = "font-weight:700;font-size:12px;color:#111;margin:14px 0 6px;text-transform:uppercase;";
  return `${BASE_HEAD}
  <div style="padding:16mm 18mm;font-size:11px;">
    <div style="text-align:center;margin-bottom:12px;">
      ${photoImgTag(cv.photoDataUrl, 'width:24mm;height:24mm;object-fit:cover;border-radius:50%;margin:0 auto 8px;display:block;')}
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;">${esc(cv.nom)}</div>
      <div style="font-size:13px;">${esc(cv.titrePoste)}</div>
      <div style="font-size:10px;margin-top:4px;">${[cv.email, cv.telephone, cv.ville, cv.linkedin].filter(Boolean).map(esc).join(' · ')}</div>
    </div>
    ${cv.resume ? `<div style="${t}">Summary</div>${formatRichText(cv.resume)}` : ''}
    ${expBlock(cv, t, 'margin-bottom:10px;')}
    ${formBlock(cv, t)}
    ${cv.competences.length ? `<div style="${t}">Skills</div>${formatSkillsList(cv.competences)}` : ''}
    ${cv.langues.length ? `<div style="${t}">Languages</div>${langueBody(cv)}` : ''}
  </div></body></html>`;
}

/** Royaume-Uni — sobre, une colonne. */
function renderUk(cv: ClassicCvData): string {
  const t = "font-weight:700;font-size:12px;color:#003078;margin-top:12px;margin-bottom:6px;";
  return `${BASE_HEAD}
  <div style="padding:16mm 18mm;">
    ${headerWithPhoto(
      cv,
      `<div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:#003078;">${esc(cv.nom)}</div>
       <div style="font-size:13px;">${esc(cv.titrePoste)}</div>
       <div style="font-size:10px;margin-top:4px;">${[cv.email, cv.telephone, cv.ville].filter(Boolean).map(esc).join(' · ')}</div>`,
      'width:26mm;height:32mm;object-fit:cover;',
    )}
    ${cv.resume ? `<div style="${t}">Personal statement</div>${formatRichText(cv.resume)}` : ''}
    ${expBlock(cv, t, 'margin-bottom:10px;')}
    ${formBlock(cv, t)}
    ${cv.competences.length ? `<div style="${t}">Key skills</div>${formatSkillsList(cv.competences)}` : ''}
    ${cv.langues.length ? `<div style="${t}">Languages</div>${langueBody(cv)}` : ''}
  </div></body></html>`;
}

const RENDERERS: Record<CvTemplateId, (cv: ClassicCvData) => string> = {
  sobre: renderSobre,
  moderne: renderModerne,
  colore: renderColore,
  europass: renderEuropass,
  canadien: renderCanadien,
  belgique: renderBelgique,
  allemand: renderAllemand,
  usa: renderUsa,
  uk: renderUk,
};

export function renderClassicCvHtml(cv: ClassicCvData): string {
  const render = RENDERERS[cv.templateId] ?? renderSobre;
  return render(cv);
}

export const TEMPLATE_LABELS: Record<CvTemplateId, string> = {
  sobre: 'Sobre — une colonne, ATS-friendly',
  moderne: 'Moderne — deux colonnes, bandeau sombre',
  colore: "Coloré — bandeau d'en-tête",
  europass: 'Europass — format CV européen',
  canadien: 'Canada — résumé professionnel',
  belgique: 'Belgique — FR/NL',
  allemand: 'Allemagne — Lebenslauf',
  usa: 'États-Unis — une colonne',
  uk: 'Royaume-Uni — une colonne',
};
