import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { syncAll } from '../db/syncManager';
import { type User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on refresh
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Initialize sync on page load/restore
        syncAll();
      }
    });

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        const u = session?.user || null;
        setUser(u);
        setLoading(false);
        if (u) {
          // Initialize sync on sign-in
          syncAll();
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (u: User) => {
    setUser(u);
    syncAll();
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
