import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, supabase } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Globe, Users, Calendar, MessageSquare, MapPin, Mail, Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [emailPasswordMode, setEmailPasswordMode] = useState('signin'); // 'signin' or 'signup'
  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      await User.signInWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!emailForm.email || !emailForm.password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailForm.email,
        password: emailForm.password,
      });

      if (signInError) throw signInError;

      // Successful login - navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Email sign in error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!emailForm.email || !emailForm.password || !emailForm.confirmPassword || !emailForm.fullName) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (emailForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (emailForm.password !== emailForm.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailForm.email,
        password: emailForm.password,
        options: {
          data: {
            full_name: emailForm.fullName,
          }
        }
      });

      if (signUpError) throw signUpError;

      // Check if email confirmation is required
      if (data?.user && !data.session) {
        setError(null);
        alert('Account created! Please check your email to confirm your account before signing in.');
        setEmailPasswordMode('signin');
        setEmailForm({ email: emailForm.email, password: '', confirmPassword: '', fullName: '' });
      } else if (data?.session) {
        // Auto signed in
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Email sign up error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      setLoading(false);
    }
    setLoading(false);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding & Features */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">UNIConnect</h1>
                <p className="text-gray-600">Professional Networking Platform</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Connect with Global Professionals
            </h2>
            <p className="text-gray-600 text-lg">
              A secure platform designed for diplomats, government officials, and international delegates to connect, schedule meetings, and collaborate.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Browse Delegates</h3>
                  <p className="text-sm text-gray-600">Find and connect with professionals worldwide</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Schedule Meetings</h3>
                  <p className="text-sm text-gray-600">Request and manage professional meetings</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Real-time Chat</h3>
                  <p className="text-sm text-gray-600">Instant messaging with participants</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Venue Booking</h3>
                  <p className="text-sm text-gray-600">Reserve meeting rooms effortlessly</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Shield className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">
              <strong className="text-gray-900">Secure & Private:</strong> Enterprise-grade security with Google OAuth authentication
            </p>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader className="space-y-4 pb-8">
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">UNIConnect</h1>
                </div>
              </div>

              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                <CardDescription className="text-base">
                  Sign in to access your professional network
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 text-center">{error}</p>
                </div>
              )}

              <Tabs defaultValue="google" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="google">Google OAuth</TabsTrigger>
                  <TabsTrigger value="email">Email/Password</TabsTrigger>
                </TabsList>

                {/* Google OAuth Tab */}
                <TabsContent value="google" className="space-y-4">
                  <div className="text-center text-sm text-gray-600 mb-4">
                    Recommended: Sign in with your Google account
                  </div>
                  
                  <Button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-12 text-base bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400 shadow-sm"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-3"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign in with Google
                      </>
                    )}
                  </Button>

                  <div className="text-center text-xs text-gray-500 mt-4">
                    <Shield className="w-4 h-4 inline mr-1 text-green-600" />
                    No password needed • Secure OAuth 2.0
                  </div>
                </TabsContent>

                {/* Email/Password Tab */}
                <TabsContent value="email" className="space-y-4">
                  <Tabs value={emailPasswordMode} onValueChange={setEmailPasswordMode} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="signin">Sign In</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>

                    {/* Sign In Form */}
                    <TabsContent value="signin">
                      <form onSubmit={handleEmailSignIn} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="your.email@example.com"
                              value={emailForm.email}
                              onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="password"
                              type="password"
                              placeholder="••••••••"
                              value={emailForm.password}
                              onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Signing in...
                            </>
                          ) : (
                            'Sign In'
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    {/* Sign Up Form */}
                    <TabsContent value="signup">
                      <form onSubmit={handleEmailSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name</Label>
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="John Doe"
                            value={emailForm.fullName}
                            onChange={(e) => setEmailForm({ ...emailForm, fullName: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="your.email@example.com"
                              value={emailForm.email}
                              onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="signup-password"
                              type="password"
                              placeholder="••••••••"
                              value={emailForm.password}
                              onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                              className="pl-10"
                              required
                              minLength={6}
                            />
                          </div>
                          <p className="text-xs text-gray-500">Minimum 6 characters</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="confirm-password"
                              type="password"
                              placeholder="••••••••"
                              value={emailForm.confirmPassword}
                              onChange={(e) => setEmailForm({ ...emailForm, confirmPassword: e.target.value })}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating account...
                            </>
                          ) : (
                            'Create Account'
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Secure authentication</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Your data is protected and secure</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Trusted by diplomats worldwide</span>
                </div>
              </div>

              <div className="pt-4 text-center">
                <p className="text-xs text-gray-500">
                  By signing in, you agree to our{' '}
                  <span className="text-blue-600 hover:underline cursor-pointer">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policy</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

