# Correções da auditoria — 04/08/2026

## Entregue nesta versão

- Conformidade vazia deixou de ser exibida como 100%.
- Dashboard exibe `N/C — dados insuficientes` enquanto não houver itens avaliados.
- Estados de conformidade centralizados: conforme, não conforme, pendente, não avaliado e não aplicável.
- Estados e prioridades legados normalizados para manter compatibilidade com dados já existentes.
- Plano de ação considera somente itens abertos e alerta também ações vencidas.
- Contagem de documentos consolidada entre os módulos técnicos.
- ART/TRT anexada em Dados do Cliente aparece automaticamente no módulo TRT/ART.
- Checklist padrão NR-10 com 15 requisitos pode ser inicializado pelo administrador.
- Gráfico do checklist diferencia conforme, não conforme e pendente/não avaliado.
- Automação deixa de duplicar notificações com a mesma chave.
- Regra de notificações limita a edição por leitores aos campos de leitura.
- Storage limita uploads a 20 MB e aos tipos documentais aceitos.
- Textos `files`, `itens` e `Ñ Conforme` foram corrigidos no dashboard.

## Publicação necessária

Depois do deploy do aplicativo, publique também as regras atualizadas:

```bash
npm run deploy:rules
```

No primeiro acesso administrativo, abra **Checklist NR-10** e clique em
**Inicializar checklist padrão NR-10**. Todos os requisitos começarão como
**Não avaliado**, sem produzir percentual falso.

## Validações executadas

- `npm run lint`
- `npm run build`

Ambas concluídas sem erros.
