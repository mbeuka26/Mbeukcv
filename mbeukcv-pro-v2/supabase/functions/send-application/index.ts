import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { ApiError, errorBody } from '../_shared/errors.ts';
import { requireActiveLicence } from '../_shared/auth.ts';
import { releaseEmailSend, reserveEmailSend } from '../_shared/emailQuota.ts';
import { sendApplicationPayloadSchema } from '../../../contracts/emailPayload.ts';

/**
 * ════════════════════════════════════════════════════════════
 * POST /functions/v1/send-application
 * ════════════════════════════════════════════════════════════
 * Portage Supabase de l'ancienne Cloud Function Firebase du même nom,
 * avec **Brevo** à la place de Resend pour l'envoi d'e-mail (API
 * transactionnelle Brevo : POST https://api.brevo.com/v3/smtp/email).
 *
 * Corps : { licenceCode, destinataire, objet, message?, emailCandidatReplyTo?, pieces: [...] }
 * Réponse succès : { status: "success", data: { id: string | null } }
 */

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

function isPdfSignature(base64: string): boolean {
  try {
    const bin = atob(base64.slice(0, 12)); // "%PDF-" tient dans les tout premiers octets
    return bin.startsWith('%PDF-');
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  let emailReserved = false;
  let licenceCodeForRelease = '';

  try {
    if (req.method !== 'POST') throw ApiError.methodNotAllowed('Seule la méthode POST est autorisée.');

    const { uid, licenceCode, licence } = await requireActiveLicence(req);
    licenceCodeForRelease = licenceCode;

    const body = await req.json();
    const parsed = sendApplicationPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.invalidArgument(`Payload invalide : ${parsed.error.issues[0]?.message}`);
    }
    const payload = parsed.data;

    for (const piece of payload.pieces) {
      if (!isPdfSignature(piece.contentBase64)) {
        throw ApiError.invalidArgument(`Pièce jointe "${piece.filename}" ne semble pas être un PDF valide.`);
      }
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const fromEmail = Deno.env.get('BREVO_FROM_EMAIL') ?? 'no-reply@mbeukcv.pro';
    const fromName = Deno.env.get('BREVO_FROM_NAME') ?? 'MbeukCV Pro';
    if (!brevoApiKey) throw ApiError.internal('Clé Brevo non configurée côté serveur.');

    await reserveEmailSend(licenceCode);
    emailReserved = true;

    const defaultMessage = [
      'Bonjour,',
      '',
      `Veuillez trouver ci-joint ma candidature${licence.acheteur ? ` (${licence.acheteur})` : ''}.`,
      '',
      'Cordialement.',
    ].join('\n');

    const brevoBody = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: payload.destinataire }],
      replyTo: payload.emailCandidatReplyTo ? { email: payload.emailCandidatReplyTo } : undefined,
      subject: payload.objet,
      textContent: payload.message?.trim() || defaultMessage,
      attachment: payload.pieces.map((p) => ({ content: p.contentBase64, name: p.filename })),
    };

    let brevoRes: Response;
    try {
      brevoRes = await fetch(BREVO_SEND_URL, {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(brevoBody),
      });
    } catch (err) {
      throw ApiError.upstream(`Échec réseau vers Brevo : ${err instanceof Error ? err.message : 'inconnu'}`);
    }

    const brevoJson = await brevoRes.json().catch(() => ({}));

    if (!brevoRes.ok) {
      const brevoMessage = typeof brevoJson?.message === 'string' ? brevoJson.message : `HTTP ${brevoRes.status}`;
      console.error('send-application: échec Brevo', { uid, status: brevoRes.status, brevoMessage });
      throw ApiError.upstream(`Échec de l'envoi de l'e-mail : ${brevoMessage}`);
    }

    emailReserved = false;

    const messageId: string | null = typeof brevoJson?.messageId === 'string' ? brevoJson.messageId : null;

    console.log(JSON.stringify({ event: 'send-application:success', uid, licenceCode, messageId }));

    return new Response(JSON.stringify({ status: 'success', data: { id: messageId } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (emailReserved && licenceCodeForRelease) {
      emailReserved = false;
      await releaseEmailSend(licenceCodeForRelease);
    }
    if (err instanceof ApiError) {
      return new Response(JSON.stringify(errorBody(err)), {
        status: err.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('send-application: erreur interne', err);
    const internal = ApiError.internal('Erreur interne. Réessayez plus tard.');
    return new Response(JSON.stringify(errorBody(internal)), {
      status: internal.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
