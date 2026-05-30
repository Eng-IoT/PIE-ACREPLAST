# Correção do tema claro

Esta versão corrige o problema de contraste em que textos permaneciam claros/brancos ao alternar o aplicativo para o modo claro.

## Ajustes realizados

- Aplicação persistente do tema em `localStorage` usando a chave `pie-theme`.
- Aplicação antecipada do tema no `index.html`, antes do React carregar, evitando tela piscando no tema errado.
- Correção de variáveis CSS do modo claro.
- Ajustes de contraste para textos de status, botões, cards, formulários, selects e placeholders.
- Preservação do contraste de botões primários com fundo laranja/ciano.
- Atualização dinâmica da `theme-color` para Android/iOS/PWA.

## Validação

Foram executados com sucesso:

```bash
npm run lint
npm run build
```

## Observação

Se o app já estiver instalado como PWA no smartphone, após subir esta versão na Vercel recomenda-se fechar o app, abrir novamente e, se necessário, atualizar/limpar cache para receber o novo Service Worker.
