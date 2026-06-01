export default async function handler(req: any, res: any) {
  const configuredSecret = process.env.CRON_SECRET;
  const receivedSecret = req.headers['x-cron-secret'] || req.query?.secret;

  if (configuredSecret && receivedSecret !== configuredSecret) {
    return res.status(401).json({ ok: false, message: 'Acesso não autorizado.' });
  }

  return res.status(200).json({
    ok: true,
    message: 'Endpoint de relatório semanal preparado. Use o módulo Automação Inteligente para gerar relatório com dados do Firestore e colocar e-mails na fila.',
  });
}
