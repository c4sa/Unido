import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/api/entities';
import { Shield } from 'lucide-react';
import PasswordResetModal from '@/components/auth/PasswordResetModal';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authenticated = !!session;
      setIsAuthenticated(authenticated);

      // If authenticated, check if password reset is needed
      if (authenticated && session.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('is_password_reset')
          .eq('id', session.user.id)
          .single();

        if (!profileError && !userProfile?.is_password_reset) {
          setNeedsPasswordReset(true);
        }
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show password reset modal if needed
  if (needsPasswordReset) {
    return (
      <PasswordResetModal 
        onPasswordReset={() => {
          setNeedsPasswordReset(false);
          // Force re-check auth state
          checkAuth();
        }} 
      />
    );
  }

  // Render protected content if authenticated and password reset not needed
  return children;
}

