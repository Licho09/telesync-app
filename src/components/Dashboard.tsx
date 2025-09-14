import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Plus, 
  Settings, 
  LogOut, 
  Play, 
  Pause, 
  Trash2, 
  Folder,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CircularProgress from './CircularProgress';
import { useAuth } from '../contexts/AuthContext';
import { channelService, downloadService, wsService, settingsService } from '../services/apiService';
import { telegramService } from '../services/telegramApiService';
import TelegramConnection from './TelegramConnection';
import toast from 'react-hot-toast';

interface Channel {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastChecked: string;
  totalDownloads: number;
}

interface Download {
  id: string;
  filename: string;
  channel: string;
  status: 'downloading' | 'completed' | 'failed' | 'queued';
  progress: number;
  size: string;
  path: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [telegramChannels, setTelegramChannels] = useState<any[]>([]);
  const [allChannels, setAllChannels] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [realtimeDownloads, setRealtimeDownloads] = useState<any[]>([]);
  const [notifiedDownloads, setNotifiedDownloads] = useState<Set<string>>(new Set());
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'discord' | 'telegram'>('telegram');
  const [showSettings, setShowSettings] = useState(false);
  const [downloadPath, setDownloadPath] = useState('');
  const [showPathBrowser, setShowPathBrowser] = useState(false);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  
  // API Credentials state
  const [apiCredentials, setApiCredentials] = useState({
    apiId: '',
    apiHash: '',
    phoneNumber: ''
  });
  
  // Verification code state
  const [showVerificationCodeForm, setShowVerificationCodeForm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showApiHash, setShowApiHash] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState({
    hasCredentials: false,
    isUsingIndividualCredentials: false,
    monitorStatus: 'stopped'
  });
  
  // Settings navigation state
  const [activeSettingsTab, setActiveSettingsTab] = useState<'setup' | 'downloads' | 'telegram'>('setup');

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [channelsData, downloadsData, settingsData] = await Promise.all([
          channelService.getChannels(),
          downloadService.getDownloads(),
          settingsService.getSettings()
        ]);
        
