import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSupabase } from '@/src/lib/supabase';
import { debugLog, debugError } from '@/src/lib/debug';

export const DebugManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // 1. Navigation Logger
  useEffect(() => {
    debugLog('NAVIGATION', `User navigated to ${location.pathname}${location.search}`);
  }, [location]);

  // 2. Auth State Logger
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const userInfo = user ? { id: user.id, email: user.email } : 'No User';
      
      debugLog('AUTH', `Auth state changed: ${event}`, userInfo);
    });

    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        debugLog('AUTH', `Initial auth check: SIGNED_IN`, { id: user.id, email: user.email });
      } else {
        debugLog('AUTH', `Initial auth check: SIGNED_OUT`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Global Error Listener (for uncaught errors outside React)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      debugError('GLOBAL-ERROR', `Uncaught exception: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      debugError('GLOBAL-ERROR', `Unhandled promise rejection`, event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <>{children}</>;
};
