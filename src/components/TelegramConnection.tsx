import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Key, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { telegramService, TelegramSession } from '../services/telegramApiService';
import toast from 'react-hot-toast';

interface TelegramConnectionProps {
  onConnectionChange: (isConnected: boolean) => void;
}

const TelegramConnection: React.FC<TelegramConnectionProps> = ({ onConnectionChange }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<TelegramSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  // Connection form state
  const [connectionData, setConnectionData] = useState({
    apiId: '',
    apiHash: '',
    phone: ''
  });
  
  // Authentication form state
  const [authCode, setAuthCode] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadConnectionStatus();
    }
  }, [user?.id]);

  const loadConnectionStatus = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const status = await telegramService.getConnectionStatus(user.id);
      setSession(status);
      onConnectionChange(status.isConnected);
    } catch (error) {
      console.error('Error loading Telegram status:', error);
      toast.error('Failed to load Telegram connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.id) return;
    
    if (!connectionData.apiId || !connectionData.apiHash || !connectionData.phone) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setConnecting(true);
      const result = await telegramService.connect(user.id, connectionData);
      
      if (result.success) {
        toast.success('Telegram credentials saved! Please complete authentication.');
        setShowConnectionForm(false);
        setShowAuthForm(true);
        await loadConnectionStatus();
      } else {
        toast.error(result.message || 'Failed to connect to Telegram');
      }
    } catch (error) {
      console.error('Error connecting to Telegram:', error);
      toast.error('Failed to connect to Telegram');
    } finally {
      setConnecting(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!user?.id) return;
    
    if (!authCode) {
      toast.error('Please enter the authentication code');
      return;
    }

    try {
      setAuthenticating(true);
      const result = await telegramService.authenticate(user.id, authCode);
      
      if (result.success) {
        toast.success('Telegram authentication successful!');
        setShowAuthForm(false);
        setAuthCode('');
        await loadConnectionStatus();
      } else {
        toast.error(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Error authenticating with Telegram:', error);
      toast.error('Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    
    try {
      const result = await telegramService.disconnect(user.id);
      
      if (result.success) {
        toast.success('Telegram disconnected successfully');
        await loadConnectionStatus();
      } else {
        toast.error('Failed to disconnect from Telegram');
      }
    } catch (error) {
      console.error('Error disconnecting from Telegram:', error);
      toast.error('Failed to disconnect from Telegram');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading Telegram status...</span>
      </div>
    );
  }

  if (session?.isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Telegram Connected</h3>
              <p className="text-sm text-gray-600">
                Connected to {session.phone || 'your Telegram account'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Disconnect
          </button>
        </div>
        
        {session.lastConnected && (
          <p className="text-xs text-gray-500">
            Last connected: {new Date(session.lastConnected).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  if (showAuthForm) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Key className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Complete Authentication</h3>
            <p className="text-sm text-gray-600">
              Enter the code sent to your Telegram account
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Code
            </label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 For demo purposes, use code: <code className="bg-gray-100 px-1 rounded">123456</code> or <code className="bg-gray-100 px-1 rounded">demo</code>
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleAuthenticate}
              disabled={authenticating || !authCode}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {authenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                'Complete Authentication'
              )}
            </button>
            <button
              onClick={() => setShowAuthForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showConnectionForm) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Connect Telegram</h3>
            <p className="text-sm text-gray-600">
              Enter your Telegram API credentials
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API ID
            </label>
            <input
              type="number"
              value={connectionData.apiId}
              onChange={(e) => setConnectionData(prev => ({ ...prev, apiId: e.target.value }))}
              placeholder="Your Telegram API ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Hash
            </label>
            <input
              type="text"
              value={connectionData.apiHash}
              onChange={(e) => setConnectionData(prev => ({ ...prev, apiHash: e.target.value }))}
              placeholder="Your Telegram API Hash"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={connectionData.phone}
              onChange={(e) => setConnectionData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to get your Telegram API credentials:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Go to{' '}
                    <a 
                      href="https://my.telegram.org/auth" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 underline hover:no-underline font-medium"
                    >
                      https://my.telegram.org/auth
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </li>
                  <li>Log in with your phone number</li>
                  <li>Go to "API development tools"</li>
                  <li>Create a new application</li>
                  <li>Copy your API ID and API Hash</li>
                </ol>
                <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-300">
                  <p className="text-xs text-blue-700">
                    <strong>💡 Quick tip:</strong> The API credentials are tied to your Telegram account and are required for the app to connect to Telegram's servers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleConnect}
              disabled={connecting || !connectionData.apiId || !connectionData.apiHash || !connectionData.phone}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Telegram'
              )}
            </button>
            <button
              onClick={() => setShowConnectionForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Smartphone className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Connect Telegram</h3>
          <p className="text-sm text-gray-600">
            Connect your Telegram account to start monitoring channels
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Why connect Telegram?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Monitor your favorite channels for new videos</li>
                <li>Automatically download videos as they're posted</li>
                <li>Organize downloads by channel and date</li>
                <li>Get real-time notifications of new content</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowConnectionForm(true)}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Smartphone className="w-5 h-5" />
          <span>Connect Telegram Account</span>
        </button>
      </div>
    </div>
  );
};

export default TelegramConnection;


