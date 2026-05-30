# PIE Digital NR-10 — Guia dos módulos acrescentados

Este pacote foi otimizado para GitHub e Vercel, usando Firebase Auth, Firestore e Storage por variáveis de ambiente.

## Novas abas adicionadas ao menu

1. **Documentos NR-10** — coleção `nr10Documents`, pasta Storage `documentos-obrigatorios-nr10`.
2. **Ensaios Elétricos** — coleção `electricalTestReports`, pasta Storage `laudos-ensaios-eletricos`.
3. **Laudos NR-12** — coleção `nr12Reports`, pasta Storage `laudos-nr12`.
4. **Inspeções Elétricas** — coleção `electricalInspections`, pasta Storage `inspecoes-eletricas`.
5. **EPI/EPC/Ferramental** — coleção `ppeTools`, pasta Storage `epi-epc-ferramental`.
6. **Procedimentos NR-10** — coleção `procedures`, pasta Storage `procedimentos-nr10`.
7. **Áreas Classificadas** — coleção `classifiedAreas`, pasta Storage `areas-classificadas`.
8. **Relatório Consolidado** — coleção `technicalReports`, pasta Storage `relatorios-tecnicos-consolidados`.

Cada aba possui:

- formulário técnico;
- status do registro;
- busca;
- filtro por status;
- upload de anexos no Firebase Storage;
- gravação automática no Firestore;
- rastreio do e-mail do usuário que cadastrou;
- exclusão do registro e do arquivo vinculado quando possível.

## Arquivos principais alterados

- `src/components/ComplianceModule.tsx` — componente reutilizável dos novos módulos.
- `src/pages/moduleConfigs.ts` — configurações técnicas de cada aba.
- `src/App.tsx` — novas rotas.
- `src/components/Sidebar.tsx` — novos itens de menu.
- `firestore.rules` — permissão para as novas coleções.
- `storage.rules` — mantém escrita somente para admin e leitura para autenticados.

## Variáveis de ambiente

Crie `.env.local` no VS Code com base em `.env.example`.

Não envie `.env.local` para o GitHub.

## Rodar localmente

```bash
npm install
npm run dev
```

## Testar build antes do deploy

```bash
npm run lint
npm run build
```

## Publicar regras no Firebase

```bash
npm run deploy:rules
```

Ou manualmente no console do Firebase:

- Firestore > Regras > Publicar `firestore.rules`.
- Storage > Regras > Publicar `storage.rules`.

## Vercel

Cadastre as variáveis do `.env.local` em:

`Project > Settings > Environment Variables`

Depois faça redeploy.
