import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  fetchMeApi,
  getStoredToken,
  getStoredUser,
  loginApi,
  registerApi,
} from '../lib/api';
import type { AuthUser } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (params: {
    name: string;
    surname: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    phone: string;
    userType: 'LANDLORD' | 'TENANT';
  }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => Boolean(getStoredToken()));

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;
    fetchMeApi()
      .then((freshUser) => {
        if (!cancelled) setUser(freshUser);
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await loginApi(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(
    async (params: {
      name: string;
      surname: string;
      email: string;
      password: string;
      passwordConfirmation: string;
      phone: string;
      userType: 'LANDLORD' | 'TENANT';
    }) => {
      const created = await registerApi(params);
      setUser(created);
      return created;
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && getStoredToken()),
        isBootstrapping,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
