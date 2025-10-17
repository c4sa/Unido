import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';
import mainLogo from '../main_logo.svg';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) throw signInError;

      // Successful login - navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-lg border-0 min-h-[600px]">
          <CardHeader className="pb-8 pt-8">
            {/* Header with Logo */}
            <div className="flex items-center justify-center mb-8">
              <img src={mainLogo} alt="UNIConnect Logo" className="w-80 h-auto" />
          </div>

            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: '#0064b0' }}>Welcome to UNIConnect</h2>
              <p className="text-gray-600">Sign in to continue</p>
          </div>

            {/* Separator */}
            <div className="border-t border-gray-200 mt-6"></div>
            </CardHeader>

            <CardContent className="space-y-8 px-8 pb-8">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 text-center">{error}</p>
                </div>
              )}

            {/* Simple Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-6">
                        <div className="space-y-2">
                <Label htmlFor="email" className="font-medium" style={{ color: '#0064b0' }}>Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="your@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10 h-12"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                <Label htmlFor="password" className="font-medium" style={{ color: '#0064b0' }}>Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="password"
                              type="password"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-10 h-12"
                              required
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-14 text-base font-medium text-white"
                style={{ backgroundColor: '#0064b0' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0052a3'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0064b0'}
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Signing in...
                            </>
                          ) : (
                  'Sign in'
                          )}
                        </Button>
                      </form>

            {/* Action Links */}
            <div className="flex justify-between text-sm">
              <span className="hover:underline cursor-pointer" style={{ color: '#0064b0' }}>Forgot password?</span>
              <span className="text-gray-600">
                Need an account? <span className="hover:underline cursor-pointer" style={{ color: '#0064b0' }}>Check</span>
              </span>
              </div>
            </CardContent>
          </Card>

        {/* Footer Security Message */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">Protected by enterprise-grade security</p>
        </div>
      </div>
    </div>
  );
}

