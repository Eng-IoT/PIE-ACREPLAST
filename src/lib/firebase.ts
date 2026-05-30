import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, uploadBytes, StorageReference } from 'firebase/storage';

const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('Variáveis de ambiente do Firebase ausentes:', missingEnvVars);
  throw new Error(
    `Configuração do Firebase incompleta. Verifique o arquivo .env.local. Variáveis ausentes: ${missingEnvVars.join(', ')}`
  );
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || undefined,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const login = signInWithEmailAndPassword;
export const logout = signOut;
export const storage = getStorage(app);

export const ADMIN_EMAILS = ['jmm.engiot@gmail.com'];

export function isBootstrapAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export const uploadWithRetry = async (
  storageRef: StorageReference,
  file: File,
  retries = 3
) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await uploadBytes(storageRef, file);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw new Error('Falha ao enviar arquivo para o Firebase Storage.');
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function getFriendlyFirebaseError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  const message = error instanceof Error ? error.message : String(error);

  if (
    code.includes('permission-denied') ||
    message.toLowerCase().includes('permission')
  ) {
    return 'Sem permissão para salvar. Entre com uma conta administradora e confirme se as regras do Firestore/Storage foram publicadas.';
  }

  if (
    code.includes('unauthenticated') ||
    message.toLowerCase().includes('auth')
  ) {
    return 'Usuário não autenticado. Faça login novamente e tente salvar.';
  }

  if (
    message.toLowerCase().includes('offline') ||
    message.toLowerCase().includes('network')
  ) {
    return 'Falha de conexão com o Firebase. Verifique a internet e tente novamente.';
  }

  return 'Não foi possível concluir a operação no Firebase. Verifique o console do navegador para mais detalhes.';
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    code:
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : undefined,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error('Firebase Error:', errInfo);
  return errInfo;
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'connection', 'test'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.toLowerCase().includes('offline')) {
      console.error('Verifique sua configuração/conexão com o Firebase.');
    } else {
      console.warn(
        'Teste de conexão do Firebase não retornou leitura autorizada. Isso não impede o app de funcionar se as demais regras estiverem corretas.'
      );
    }
  }
}

// Teste desativado para evitar avisos no console durante o desenvolvimento.
// Ative manualmente se precisar diagnosticar conexão com o Firestore.
// testConnection();