<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0960281c-62fc-4e7b-9d94-ad148d8450f1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Modo PWA

O projeto está configurado como PWA para instalação em Android, iOS e desktop.

Recursos ativados:

- Ícone na tela inicial.
- Nome do aplicativo: **PIE ACREPLAST NR-10**.
- Abertura em modo standalone/tela cheia quando instalado.
- Splash screen de inicialização.
- Service Worker com cache parcial.
- Página offline.
- Aviso visual de modo offline.
- `vercel.json` com fallback para React Router e cabeçalhos do Service Worker.

Para testar:

```bash
npm install
npm run build
npm run preview
```

Depois abra `http://localhost:4173` e confira no DevTools > Application.

Mais detalhes: `GUIA-PWA-INSTALACAO.md`.

