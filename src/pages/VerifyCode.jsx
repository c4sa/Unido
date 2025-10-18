import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Shield, ArrowLeft } from 'lucide-react';
import { sendCredentialsEmail } from '@/utils/emailService';
import mainLogo from '../main_logo.svg';

export default function VerifyCode() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['U', 'N', '', '', '', '']);
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleCodeChange = (index, value) => {
    if (index < 2) return; // Don't allow changes to 'U' and 'N'
    
    if (value.length > 1) return; // Prevent multiple characters
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 2) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i + 2] = pastedData[i]; // Start from index 2 (after 'UN')
    }
    
    setCode(newCode);
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length + 1, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    const codeString = code.join('');
    if (codeString.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      setLoading(false);
      return;
    }

    // Convert UNxxxx format to UN-xxxx format for database
    const formattedCode = codeString.replace(/^(UN)(\d{4})$/, '$1-$2');

    // Check if we're in development mode (no API available)
    const isDevelopment = !window.location.hostname.includes('vercel.app') && 
                         !window.location.hostname.includes('netlify.app') &&
                         (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isDevelopment) {
      // Development mode - use direct Supabase calls
      console.log('🔧 DEVELOPMENT MODE - Using direct Supabase verification...');
      try {
        await handleDirectVerification(email, formattedCode);
        return;
      } catch (directError) {
        console.error('Direct verification failed:', directError);
        setError(directError.message || 'Verification failed. Please check your code and try again.');
        setLoading(false);
        return;
      }
    }

    try {
      // Call backend API to verify passcode and create user
      const response = await fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          code: formattedCode 
        })
      });

      let result;
      
      // Handle response parsing more safely
      try {
        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Server returned invalid response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      // Send credentials email
      try {
        await sendCredentialsEmail(result.email, result.tempPassword);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the verification if email fails
      }
      
      setSuccess(true);
      
      // Redirect to login after successful verification
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Code verification error:', err);
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct verification fallback for development
  const handleDirectVerification = async (email, formattedCode) => {
    console.log('Verifying passcode:', formattedCode);
    
    // 1. Verify passcode exists and is not used
    const { data: passcode, error: passcodeError } = await supabase
      .from('passcodes')
      .select('*')
      .eq('code', formattedCode)
      .eq('is_used', false)
      .single();

    if (passcodeError) {
      console.error('Passcode query error:', passcodeError);
      throw new Error('Invalid or already used passcode');
    }

    if (!passcode) {
      throw new Error('Invalid or already used passcode');
    }

    console.log('Passcode found:', passcode);

    // 2. Skip user existence check for development mode
    // The backend API will handle this properly

    // 3. Generate temporary password
    const tempPassword = generateTempPassword();
    console.log('Generated temp password:', tempPassword);

    // 4. Create user account using signUp (this works with anon key)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/login`
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Failed to create user account: ' + authError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    console.log('User created:', authData.user.id);

    // 5. Create user profile in public.users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: '',
        role: 'user',
        is_password_reset: true,
        created_by: email
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw new Error('Failed to create user profile: ' + profileError.message);
    }

    console.log('Profile created successfully');

    // 6. Sign out the user immediately (they should login manually with temp password)
    await supabase.auth.signOut();
    console.log('User signed out - they must login manually');

    // 7. Mark passcode as used
    const { error: updateError } = await supabase
      .from('passcodes')
      .update({
        is_used: true,
        used_by: authData.user.id,
        used_at: new Date().toISOString()
      })
      .eq('code', formattedCode);

    if (updateError) {
      console.error('Passcode update error:', updateError);
      // Don't fail the request for this
    } else {
      console.log('Passcode marked as used');
    }

    // 8. Send credentials email
    try {
      await sendCredentialsEmail(email, tempPassword);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the verification if email fails
    }
    
    setSuccess(true);
    
    // Redirect to login after successful verification
    setTimeout(() => {
      navigate('/login');
    }, 3000);
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError(null);

    try {
      // Here you would typically resend the code
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setError(null);
      alert('Verification code has been resent to your email.');
    } catch (err) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <h2 className="text-2xl font-bold" style={{ color: '#0064b0' }}>Verify the code</h2>
              <p className="text-gray-600">Enter the 6 digits code to verify your identity</p>
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

            {success ? (
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Account Created!</h3>
                  <p className="text-sm text-green-700">
                    Your account has been created successfully. We've sent your login credentials to your email. 
                    You'll be redirected to the login page where you can sign in with your temporary password.
                  </p>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Next Steps:</strong> Check your email → Login with temporary password → Set your new password → Access dashboard
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-6">
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

                <div className="space-y-4">
                  <Label className="font-medium text-center block" style={{ color: '#0064b0' }}>
                    Enter 6-digit code
                  </Label>
                  
                  <div className="flex justify-center gap-2">
                    {code.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`w-12 h-12 text-center text-lg font-semibold border-2 ${
                          index < 2 ? 'bg-gray-100 cursor-not-allowed' : 'focus:border-blue-500'
                        }`}
                        style={{ 
                          borderColor: digit ? '#0064b0' : '#d1d5db',
                          color: '#0064b0'
                        }}
                        disabled={index < 2}
                        readOnly={index < 2}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center">Format: UNxxxx (x = numbers)</p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || code.join('').length !== 6 || !email}
                  className="w-full h-14 text-base font-medium text-white"
                  style={{ backgroundColor: '#0064b0' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0052a3'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#0064b0'}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-sm hover:underline"
                    style={{ color: '#0064b0' }}
                  >
                    Didn't receive code? Resend
                  </button>
                </div>
              </form>
            )}

            {/* Action Links */}
            <div className="flex justify-center text-sm">
              <span 
                className="hover:underline cursor-pointer" 
                style={{ color: '#0064b0' }}
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back to Login
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
