# Guia PWA — PIE ACREPLAST NR-10

Este projeto foi configurado como PWA para funcionar como aplicativo web instalável em Android, iOS e desktop.

## Recursos ativados

- Ícone na tela inicial.
- Nome do aplicativo: **PIE ACREPLAST NR-10**.
- Abertura em modo `standalone`, sem a barra do navegador quando instalado.
- Splash screen de inicialização.
- Manifest completo em `public/manifest.webmanifest`.
- Service Worker em `public/sw.js`.
- Página offline em `public/offline.html`.
- Cache parcial do app shell para abrir a interface principal mesmo sem internet.
- Aviso visual quando o app estiver offline.
- Botão de instalação no Android/Chrome/Edge quando o navegador liberar o evento de instalação.
- Orientação para instalação manual em iPhone/iPad pelo Safari.

## Arquivos principais

```txt
public/manifest.webmanifest
public/manifest.json
public/sw.js
public/offline.html
public/icons/
src/lib/registerServiceWorker.ts
src/components/PwaInstallPrompt.tsx
src/main.tsx
index.html
```

## Como testar no VS Code

```bash
npm install
npm run dev
```

Abra:

```txt
http://localhost:5173
```

Para teste completo de PWA, use também o build:

```bash
npm run build
npm run preview
```

Abra:

```txt
http://localhost:4173
```

## Como testar no Chrome

1. Abra o app.
2. Pressione `F12`.
3. Vá em **Application**.
4. Confira:
   - Manifest.
   - Service Workers.
   - Cache Storage.
5. No Lighthouse, rode uma auditoria PWA.

## Como instalar no Android

1. Abra a URL da Vercel no Chrome.
2. Toque no botão **Instalar aplicativo**, se aparecer.
3. Ou toque nos três pontos do Chrome.
4. Escolha **Adicionar à tela inicial**.

## Como instalar no iPhone/iPad

1. Abra a URL da Vercel no Safari.
2. Toque no botão de compartilhar.
3. Escolha **Adicionar à Tela de Início**.
4. Confirme o nome **PIE NR-10**.

## Importante sobre modo offline

O modo offline é parcial. Ele mantém a interface principal em cache depois do primeiro acesso, mas os recursos abaixo precisam de internet:

- Login no Firebase Authentication.
- Leitura e gravação no Firestore.
- Upload e download de arquivos no Firebase Storage.
- Geração de dados que dependam da nuvem.

## Depois de subir na Vercel

Na Vercel, faça novo deploy normalmente. Depois teste:

```txt
https://seu-projeto.vercel.app
```

O HTTPS da Vercel é obrigatório para instalação PWA em produção.
