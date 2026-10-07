import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import type { CvData } from '@/lib/cv';

function winAnsi(value: string): string {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[^\n\r\t\x20-\xFF]/g, '');
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of winAnsi(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const next = `${current} ${word}`;
      if (font.widthOfTextAtSize(next, size) > width) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines;
}

export async function renderCvPdf(cv: CvData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 800;
  const left = 48;
  const width = 500;

  const draw = (text: string, used: PDFFont, size: number, gap = 16) => {
    for (const line of wrap(text, used, size, width)) {
      if (y < 56) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(line, { x: left, y, size, font: used });
      y -= gap;
    }
  };

  draw(cv.fullName || 'Candidat', bold, 18, 22);
  if (cv.title) draw(cv.title, font, 12, 16);
  const contact = [cv.email, cv.phone, cv.location].filter(Boolean).join('  ·  ');
  if (contact) draw(contact, font, 10, 18);
  if (cv.summary) {
    draw('Profil', bold, 12, 16);
    draw(cv.summary, font, 10, 13);
    y -= 6;
  }
  if (cv.skills.length > 0) {
    draw('Compétences', bold, 12, 16);
    draw(cv.skills.join(', '), font, 10, 14);
    y -= 6;
  }
  if (cv.experiences.some((item) => item.role || item.company)) {
    draw('Expérience', bold, 12, 16);
    for (const item of cv.experiences) {
      if (!item.role && !item.company) continue;
      draw([item.role, item.company, item.period].filter(Boolean).join(' — '), bold, 11, 14);
      if (item.details) draw(item.details, font, 10, 13);
    }
  }
  if (cv.education.some((item) => item.diploma || item.school)) {
    draw('Formation', bold, 12, 16);
    for (const item of cv.education) {
      if (!item.diploma && !item.school) continue;
      draw([item.diploma, item.school, item.year].filter(Boolean).join(' — '), font, 10, 14);
    }
  }

  return doc.save();
}

export async function renderTextPdf(title: string, body: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 800;
  const draw = (text: string, used: PDFFont, size: number, gap: number) => {
    for (const line of wrap(text, used, size, 500)) {
      if (y < 56) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(line, { x: 48, y, size, font: used });
      y -= gap;
    }
  };
  draw(title, bold, 16, 22);
  draw(body, font, 11, 14);
  return doc.save();
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, 12000);
}
