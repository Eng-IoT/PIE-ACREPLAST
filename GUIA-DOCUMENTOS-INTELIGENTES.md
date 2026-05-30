# Guia — Documentos Digitais Inteligentes

Este módulo transforma documentos do Prontuário NR-10 em formulários digitais preenchíveis, com fluxo de aprovação, assinatura na tela, geração de PDF final, QR Code de validação e histórico de auditoria.

## Aba criada no menu

- **Documentos Inteligentes**
- Rota: `/documentos-inteligentes`

## Modelos inteligentes incluídos

1. Checklist Inteligente de Inspeção Elétrica
2. APR Digital — Análise Preliminar de Risco
3. PT Digital — Permissão de Trabalho Elétrico
4. LOTO Digital — Bloqueio e Etiquetagem
5. Laudo de Ensaios Elétricos Digital
6. Termo de Designação do Responsável pelo PIE
7. Autorização Digital de Trabalhador NR-10
8. Controle Digital de EPI/EPC/Ferramental
9. Registro Inteligente de Evidências por TAG

## Fluxo de uso

1. Clique em **Documentos Inteligentes**.
2. Clique em **Novo documento inteligente**.
3. Escolha o modelo.
4. Preencha os campos obrigatórios.
5. Anexe evidências, fotos ou PDFs, se necessário.
6. Salve como **rascunho** ou envie para **aprovação**.
7. Aprove o documento.
8. Assine na tela.
9. Gere o PDF final.
10. O sistema cria o QR Code e arquiva o documento.

## Status disponíveis

- Rascunho
- Em preenchimento
- Aguardando aprovação
- Aprovado
- Aguardando assinatura
- Assinado
- Arquivado
- Vencido
- Cancelado

## Coleções Firestore criadas

- `smartDocuments`
- `smartTemplates`
- `smartDocumentVersions`
- `digitalSignatures`
- `approvalFlows`
- `auditLogs`
- `qrValidationLinks`

## Pastas criadas no Storage

Os arquivos são salvos em:

- `documentos-inteligentes/checklist-eletrico`
- `documentos-inteligentes/apr-digital`
- `documentos-inteligentes/pt-eletrica`
- `documentos-inteligentes/loto-digital`
- `documentos-inteligentes/laudo-ensaios`
- `documentos-inteligentes/designacao-pie`
- `documentos-inteligentes/autorizacao-nr10`
- `documentos-inteligentes/controle-epi-epc`
- `documentos-inteligentes/evidencias-tag`

## Plano de ação automático

Os modelos abaixo geram item automático na aba **Plano de Ação**:

- Checklist Inteligente de Inspeção Elétrica
- Registro Inteligente de Evidências por TAG

O item criado inclui recomendação, responsável, prazo, prioridade e vínculo com o documento inteligente original.

## Validação por QR Code

Ao gerar o PDF final, o sistema cria:

- PDF final no Storage
- Hash SHA-256 do documento
- Registro de versão
- Registro de auditoria
- Link de validação na rota `/validar-documento/:validationId`
- QR Code exibido no card do documento

## Observação sobre assinatura

A assinatura na tela serve para ciência, aprovação interna e rastreabilidade dentro do sistema.

Para documentos técnicos conclusivos, ART/TRT, laudos finais ou documentos exigidos por fiscalização externa, recomenda-se manter também assinatura GOV.BR, ICP-Brasil ou certificado profissional aplicável.
