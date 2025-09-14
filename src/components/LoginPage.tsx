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

  const handleQuickLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle(); // This will use demo mode
      toast.success('Welcome to TeleSync!');
    } catch (error) {
      toast.error('Failed to sign in');
      console.error('Login error:', error);
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
          Welcome to TeleSync
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Click below to access your dashboard
        </p>
        
        {/* Demo Mode Indicator */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            🎯 <strong>Demo Mode:</strong> Click the button below to enter the dashboard
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
          <div className="space-y-6">
            {/* Simple Login Button */}
            <div>
              <button
                onClick={handleQuickLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center px-6 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-6 h-6 mr-3" />
                {isLoading ? 'Entering Dashboard...' : 'Enter Dashboard'}
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