import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, isBootstrapAdminEmail } from '../lib/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

type Role = 'admin' | 'reader';

type AuthContextType = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true, isAdmin: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);

      if (!u) {
        setRole(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', u.uid);
      const isBootstrapAdmin = isBootstrapAdminEmail(u.email);
      const fallbackRole: Role = isBootstrapAdmin ? 'admin' : 'reader';

      try {
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || '',
            role: fallbackRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setRole(fallbackRole);
          return;
        }

        const storedRole = userDoc.data()?.role === 'admin' ? 'admin' : 'reader';
        const resolvedRole: Role = isBootstrapAdmin ? 'admin' : storedRole;

        if (isBootstrapAdmin && storedRole !== 'admin') {
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || '',
            role: 'admin',
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        setRole(resolvedRole);
      } catch (error) {
        console.error('Erro ao carregar/criar perfil do usuário:', error);
        setRole(fallbackRole);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  return <AuthContext.Provider value={{ user, role, loading, isAdmin: role === 'admin' }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