        setChannels(channelsData);
        setDownloads(downloadsData);
        setDownloadPath(settingsData.download_path || 'discord_downloads');
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      }
    };

    loadData();
  }, []);

  // Load Telegram channels when user is connected
  useEffect(() => {
    const loadTelegramChannels = async () => {
      if (user?.id && telegramConnected) {
        try {
          console.log('Loading Telegram channels for user:', user.id);
          const telegramChannelsData = await telegramService.getChannels(user.id);
          console.log('Telegram channels loaded:', telegramChannelsData);
          setTelegramChannels(telegramChannelsData);
        } catch (error) {
          console.error('Error loading Telegram channels:', error);
        }
      } else {
        console.log('Not loading Telegram channels - user:', user?.id, 'connected:', telegramConnected);
      }
    };

    loadTelegramChannels();
  }, [user?.id, telegramConnected]);

  // Load API credentials status when user changes
  useEffect(() => {
    if (user?.id) {
      loadCredentialsStatus();
    }
  }, [user?.id]);

  // Combine Discord and Telegram channels
  useEffect(() => {
    const combined = [
      ...channels.map(channel => ({ ...channel, type: 'discord' })),
      ...telegramChannels.map(channel => ({ ...channel, type: 'telegram' }))
    ];
    console.log('Combining channels - Discord:', channels.length, 'Telegram:', telegramChannels.length, 'Total:', combined.length);
    setAllChannels(combined);
  }, [channels, telegramChannels]);

  // Clean up old notifications periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setNotifiedDownloads(prev => {
        // Keep only the last 50 notification IDs to prevent memory leaks
        const notificationsArray = Array.from(prev);
        if (notificationsArray.length > 50) {
          return new Set(notificationsArray.slice(-50));
        }
        return prev;
      });
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    wsService.connect(
      (data) => {
        switch (data.type) {
          case 'channels_update':
            setChannels(data.data);
            break;
          case 'downloads_update':
            setDownloads(data.data);
            break;
          case 'settings_update':
            setDownloadPath(data.data.downloadPath || '');
            break;
          case 'download_started':
            setRealtimeDownloads(prev => {
              // Check if this download already exists (by URL or ID)
              const existingIndex = prev.findIndex(download => 
                (download.url === data.data.url && (download.type === 'started' || download.type === 'progress')) ||
                download.id === data.data.id
              );
              
              if (existingIndex !== -1) {
                // Update existing download (don't show duplicate toast)
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  ...data.data,
                  timestamp: data.timestamp
                };
                return updated;
              } else {
                // Add new download and show toast
                toast.info(`Download started: ${data.data.title}`);
                return [{
                  id: data.data.id || `${data.data.url}_${Date.now()}`,
                  type: 'started',
                  ...data.data,
                  timestamp: data.timestamp
                }, ...prev.slice(0, 9)]; // Keep only last 10
              }
            });
            break;
          case 'download_completed':
            setRealtimeDownloads(prev => {
              // Find and update the started/progress entry, or add new completed entry
              const existingIndex = prev.findIndex(download => 
                (download.url === data.data.url && (download.type === 'started' || download.type === 'progress')) ||
                download.id === data.data.id
              );
              
              // Create a unique identifier for this download completion
              const downloadId = data.data.id || `${data.data.url}_${Date.now()}`;
              
              if (existingIndex !== -1) {
                // Update existing entry to completed
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  type: 'completed',
                  status: 'completed',
                  progress: 100,
                  ...data.data,
                  timestamp: data.timestamp
                };
                
                // Only show toast if we haven't notified about this download completion yet
                setNotifiedDownloads(prevNotified => {
                  if (!prevNotified.has(downloadId)) {
                    toast.success(`Download completed: ${data.data.title}`);
                    return new Set([...prevNotified, downloadId]);
                  }
                  return prevNotified;
                });
                
                return updated;
              } else {
                // Add new completed download (no toast for orphaned completions)
                return [{
                  id: downloadId,
                  type: 'completed',
                  status: 'completed',
                  progress: 100,
                  ...data.data,
                  timestamp: data.timestamp
                }, ...prev.slice(0, 9)]; // Keep only last 10
              }
            });
            break;
          case 'download_failed':
            setRealtimeDownloads(prev => {
              // Find and update the started entry, or add new failed entry
              const startedIndex = prev.findIndex(download => 
                download.url === data.data.url && download.type === 'started'
              );
              
              // Create a unique identifier for this download failure
              const downloadId = `${data.data.url}_failed_${Date.now()}`;
              
              if (startedIndex !== -1) {
                // Update existing started entry to failed
                const updated = [...prev];
                updated[startedIndex] = {
                  ...updated[startedIndex],
                  type: 'failed',
                  ...data.data,
                  timestamp: data.timestamp
                };
                
                // Only show toast if we haven't notified about this download failure yet
                setNotifiedDownloads(prevNotified => {
                  if (!prevNotified.has(downloadId)) {
                    toast.error(`Download failed: ${data.data.error}`);
                    return new Set([...prevNotified, downloadId]);
                  }
                  return prevNotified;
                });
                
                return updated;
              } else {
                // Add new failed download
                return [{
                  id: downloadId,
                  type: 'failed',
                  ...data.data,
                  timestamp: data.timestamp
                }, ...prev.slice(0, 9)]; // Keep only last 10
              }
            });
            break;
          case 'download_progress':
            setRealtimeDownloads(prev => {
              // Update progress for existing download
              const downloadIndex = prev.findIndex(download => 
                download.id === data.data.id || 
                (download.url === data.data.url && download.type === 'started')
              );
              
              if (downloadIndex !== -1) {
                const updated = [...prev];
                updated[downloadIndex] = {
                  ...updated[downloadIndex],
                  type: 'progress',
                  progress: data.data.progress,
                  timestamp: data.timestamp
                };
                return updated;
              }
              return prev;
            });
            break;
        }
      },
      (error) => {
        console.error('WebSocket error:', error);
      }
    );

    return () => {
      wsService.disconnect();
    };
  }, []);

  // Load path history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('downloadPathHistory');
    // Clear download path history for client testing
    localStorage.removeItem('downloadPathHistory');
    if (savedHistory) {
      try {
        setPathHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading path history:', error);
      }
    }
  }, []);

  const handleAddChannel = async () => {
    if (!newChannelUrl || !newChannelName) {
      toast.error('Please fill in both channel name and URL');
      return;
    }

    // Check if trying to add Telegram channel without being connected
    if (newChannelType === 'telegram' && !telegramConnected) {
      toast.error('Please connect to Telegram first before adding Telegram channels');
      return;
    }

    try {
      if (newChannelType === 'discord') {
        await channelService.addChannel({
          name: newChannelName,
          url: newChannelUrl,
          chatId: '', // Will be resolved by the backend
          isActive: true
        });
        // Refresh Discord channels
        const channelsData = await channelService.getChannels();
        setChannels(channelsData);
      } else if (newChannelType === 'telegram' && user?.id) {
        await telegramService.addChannel(user.id, newChannelUrl, newChannelName);
        // Refresh Telegram channels
        const telegramChannelsData = await telegramService.getChannels(user.id);
        setTelegramChannels(telegramChannelsData);
      }
      
      setNewChannelUrl('');
      setNewChannelName('');
      setNewChannelType('telegram');
      setShowAddChannel(false);
      toast.success('Telegram channel added successfully!');
    } catch (error) {
      console.error('Error adding channel:', error);
      toast.error('Failed to add Telegram channel');
    }
  };

  const toggleChannel = async (channelId: string) => {
    try {
      // Find the channel in the combined list to determine its type
      const channel = allChannels.find(c => c.id === channelId);
      
      if (channel?.type === 'telegram' && user?.id) {
        // Toggle Telegram channel
        await telegramService.toggleChannel(user.id, channelId, !channel.isActive);
        // Refresh Telegram channels
        const telegramChannelsData = await telegramService.getChannels(user.id);
        setTelegramChannels(telegramChannelsData);
        toast.success(`Telegram channel ${!channel.isActive ? 'activated' : 'paused'}`);
      } else if (channel?.type === 'discord') {
        // Toggle Discord channel
        await channelService.toggleChannel(channelId, !channel.isActive);
        // Refresh Discord channels
        const channelsData = await channelService.getChannels();
        setChannels(channelsData);
        toast.success(`Discord channel ${!channel.isActive ? 'activated' : 'paused'}`);
      }
    } catch (error) {
      console.error('Error toggling channel:', error);
      toast.error('Failed to update channel');
    }
  };

  const confirmDeleteChannel = (channelId: string) => {
    setChannelToDelete(channelId);
    setShowDeleteConfirm(true);
  };

  const deleteChannel = async () => {
    if (!channelToDelete) return;
    
    try {
      // Find the channel to determine its type
      const channel = allChannels.find(c => c.id === channelToDelete);
      
      if (channel?.type === 'telegram' && user?.id) {
        // Delete Telegram channel
        await telegramService.removeChannel(user.id, channelToDelete);
        // Refresh Telegram channels
        const telegramChannelsData = await telegramService.getChannels(user.id);
        setTelegramChannels(telegramChannelsData);
      } else {
        // Delete Discord channel
        await channelService.deleteChannel(channelToDelete);
        // Refresh Discord channels
        const channelsData = await channelService.getChannels();
        setChannels(channelsData);
      }
      
      toast.success('Channel removed');
      setShowDeleteConfirm(false);
      setChannelToDelete(null);
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error('Failed to remove channel');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setChannelToDelete(null);
  };

  const loadCredentialsStatus = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/telegram/credentials/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCredentialsStatus(data.data);
        
        // Pre-fill form if credentials exist
        if (data.data.hasCredentials) {
          setApiCredentials(prev => ({
            ...prev,
            apiId: data.data.apiId?.toString() || '',
            phoneNumber: data.data.phoneNumber || ''
            // Don't pre-fill apiHash for security
          }));
        }
      }
    } catch (error) {
      console.error('Error loading credentials status:', error);
    }
  };

  const handleVerifyCode = async () => {
    try {
      const response = await fetch('/api/telegram/verify-and-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          phone: apiCredentials.phoneNumber,
          code: verificationCode
        }),
      });

      if (response.ok) {
        toast.success('Telegram authentication successful!');
        setShowVerificationCodeForm(false);
        setVerificationCode('');
        await loadCredentialsStatus();
      } else {
        throw new Error('Failed to verify code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Failed to verify code. Please try again.');
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      const response = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          phone: apiCredentials.phoneNumber
        }),
      });

      if (response.ok) {
        toast.success('Verification code sent! Check your phone.');
        // Show verification code input
        setShowVerificationCodeForm(true);
      } else {
        throw new Error('Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast.error('Failed to send verification code');
    }
  };

  const handleSaveApiCredentials = async () => {
    try {
      // Validate credentials
      if (!apiCredentials.apiId || !apiCredentials.apiHash || !apiCredentials.phoneNumber) {
        toast.error('Please fill in all API credential fields');
        return;
      }

      // Save to backend
      const response = await fetch('/api/telegram/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          ...apiCredentials
        }),
      });

      if (response.ok) {
        toast.success('API credentials saved successfully! Monitor will restart with new credentials.');
        // Refresh credentials status
        await loadCredentialsStatus();
        
        // Trigger authentication flow
        await handleSendVerificationCode();
      } else {
        throw new Error('Failed to save credentials');
      }
    } catch (error) {
      console.error('Error saving API credentials:', error);
      toast.error('Failed to save API credentials');
    }
  };

  const handleUpdateDownloadPath = async () => {
    try {
      // Validate path
      if (!downloadPath.trim()) {
        toast.error('Please enter a valid download path');
        return;
      }

      // Add to path history
      const newHistory = [downloadPath, ...pathHistory.filter(p => p !== downloadPath)].slice(0, 5);
      setPathHistory(newHistory);
      localStorage.setItem('downloadPathHistory', JSON.stringify(newHistory));

      await settingsService.updateSettings({ downloadPath });
      toast.success('Download path updated successfully!');
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating download path:', error);
      toast.error('Failed to update download path');
    }
  };

  const handleBrowseFolder = async () => {
    try {
      // Check if the browser supports the File System Access API (Chrome 86+, Edge 86+)
      if ('showDirectoryPicker' in window) {
        try {
          const directoryHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
          });
          
          // Store the directory handle for future use
          (window as any).selectedDirectoryHandle = directoryHandle;
          
          // For now, we'll use the directory name
          // In a real implementation, you'd need to get the full path differently
          const folderName = directoryHandle.name;
          setDownloadPath(folderName);
          
          toast.success(`Selected folder: ${folderName}`);
        } catch (error) {
          if (error.name === 'AbortError') {
            // User cancelled the dialog
            return;
          }
          throw error;
        }
      } else {
        // Fallback for browsers without File System Access API
        // Use a hidden file input with webkitdirectory
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        input.style.display = 'none';
        
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            // Get the directory path from the first file
            const fullPath = files[0].webkitRelativePath;
            const directoryPath = fullPath.substring(0, fullPath.indexOf('/'));
            setDownloadPath(directoryPath);
            toast.success(`Selected folder: ${directoryPath}`);
          }
        };
        
        // Add to DOM, click, then remove
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      }
    } catch (error) {
      console.error('Error opening file explorer:', error);
      toast.error('Could not open file explorer. Please enter the path manually.');
      
      // Final fallback to manual input
      const customPath = prompt('Enter the full path to your download folder:', downloadPath);
      if (customPath && customPath.trim()) {
        setDownloadPath(customPath.trim());
      }
    }
  };

  const getPathFromHandle = async (handle: any): Promise<string> => {
    try {
      // Try to get the full path from the handle
      if (handle.getDirectoryHandle) {
        const path = await handle.getDirectoryHandle();
        return path.name || 'Selected Folder';
      }
      return handle.name || 'Selected Folder';
    } catch (error) {
      console.error('Error getting path from handle:', error);
      return 'Selected Folder';
    }
  };

  const handlePathHistorySelect = (path: string) => {
    setDownloadPath(path);
  };

  const validatePath = (path: string) => {
    // Basic path validation
    if (!path.trim()) return { valid: false, message: 'Path cannot be empty' };
    if (path.includes('..')) return { valid: false, message: 'Path cannot contain ".."' };
    if (path.length > 260) return { valid: false, message: 'Path is too long' };
    return { valid: true, message: '' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'downloading':
        return <Clock className="w-5 h-5 text-yellow-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'queued':
        return <Folder className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">TeleSync</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <h1 className="text-2xl font-bold text-white">Hello! {user?.name || 'User'}</h1>
                <p className="text-sm text-slate-400">Take a look and provide seamless experience to the app users.</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-64 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                
                <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                  <Bell className="w-6 h-6" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </button>
                
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Settings"
                >
                  <Settings className="w-6 h-6" />
                </button>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{user?.name || user?.email}</p>
                  </div>
                  {(!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-project')) && (
                    <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">Demo</span>
                  )}
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Setup Guide Banner */}
        {!telegramConnected && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">🚀 Welcome to TeleSync!</h3>
                <p className="text-blue-200 mb-4">
                  To start downloading videos automatically, you need to connect your Telegram account first. 
                  This will allow you to monitor Telegram channels and download videos in real-time.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setActiveSettingsTab('telegram');
                    }}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Setup Telegram Connection</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setActiveSettingsTab('setup');
                    }}
                    className="inline-flex items-center space-x-2 bg-slate-700/50 text-slate-300 px-6 py-3 rounded-lg hover:bg-slate-600/50 transition-colors border border-slate-600"
                  >
                    <span>View Setup Guide</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Total Downloads</p>
                <p className="text-3xl font-bold text-white">247</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-400 text-sm font-medium">+7%</span>
                  <svg className="w-4 h-4 text-green-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">As on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Active Channels</p>
                <p className="text-3xl font-bold text-white">{allChannels.filter(c => c.isActive).length}</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-400 text-sm font-medium">+7%</span>
                  <svg className="w-4 h-4 text-green-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl">
                <Download className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">As on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Time Saved</p>
                <p className="text-3xl font-bold text-white">18h</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-400 text-sm font-medium">+34%</span>
                  <svg className="w-4 h-4 text-green-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">As on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300">Download Path</p>
                <p className="text-sm font-mono text-white truncate" title={downloadPath}>
                  {downloadPath}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-slate-400 text-xs">Current Location</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl">
                <Folder className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>




        <div className="grid lg:grid-cols-2 gap-8">
          {/* Channels Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
            <div className="p-6 border-b border-white/20">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Channels</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      try {
                        // Refresh Discord channels
                        const response = await fetch('/api/channels/refresh');
                        const result = await response.json();
                        if (result.success) {
                          setChannels(result.data);
                        }
                        
                        // Refresh Telegram channels if connected
                        if (user?.id && telegramConnected) {
                          const telegramChannelsData = await telegramService.getChannels(user.id);
                          setTelegramChannels(telegramChannelsData);
                        }
                        
                        toast.success('Channels refreshed');
                      } catch (error) {
                        toast.error('Failed to refresh channels');
                      }
                    }}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => setShowAddChannel(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Channel</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {showAddChannel && (
                <div className="mb-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Platform
                      </label>
                      <select
                        value={newChannelType}
                        onChange={(e) => setNewChannelType(e.target.value as 'discord' | 'telegram')}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="telegram" disabled={!telegramConnected}>
                          Telegram {!telegramConnected && '(Connect Telegram first)'}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Channel Name
                      </label>
                      <input
                        type="text"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Video Editing Tutorials"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Channel URL
                      </label>
                      <input
                        type="text"
                        value={newChannelUrl}
                        onChange={(e) => setNewChannelUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., @videoediting or https://t.me/videoediting"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddChannel}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
                      >
                        Add Channel
                      </button>
                      <button
                        onClick={() => {
                          setShowAddChannel(false);
                          setNewChannelUrl('');
                          setNewChannelName('');
                          setNewChannelType('discord');
                        }}
                        className="bg-slate-700/50 text-slate-300 px-6 py-3 rounded-lg hover:bg-slate-600/50 transition-colors border border-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {allChannels.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Download className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-3">No channels monitored</h3>
                    <p className="text-slate-400 mb-6">
                      Add channels to start monitoring for video downloads
                    </p>
                    <div className="text-sm text-slate-500 bg-slate-800/50 rounded-lg p-4 max-w-md mx-auto">
                      <p className="mb-3 font-medium text-slate-300">To add channels:</p>
                      <div className="space-y-3 text-left">
                        <div>
                          <p className="font-medium text-slate-300 mb-1">Discord:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Go to your Discord server</li>
                            <li>Navigate to the channel you want to monitor</li>
                            <li>Type: <code className="bg-slate-700 px-2 py-1 rounded text-slate-300">!add_channel</code></li>
                          </ol>
                        </div>
                        <div>
                          <p className="font-medium text-slate-300 mb-1">Telegram:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Connect your Telegram account above</li>
                            <li>Add channels using the Telegram section</li>
                          </ol>
                        </div>
                        <p className="text-center mt-3">Click "Refresh" above to see added channels</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  allChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 transition-all duration-200">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full ${channel.isActive ? 'bg-green-400' : 'bg-slate-500'}`}></div>
                        <div>
                          <h3 className="font-medium text-white text-lg">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mr-3 border ${
                              channel.type === 'discord' 
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            }`}>
                              {channel.type === 'discord' ? 'Discord' : 'Telegram'}
                            </span>
                            {channel.name}
                          </h3>
                          <p className="text-sm text-slate-400 mt-1">
                            {channel.type === 'discord' ? (
                              `Channel ID: ${channel.id}`
                            ) : (
                              channel.url
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-2">
                            {channel.totalDownloads} downloads • Last checked {new Date(channel.lastChecked).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleChannel(channel.id)}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                          channel.isActive 
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30' 
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                        }`}
                      >
                        {channel.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => confirmDeleteChannel(channel.id)}
                        className="p-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/30"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Downloads Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Recent Downloads</h2>
                <button
                  onClick={() => navigate('/downloads')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>See All</span>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Show real-time downloads first, then historical downloads - limit to 4 */}
                {[...realtimeDownloads, ...downloads].length > 0 ? (
                  [...realtimeDownloads, ...downloads].slice(0, 4).map((download) => (
                    <div key={download.id} className="flex items-center space-x-4 p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 transition-all duration-200">
                      {(download.type === 'started' || download.type === 'progress' || download.status === 'downloading') && (
                        <div className="flex items-center">
                          <CircularProgress 
                            progress={download.progress || 0} 
                            size={40}
                            strokeWidth={3}
                            className="mr-2"
                          />
                        </div>
                      )}
                      {(download.type === 'completed' || download.status === 'completed') && (
                        <div className="p-3 bg-green-500/20 rounded-full border border-green-500/30">
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                      )}
                      {(download.type === 'failed' || download.status === 'failed') && (
                        <div className="p-3 bg-red-500/20 rounded-full border border-red-500/30">
                          <AlertCircle className="w-6 h-6 text-red-400" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="text-base font-medium text-white">
                          {download.title || download.filename}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {download.channel} • {download.source || 'discord'}
                        </div>
                        {(download.type === 'completed' || download.status === 'completed') && (
                          <div className="text-xs text-slate-500 mt-2">
                            {download.size_formatted} • {new Date(download.timestamp || download.completedAt || download.createdAt).toLocaleTimeString()}
                          </div>
                        )}
                        {download.type === 'failed' && (
                          <div className="text-xs text-red-400 mt-2">
                            Error: {download.error}
                          </div>
                        )}
                        {download.type === 'started' && (
                          <div className="text-xs text-yellow-400 mt-2">
                            Downloading... • {new Date(download.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Download className="w-10 h-10 text-slate-500" />
                    </div>
                    <p className="text-lg text-white mb-2">No downloads yet</p>
                    <p className="text-sm">Paste a YouTube link in Discord to start downloading</p>
                  </div>
                )}
                
                {/* Show "See All" message if there are more than 4 downloads */}
                {[...realtimeDownloads, ...downloads].length > 4 && (
                  <div className="text-center py-6 border-t border-slate-700/50">
                    <p className="text-sm text-slate-400 mb-3">
                      Showing 4 of {[...realtimeDownloads, ...downloads].length} downloads
                    </p>
                    <button
                      onClick={() => navigate('/downloads')}
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      View all downloads →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal - Dark Theme */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl w-full max-w-6xl mx-4 border border-slate-700/50 shadow-2xl h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h3 className="text-2xl font-semibold text-white">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Navigation */}
              <div className="w-64 bg-slate-700/30 border-r border-slate-600/50 p-4">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveSettingsTab('setup')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                      activeSettingsTab === 'setup'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium">Setup Guide</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveSettingsTab('downloads')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                      activeSettingsTab === 'downloads'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                    </svg>
                    <span className="font-medium">Download Path</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveSettingsTab('telegram')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                      activeSettingsTab === 'telegram'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="font-medium">Telegram API</span>
                  </button>
                </nav>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeSettingsTab === 'setup' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-2xl font-semibold text-white mb-2">🚀 TeleSync Setup Guide</h4>
                      <p className="text-slate-400 mb-6">
                        Follow these steps to get TeleSync up and running. This will take about 5 minutes.
                      </p>
                    </div>
                    
                    {/* Step 1 */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">1</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-lg font-semibold text-white mb-2">Get Your Telegram API Credentials</h5>
                          <p className="text-blue-200 mb-4">
                            You need API credentials to connect TeleSync to Telegram. Don't worry, it's free and only takes 2 minutes!
                          </p>
                          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h6 className="text-white font-medium mb-1">Step 1: Visit Telegram API</h6>
                                <p className="text-slate-300 text-sm">Click the button to go to the official Telegram API page</p>
                              </div>
                              <a 
                                href="https://my.telegram.org/auth" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                              >
                                <span>Get API Credentials</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                            <h6 className="text-white font-medium mb-2">What you'll do there:</h6>
                            <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
                              <li>Log in with your phone number</li>
                              <li>Go to "API development tools"</li>
                              <li>Create a new application</li>
                              <li>Copy your <strong className="text-white">API ID</strong> and <strong className="text-white">API Hash</strong></li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">2</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-lg font-semibold text-white mb-2">Connect Telegram to TeleSync</h5>
                          <p className="text-green-200 mb-4">
                            Once you have your API credentials, come back here and enter them in the Telegram API tab.
                          </p>
                          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h6 className="text-white font-medium mb-1">Step 2: Enter Credentials</h6>
                                <p className="text-slate-300 text-sm">Go to the Telegram API tab and enter your credentials</p>
                              </div>
                              <button
                                onClick={() => setActiveSettingsTab('telegram')}
                                className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                              >
                                <span>Go to Telegram API</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                            <h6 className="text-white font-medium mb-2">What happens next:</h6>
                            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
                              <li>TeleSync will connect to your Telegram account</li>
                              <li>You'll be able to add channels to monitor</li>
                              <li>Videos will start downloading automatically</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">3</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-lg font-semibold text-white mb-2">Add Channels to Monitor</h5>
                          <p className="text-purple-200 mb-4">
                            Add Telegram channels to monitor for new videos automatically.
                          </p>
                          
                          {/* Telegram Channels */}
                          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                            <h6 className="text-white font-medium mb-2">📱 Adding Telegram Channels:</h6>
                            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
                              <li>Click "Add Channel" on the main dashboard</li>
                              <li>Enter the Telegram channel name and URL</li>
                              <li>Use format: <code className="bg-slate-700 px-2 py-1 rounded text-green-400">@channelname</code> or <code className="bg-slate-700 px-2 py-1 rounded text-green-400">https://t.me/channelname</code></li>
                              <li>TeleSync will start monitoring automatically</li>
                              <li>Videos will be downloaded to your specified folder</li>
                            </ul>
                            
                            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                              <p className="text-blue-200 text-xs">
                                <strong>💡 Tip:</strong> You can add public Telegram channels by their @username or invite link. 
                                Make sure the channel allows you to view its content.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
                
                {activeSettingsTab === 'downloads' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xl font-medium text-white mb-2">Download Location</h4>
                      <p className="text-sm text-slate-400 mb-6">
                        This is the folder where TeleSync saves all your downloaded videos.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                          Download Path
                        </label>
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={downloadPath}
                            onChange={(e) => setDownloadPath(e.target.value)}
                            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="C:\Users\YourName\Videos\TeleSync"
                          />
                          <button
                            onClick={handleBrowseFolder}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-lg"
                            title="Open file explorer to select folder"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                            </svg>
                            <span>Browse</span>
                          </button>
                        </div>
                        {!validatePath(downloadPath).valid && (
                          <p className="text-xs text-red-400 mt-2">{validatePath(downloadPath).message}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          💡 Browse button opens your system's file explorer (Chrome/Edge) or folder picker (other browsers)
                        </p>
                      </div>

                      {/* Path History */}
                      {pathHistory.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-3">
                            Recent Paths
                          </label>
                          <div className="space-y-2">
                            {pathHistory.map((path, index) => (
                              <button
                                key={index}
                                onClick={() => handlePathHistorySelect(path)}
                                className="block w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-600/50 rounded-lg border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200 font-mono"
                              >
                                {path}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Path Preview */}
                      <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4">
                        <div className="flex items-center space-x-2 text-sm text-slate-300">
                          <Folder className="w-4 h-4" />
                          <span className="font-medium">Current Path:</span>
                        </div>
                        <div className="mt-2 font-mono text-sm text-white bg-slate-700/50 px-3 py-2 rounded-lg">
                          {downloadPath || 'No path selected'}
                        </div>
                        <div className="mt-3 text-xs text-slate-400">
                          Videos will be organized in subfolders by channel name
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeSettingsTab === 'telegram' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xl font-medium text-white mb-2">Telegram API Credentials</h4>
                      
                      {/* Prominent API Link Button */}
                      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-white font-medium mb-1">Need API Credentials?</h5>
                            <p className="text-slate-300 text-sm">Get your personal Telegram API ID and Hash</p>
                          </div>
                          <a 
                            href="https://my.telegram.org/auth" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                          >
                            Get API Credentials
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-400 mb-4">
                        Enter your personal Telegram API credentials below to enable individual API access with higher rate limits.
                      </p>
                      
                      {/* Status Indicator */}
                      {credentialsStatus.hasCredentials && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-green-300 font-medium">Individual API Credentials Active</p>
                              <p className="text-green-200 text-sm">
                                Using your personal API credentials (ID: {credentialsStatus.apiId}) • 
                                Monitor: {credentialsStatus.monitorStatus === 'running' ? 'Running' : 'Stopped'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          API ID
                        </label>
                        <input
                          type="text"
                          value={apiCredentials.apiId}
                          onChange={(e) => setApiCredentials(prev => ({ ...prev, apiId: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="12345678"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          API Hash
                        </label>
                        <div className="relative">
                          <input
                            type={showApiHash ? "text" : "password"}
                            value={apiCredentials.apiHash}
                            onChange={(e) => setApiCredentials(prev => ({ ...prev, apiHash: e.target.value }))}
                            className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="abcdef1234567890abcdef1234567890"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiHash(!showApiHash)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            {showApiHash ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={apiCredentials.phoneNumber}
                          onChange={(e) => setApiCredentials(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+1234567890"
                        />
                      </div>
                      
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-sm text-blue-300">
                            <p className="font-medium mb-1">Why individual API credentials?</p>
                            <p className="text-blue-200">
                              Using your own API credentials gives you higher rate limits and better isolation from other users. 
                              Each user gets their own 20 requests/minute quota instead of sharing one.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleSaveApiCredentials}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-medium shadow-lg"
                      >
                        Save API Credentials
                      </button>
                    </div>
                  </div>
                )}

                {/* Verification Code Form */}
                {showVerificationCodeForm && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xl font-medium text-white mb-2">Enter Verification Code</h4>
                      <p className="text-sm text-slate-400 mb-4">
                        Enter the 6-digit code sent to your phone number: {apiCredentials.phoneNumber}
                      </p>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="123456"
                          maxLength={6}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          💡 For demo purposes, you can use: <code className="bg-slate-600 px-1 rounded">123456</code> or <code className="bg-slate-600 px-1 rounded">demo</code>
                        </p>
                      </div>
                      
                      <div className="flex space-x-3 mt-4">
                        <button
                          onClick={handleVerifyCode}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 font-medium shadow-lg"
                        >
                          Verify Code
                        </button>
                        <button
                          onClick={() => setShowVerificationCodeForm(false)}
                          className="px-6 py-3 text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-all duration-200 font-medium border border-slate-600/50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer with Action Buttons */}
            <div className="flex justify-end space-x-4 p-6 border-t border-slate-700/50">
              <button
                onClick={() => setShowSettings(false)}
                className="px-8 py-3 text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-all duration-200 font-medium border border-slate-600/50"
              >
                Cancel
              </button>
              {activeSettingsTab === 'downloads' && (
                <button
                  onClick={handleUpdateDownloadPath}
                  disabled={!validatePath(downloadPath).valid}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
                >
                  Save Download Path
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Delete Channel</h3>
            </div>
            
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this channel? This action cannot be undone.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-all duration-200 font-medium border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={deleteChannel}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
