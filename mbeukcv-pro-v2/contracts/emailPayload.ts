import { z } from 'zod';

const MAX_ATTACHMENTS = 4;
const MAX_BASE64_CHARS_PER_FILE = 14_000_000;
const MAX_TOTAL_BASE64_CHARS = 26_000_000;
const FILENAME_REGEX = /^[\w\-. ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇàâäéèêëîïôöùûüç]{1,150}\.pdf$/i;

const attachmentSchema = z.object({
  filename: z.string().regex(FILENAME_REGEX, 'Nom de fichier invalide.'),
  contentBase64: z.string().min(100).max(MAX_BASE64_CHARS_PER_FILE),
  mimeType: z.literal('application/pdf'),
});

export const sendApplicationPayloadSchema = z
  .object({
    licenceCode: z.string(),
    destinataire: z.string().email(),
    objet: z.string().min(3).max(200),
    message: z.string().max(5000).optional(),
    emailCandidatReplyTo: z.string().email().optional(),
    pieces: z.array(attachmentSchema).min(1).max(MAX_ATTACHMENTS),
  })
  .superRefine((data, ctx) => {
    const total = data.pieces.reduce((sum, piece) => sum + piece.contentBase64.length, 0);
    if (total > MAX_TOTAL_BASE64_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pieces'],
        message: 'Pièces jointes trop volumineuses (~19,5 Mo max).',
      });
    }
  });
