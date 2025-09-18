import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  RefreshCw,
  MessageSquare,
  Users,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { telegramService, TelegramChannel } from '../services/telegramApiService';
import toast from 'react-hot-toast';

interface TelegramChannelsProps {
  isConnected: boolean;
}

const TelegramChannels: React.FC<TelegramChannelsProps> = ({ isConnected }) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);

  useEffect(() => {
    if (user?.id && isConnected) {
      loadChannels();
    }
  }, [user?.id, isConnected]);

  const loadChannels = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const channelsData = await telegramService.getChannels(user.id);
      setChannels(channelsData);
    } catch (error) {
      console.error('Error loading Telegram channels:', error);
      toast.error('Failed to load Telegram channels');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!user?.id || !newChannelUrl) {
      toast.error('Please enter a channel URL');
      return;
    }

    try {
      setAddingChannel(true);
      const result = await telegramService.addChannel(user.id, newChannelUrl, newChannelName);
      
      if (result.success) {
        toast.success('Channel added successfully!');
        setNewChannelUrl('');
        setNewChannelName('');
        setShowAddChannel(false);
        await loadChannels();
      } else {
        toast.error(result.message || 'Failed to add channel');
      }
    } catch (error) {
      console.error('Error adding Telegram channel:', error);
      toast.error('Failed to add channel');
    } finally {
      setAddingChannel(false);
    }
  };

  const toggleChannel = async (channelId: string, isActive: boolean) => {
    if (!user?.id) return;
    
    try {
      const result = await telegramService.toggleChannel(user.id, channelId, isActive);
      
      if (result.success) {
        toast.success(`Channel ${isActive ? 'activated' : 'paused'}`);
        await loadChannels();
      } else {
        toast.error('Failed to update channel');
      }
    } catch (error) {
      console.error('Error toggling Telegram channel:', error);
      toast.error('Failed to update channel');
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!user?.id) return;
    
    if (!confirm('Are you sure you want to remove this channel?')) {
      return;
    }
    
    try {
      const result = await telegramService.removeChannel(user.id, channelId);
      
      if (result.success) {
        toast.success('Channel removed');
        await loadChannels();
      } else {
        toast.error('Failed to remove channel');
      }
    } catch (error) {
      console.error('Error deleting Telegram channel:', error);
      toast.error('Failed to remove channel');
    }
  };

  const formatChannelUrl = (url: string) => {
    if (url.startsWith('@')) {
      return `https://t.me/${url.substring(1)}`;
    }
    if (url.startsWith('https://t.me/')) {
      return url;
    }
    return `https://t.me/${url}`;
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Telegram First</h3>
          <p className="text-gray-600">
            You need to connect your Telegram account before you can manage channels
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading channels...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Telegram Channels</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor channels for new video downloads
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadChannels}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowAddChannel(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Channel</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {showAddChannel && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel URL or Username
                </label>
                <input
                  type="text"
                  value={newChannelUrl}
                  onChange={(e) => setNewChannelUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., @channelname or https://t.me/channelname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Tech Tutorials"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddChannel}
                  disabled={addingChannel || !newChannelUrl}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {addingChannel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Channel</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddChannel(false)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {channels.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No channels monitored</h3>
              <p className="text-gray-600 mb-4">
                Add Telegram channels to start monitoring for video downloads
              </p>
              <div className="text-sm text-gray-500">
                <p className="mb-2">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                  <li><code className="bg-gray-100 px-2 py-1 rounded">@channelname</code></li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">https://t.me/channelname</code></li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">channelname</code></li>
                </ul>
              </div>
            </div>
          ) : (
            channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${channel.isActive ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            Telegram
                          </span>
                          {channel.name}
                        </h3>
                        <a
                          href={formatChannelUrl(channel.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-sm text-gray-600">
                        {channel.url}
                      </p>
                      <p className="text-xs text-gray-500">
                        {channel.totalDownloads} downloads • Last checked {new Date(channel.lastChecked).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleChannel(channel.id, !channel.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      channel.isActive 
                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title={channel.isActive ? 'Pause monitoring' : 'Start monitoring'}
                  >
                    {channel.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteChannel(channel.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Remove channel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramChannels;











