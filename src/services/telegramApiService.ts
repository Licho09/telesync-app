// Telegram API service for user-specific Telegram integration
import { api } from './apiService';

export interface TelegramSession {
  isConnected: boolean;
  phone?: string;
  lastConnected?: string;
  message?: string;
}

export interface TelegramChannel {
  id: string;
  name: string;
  url: string;
  chatId: string;
  isActive: boolean;
  lastChecked: string;
  totalDownloads: number;
  type: 'telegram';
  userId: string;
}

export interface TelegramDownload {
  id: string;
  url: string;
  title: string;
  filename: string;
  size: number;
  size_formatted: string;
  channel: string;
  source: string;
  status: string;
  progress: number;
  createdAt: string;
  completedAt?: string;
  userId: string;
}

export interface TelegramConnectionData {
  apiId: string;
  apiHash: string;
  phone: string;
}

export const telegramService = {
  // Get user's Telegram connection status
  async getConnectionStatus(userId: string): Promise<TelegramSession> {
    const response = await api.get(`/telegram/status/${userId}`);
    return response.data.data;
  },

  // Initialize Telegram connection
  async connect(userId: string, connectionData: TelegramConnectionData): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await api.post('/telegram/connect', {
      userId,
      ...connectionData
    });
    return response.data;
  },

  // Complete Telegram authentication
  async authenticate(userId: string, code: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await api.post('/telegram/authenticate', {
      userId,
      code
    });
    return response.data;
  },

  // Get user's Telegram channels
  async getChannels(userId: string): Promise<TelegramChannel[]> {
    const response = await api.get(`/telegram/channels/${userId}`);
    return response.data.data;
  },

  // Add a Telegram channel to monitor
  async addChannel(userId: string, channelUrl: string, channelName?: string): Promise<{ success: boolean; message: string; data?: TelegramChannel }> {
    const response = await api.post('/telegram/channels', {
      userId,
      channelUrl,
      channelName
    });
    return response.data;
  },

  // Toggle channel monitoring
  async toggleChannel(userId: string, channelId: string, isActive: boolean): Promise<{ success: boolean; message: string; data?: TelegramChannel }> {
    const response = await api.patch(`/telegram/channels/${channelId}/toggle`, {
      userId,
      isActive
    });
    return response.data;
  },

  // Remove a Telegram channel
  async removeChannel(userId: string, channelId: string): Promise<{ success: boolean; message: string; data?: TelegramChannel }> {
    const response = await api.delete(`/telegram/channels/${channelId}?userId=${userId}`);
    return response.data;
  },

  // Get user's downloads
  async getDownloads(userId: string, limit = 50, offset = 0): Promise<{ data: TelegramDownload[]; total: number }> {
    const response = await api.get(`/telegram/downloads/${userId}?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Disconnect Telegram
  async disconnect(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/telegram/disconnect', { userId });
    return response.data;
  }
};



