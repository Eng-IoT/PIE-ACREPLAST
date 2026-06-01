# Guia — Automação Inteligente e Modo Fiscalização

## 1. Automação Inteligente

Nova rota:

```txt
/automacao-inteligente
```

Funções adicionadas:

- Central de notificações no topo do aplicativo.
- Verificação manual de vencimentos e pendências.
- Criação automática de notificações no Firestore.
- Criação de fila de e-mails em `emailQueue`.
- Relatório semanal automático em `weeklyReports`.
- Logs de automação em `automationLogs`.
- QR Code por quadro, máquina ou equipamento em `equipmentQrCodes`.
- Endpoint de e-mail em `/api/send-email` para Vercel.
- Endpoints de cron em `/api/cron/check-deadlines` e `/api/cron/weekly-report`.

## 2. Como usar a automação

1. Entre no aplicativo com conta administradora.
2. Acesse **Automação Inteligente**.
3. Informe o e-mail do responsável/supervisor.
4. Clique em **Executar agora** para gerar alertas.
5. Clique em **Gerar relatório semanal** para criar resumo e colocar e-mail na fila.
6. Configure `RESEND_API_KEY` na Vercel para envio real de e-mail.

## 3. Variáveis de ambiente para e-mail

Na Vercel, configure:

```env
RESEND_API_KEY="sua_chave_resend"
EMAIL_FROM="PIE ACREPLAST <no-reply@seudominio.com>"
CRON_SECRET="um_segredo_opcional"
```

Sem `RESEND_API_KEY`, o sistema continua funcionando, mas os e-mails ficam apenas na fila do Firestore.

## 4. Modo Fiscalização

Nova rota administrativa:

```txt
/modo-fiscalizacao
```

Rota pública temporária:

```txt
/fiscalizacao/:token
```

Funções:

- Criar link temporário para fiscal/auditor/cliente.
- Definir validade: 24h, 7 dias, 15 dias ou 30 dias.
- Gerar pacote público em subcoleção `inspectionAccess/{token}/publicItems`.
- Registrar logs em `inspectionAccess/{token}/logs`.
- Permissão pública apenas para leitura enquanto o token estiver ativo.
- Revogar acesso a qualquer momento.

## 5. Coleções Firestore adicionadas

```txt
notifications
emailQueue
emailLogs
automationLogs
weeklyReports
equipmentQrCodes
inspectionAccess
inspectionAccess/{token}/publicItems
inspectionAccess/{token}/logs
```

## 6. Regras Firebase

As regras em `firestore.rules` foram atualizadas. Depois de atualizar o projeto, execute:

```bash
npm run deploy:rules
```

ou:

```bash
firebase deploy --only firestore:rules,storage
```

## 7. Observação importante

O modo fiscalização gera um pacote público com metadados e links de arquivos já existentes. Os arquivos do Firebase Storage abertos por `downloadURL` continuam acessíveis pelo token do próprio arquivo, sem exigir login.

Para documentos extremamente sensíveis, revise quais documentos estão cadastrados no sistema antes de criar o link fiscal.
