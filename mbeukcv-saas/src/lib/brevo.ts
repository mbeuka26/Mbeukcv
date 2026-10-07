import 'server-only';

export interface BrevoAttachment {
  filename: string;
  content: Buffer;
}

export async function sendBrevoEmail(input: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  attachments: BrevoAttachment[];
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
  const fromName = process.env.BREVO_FROM_NAME?.trim() || 'MbeukCV';
  if (!apiKey || !fromEmail) {
    throw new Error('L’envoi d’e-mail n’est pas configuré (Brevo).');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: input.to }],
      replyTo: { email: input.replyTo },
      subject: input.subject,
      textContent: input.text,
      attachment: input.attachments.map((file) => ({
        name: file.filename,
        content: file.content.toString('base64'),
      })),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body && typeof body.message === 'string' ? body.message : `HTTP ${response.status}`;
    throw new Error(`Échec de l’envoi Brevo : ${message}`);
  }
}
