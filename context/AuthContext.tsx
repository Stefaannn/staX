"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface GameEntry { name: string; mode: '4fun' | 'ranked'; }

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  discordTag: string;
  games: GameEntry[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUser(null); setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, discord_tag, games')
      .eq('id', session.user.id)
      .single();

    setUser({
      userId: session.user.id,
      email: session.user.email ?? '',
      username: profile?.username ?? '',
      discordTag: profile?.discord_tag ?? '',
      games: profile?.games ?? [],
    });
    setLoading(false);
  };

  useEffect(() => { fetchUser(); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
