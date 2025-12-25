import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const MIGRATION_KEY = 'nomos.auth.migrated';
const OLD_DEVICE_KEY = 'nomos.device.id';
const OLD_FLASHCARDS_MIGRATION_KEY = 'nomos.flashcards.migrated';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto sign-in anonymously on first visit
  const ensureAuthenticated = useCallback(async () => {
    try {
      // Check if already authenticated
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        setIsLoading(false);
        return existingSession.user;
      }

      // Sign in anonymously for new users
      console.log('[useAuth] No session found, signing in anonymously...');
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('[useAuth] Anonymous sign-in failed:', error);
        setIsLoading(false);
        return null;
      }

      if (data.user) {
        console.log('[useAuth] Anonymous sign-in successful:', data.user.id);
        setSession(data.session);
        setUser(data.user);
        
        // Clean up old device-based auth data
        localStorage.removeItem(OLD_DEVICE_KEY);
        localStorage.removeItem(OLD_FLASHCARDS_MIGRATION_KEY);
        localStorage.setItem(MIGRATION_KEY, 'true');
      }

      setIsLoading(false);
      return data.user;
    } catch (error) {
      console.error('[useAuth] Error during authentication:', error);
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // If signed out, auto sign-in again
        if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            ensureAuthenticated();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    ensureAuthenticated();

    return () => subscription.unsubscribe();
  }, [ensureAuthenticated]);

  return {
    user,
    session,
    isLoading,
    userId: user?.id ?? null,
    isAuthenticated: !!user,
  };
}
