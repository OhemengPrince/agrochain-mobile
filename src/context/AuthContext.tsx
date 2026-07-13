import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '../types';
import { saveToken, saveUser, getToken, getUser, clearAll } from '../utils/storage';
import { registerAuthFailureHandler } from '../api/axios';
import { getMe } from '../api/userApi';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([getToken(), getUser()]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser); // show cached data immediately
          // Refresh from backend in background so profileImageUrl and other
          // server-side fields are always up to date after a cold start.
          getMe().then((fresh) => {
            if (!fresh) return;
            const merged = { ...storedUser, ...fresh };
            setUser(merged);
            saveUser(merged).catch(() => {});
          }).catch(() => {});
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newToken: string, newUser: User) => {
    await Promise.all([saveToken(newToken), saveUser(newUser)]);
    setToken(newToken);
    setUser(newUser);
    // Login response may not include profileImageUrl — fetch the full profile
    // from the backend immediately after token is saved so the photo appears
    // without the user having to re-upload it.
    getMe().then((fresh) => {
      if (!fresh) return;
      const merged = { ...newUser, ...fresh };
      setUser(merged);
      saveUser(merged).catch(() => {});
    }).catch(() => {});
  }, []);

  const updateUser = useCallback(async (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
    // Persist outside the setter so we're not calling async inside a sync callback.
    // We read the latest merged value by passing a functional update above, then
    // do the save here using the patch values we already have.
    getUser().then((stored) => {
      if (!stored) return;
      saveUser({ ...stored, ...patch }).catch(() => {});
    }).catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    // State-first: UI navigates away immediately, storage clears in background.
    // This makes logout work even when offline or when API calls are failing.
    console.log('[Auth] logout() called — resetting state immediately');
    setToken(null);
    setUser(null);
    clearAll().catch(() => {});
  }, []);

  // Wire the axios interceptor so 401/403 responses reset React auth state.
  // Storage is already cleared by the interceptor before this callback fires.
  useEffect(() => {
    registerAuthFailureHandler(() => {
      console.log('[Auth] Force-logout — interceptor cleared storage, resetting state now');
      setToken(null);
      setUser(null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
