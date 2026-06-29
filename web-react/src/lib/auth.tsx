import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';

type AuthCtx = {
  user: any; company: any; ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};
const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.me().then((d) => { setUser(d.user); setCompany(d.company); })
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    setToken(r.token);
    const me = await api.me();
    setUser(me.user); setCompany(me.company);
  };
  const logout = () => { clearToken(); setUser(null); setCompany(null); };

  return <Ctx.Provider value={{ user, company, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
