import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Demo mode - bypass authentication if no real credentials are provided
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.VITE_SUPABASE_URL.includes('your-project') ||
  import.meta.env.VITE_SUPABASE_ANON_KEY.includes('your-supabase-anon-key');

const supabase = isDemoMode ? null : createClient(supabaseUrl, supabaseKey);

// Debug logging
if (!isDemoMode) {
  console.log('Supabase initialized with URL:', supabaseUrl);
  console.log('Supabase key configured:', supabaseKey ? 'Yes' : 'No');
} else {
  console.log('Running in demo mode - Supabase authentication disabled');
}

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode - start with no user (show landing page)
      setUser(null);
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name,
              avatar_url: session.user.user_metadata?.avatar_url,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, []);

  const signInWithGoogle = async () => {
    if (isDemoMode) {
      // Demo mode - simulate successful login
      setUser({
        id: 'demo-user-123',
        email: 'demo@telesync.com',
        name: 'Demo User',
        avatar_url: undefined,
      });
      return;
    }

    try {
      if (!supabase) throw new Error('Supabase not initialized');
      
      console.log('Attempting Google OAuth sign in...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
      
      console.log('Google OAuth initiated successfully:', data);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (isDemoMode) {
      // Demo mode - simulate successful login
      setUser({
        id: 'demo-user-123',
        email: email,
        name: 'Demo User',
        avatar_url: undefined,
      });
      return;
    }

    try {
      if (!supabase) throw new Error('Supabase not initialized');
      
      console.log('Attempting email/password sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Email/password sign in error:', error);
        throw error;
      }
      
      console.log('Email/password sign in successful:', data);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (isDemoMode) {
      // Demo mode - simulate successful signup
      setUser({
        id: 'demo-user-123',
        email: email,
        name: 'Demo User',
        avatar_url: undefined,
      });
      return;
    }

    try {
      if (!supabase) throw new Error('Supabase not initialized');
      
      console.log('Attempting email/password sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) {
        console.error('Email/password sign up error:', error);
        throw error;
      }
      
      console.log('Email/password sign up successful:', data);
      console.log('User:', data.user);
      console.log('Session:', data.session);
      
      // If user is immediately confirmed (no email confirmation required)
      if (data.user && data.session) {
        console.log('User and session found, setting user state');
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name,
          avatar_url: data.user.user_metadata?.avatar_url,
        });
      } else if (data.user) {
        // User created but no session yet - try to sign in immediately
        console.log('User created but no session, attempting immediate sign in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        console.log('Sign in result:', signInData);
        console.log('Sign in error:', signInError);
        
        if (signInData.user && signInData.session) {
          console.log('Sign in successful, setting user state');
          setUser({
            id: signInData.user.id,
            email: signInData.user.email || '',
            name: signInData.user.user_metadata?.full_name,
            avatar_url: signInData.user.user_metadata?.avatar_url,
          });
        } else {
          console.log('Sign in failed, user may need to sign in manually');
        }
      } else {
        console.log('No user returned from signup');
      }
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      // Demo mode - simulate logout
      setUser(null);
      return;
    }

    try {
      if (!supabase) throw new Error('Supabase not initialized');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
