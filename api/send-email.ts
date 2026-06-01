export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      message: 'RESEND_API_KEY não configurada na Vercel. O e-mail foi mantido na fila do Firestore.',
    });
  }

  const { to, subject, html, text } = req.body || {};
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ message: 'Informe to, subject e html ou text.' });
  }

  const from = process.env.EMAIL_FROM || 'PIE ACREPLAST <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || `<pre>${text}</pre>`,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return res.status(response.status).json({
      message: data?.message || 'Falha ao enviar e-mail pelo provedor.',
      details: data,
    });
  }

  return res.status(200).json({ ok: true, id: data?.id || null });
}
