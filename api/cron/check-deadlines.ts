export default async function handler(req: any, res: any) {
  const configuredSecret = process.env.CRON_SECRET;
  const receivedSecret = req.headers['x-cron-secret'] || req.query?.secret;

  if (configuredSecret && receivedSecret !== configuredSecret) {
    return res.status(401).json({ ok: false, message: 'Acesso não autorizado.' });
  }

  return res.status(200).json({
    ok: true,
    message: 'Endpoint de cron preparado. A verificação operacional principal é executada no módulo Automação Inteligente dentro do app, com usuário autenticado e permissões do Firestore.',
  });
}
