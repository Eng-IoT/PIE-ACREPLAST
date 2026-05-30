# Correção do salvamento no Firebase

## Diagnóstico

O aplicativo estava autenticando o usuário, mas as regras do Firestore permitem gravação apenas para administrador. Se o documento do usuário não existir em `/users/{uid}`, o app assume o papel `reader` e as gravações em coleções como `clientData`, `documents`, `workers`, `actionPlan`, `checklistItems`, `settings`, `trt-art`, `laudos`, `relatorios`, `spdaReports` e `electrical-projects` podem ser bloqueadas por `permission-denied`.

Também havia um risco nas regras antigas: qualquer usuário autenticado poderia criar ou alterar o próprio documento em `/users/{uid}` e definir `role: "admin"`. Isso foi corrigido.

## O que foi ajustado

1. `src/components/AuthContext.tsx`
   - Cria automaticamente o perfil do usuário no Firestore quando ele faz login.
   - O e-mail `jmm.engiot@gmail.com` é reconhecido como administrador inicial.
   - Usuários novos entram como `reader`, sem permissão de escrita.

2. `src/lib/firebase.ts`
   - Usa `getAuth(app)` para vincular o Auth ao app Firebase correto.
   - Melhorou o tratamento de erro para não quebrar a tela quando o Firebase nega uma operação.
   - Adicionou identificação amigável para erros de permissão, autenticação e conexão.

3. `firestore.rules`
   - Escrita nas coleções principais somente para admin.
   - Leitura liberada para usuários autenticados.
   - Corrigida a regra de `/users/{uid}` para impedir que qualquer usuário se promova para admin.
   - Adicionada permissão de leitura para `/connection/test`, usado no teste de conexão do app.

4. `storage.rules`
   - Arquivos do Storage podem ser lidos por usuários autenticados.
   - Upload, alteração e exclusão de arquivos somente por admin.

5. `firebase.json`
   - Adicionado para facilitar o deploy das regras do Firestore e Storage.

## Passos obrigatórios no Firebase

Depois de subir o código, publique as regras:

```bash
npm install
npm run deploy:rules
```

Ou use diretamente:

```bash
firebase deploy --only firestore:rules,storage
```

Se preferir pelo painel do Firebase:

1. Acesse **Firestore Database > Rules**.
2. Cole o conteúdo de `firestore.rules`.
3. Clique em **Publish**.
4. Acesse **Storage > Rules**.
5. Cole o conteúdo de `storage.rules`.
6. Clique em **Publish**.

## Verificação rápida

1. Entre no app com o e-mail `jmm.engiot@gmail.com`.
2. Abra o Firestore e confirme se foi criado o documento:

```txt
/users/{uid}
```

Com os campos principais:

```txt
email: "jmm.engiot@gmail.com"
role: "admin"
uid: "..."
```

3. Faça um teste salvando os **Dados do Cliente**.
4. Faça um teste enviando um documento em **Prontuário Técnico**.

Se salvar texto, mas não salvar arquivo, o problema estará nas regras do **Storage**, não do Firestore.
