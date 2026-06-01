# Correção — Anexo de Relatório de Medição em SPDA e Aterramento

## O que foi corrigido

A aba **SPDA e Aterramento** agora permite anexar o relatório de medição diretamente no cadastro da medição.

## Funcionalidades adicionadas

- Campo **Anexar relatório** no formulário de novo relatório de medição.
- Upload para o Firebase Storage na pasta:

```txt
spda-aterramento/relatorios-medicao
```

- Salvamento do link do arquivo no Firestore, na coleção:

```txt
spdaReports
```

- Exibição do status **Relatório anexado** ou **Sem anexo** na lista.
- Botão para abrir/baixar o relatório cadastrado.
- Salvamento de metadados:
  - `fileName`
  - `filePath`
  - `url`
  - `createdAt`
  - `createdBy`
  - `createdByEmail`

## Arquivo alterado

```txt
src/components/SpdaAterramento.tsx
```

## Testes realizados

```bash
npm run lint
npm run build
```

Os dois comandos passaram com sucesso.
