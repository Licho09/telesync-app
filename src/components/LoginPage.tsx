import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      toast.success('Redirecting to Google...');
    } catch (error) {
      toast.error('Failed to sign in with Google');
      console.error('Google login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      if (isSignUp) {
        await signUpWithEmail(email, password);
        toast.success('Account created! Please check your email and click the confirmation link to complete signup.');
      } else {
        await signInWithEmail(email, password);
        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
      console.error('Email auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to home</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">TeleSync</span>
          </div>
        </div>

        <h2 className="mt-8 text-center text-2xl font-semibold text-gray-900">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSignUp ? 'Join TeleSync and start automating your downloads' : 'Start automating your Telegram downloads'}
        </p>
        
        {/* Demo Mode Indicator */}
        {(!import.meta.env.VITE_SUPABASE_URL || 
          import.meta.env.VITE_SUPABASE_URL.includes('your-project') ||
          import.meta.env.VITE_SUPABASE_ANON_KEY.includes('your-supabase-anon-key')) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              🎯 <strong>Demo Mode:</strong> Click any button to enter the dashboard
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              To enable real authentication, configure your Supabase keys in .env
            </p>
          </div>
        )}
        
        {/* Real Mode Indicator */}
        {import.meta.env.VITE_SUPABASE_URL && 
         !import.meta.env.VITE_SUPABASE_URL.includes('your-project') &&
         !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('your-supabase-anon-key') && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 text-center">
              ✅ <strong>Real Authentication:</strong> Supabase configured
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
          <div className="space-y-6">
            <form onSubmit={handleEmailAuth} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your email..."
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password..."
                />
              </div>

              {/* Sign In/Up Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (isSignUp ? 'Creating...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign in')}
                </button>
              </div>

              {/* Toggle Sign Up/Sign In */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* Google Sign In */}
            <div>
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              By clicking the buttons above, you acknowledge that you have read,
              <br />
              understood, and agree to TeleSync's{' '}
              <a href="#" className="text-gray-800 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-gray-800 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* First time notice */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              First time?{' '}
              <a href="#" className="text-gray-800 hover:underline">
                Learn more at telesync.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;