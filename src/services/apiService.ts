import axios from 'axios';
import { Channel, DownloadTask } from './telegramService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  subscription_plan?: 'free' | 'pro' | 'enterprise';
  storage_used?: number;
  storage_limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User management
export const userService = {
  async getProfile(): Promise<User> {
    const response = await api.get('/user/profile');
    return response.data.data;
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await api.put('/user/profile', updates);
    return response.data.data;
  },

  async getUsage(): Promise<{ storage_used: number; storage_limit: number; downloads_this_month: number }> {
    const response = await api.get('/user/usage');
    return response.data.data;
  },
};

// Channel management
export const channelService = {
  async getChannels(): Promise<Channel[]> {
    const response = await api.get('/channels');
    return response.data.data;
  },

  async addChannel(channel: Omit<Channel, 'id' | 'totalDownloads' | 'lastChecked'>): Promise<Channel> {
    const response = await api.post('/channels', channel);
    return response.data.data;
  },

  async updateChannel(id: string, updates: Partial<Channel>): Promise<Channel> {
    const response = await api.put(`/channels/${id}`, updates);
    return response.data.data;
  },

  async deleteChannel(id: string): Promise<void> {
    await api.delete(`/channels/${id}`);
  },

  async toggleChannel(id: string, isActive: boolean): Promise<Channel> {
    const response = await api.patch(`/channels/${id}/toggle`, { isActive });
    return response.data.data;
  },

  async testChannel(url: string): Promise<{ valid: boolean; info?: any; error?: string }> {
    const response = await api.post('/channels/test', { url });
    return response.data.data;
  },
};

// Download management
export const downloadService = {
  async getDownloads(limit = 50, offset = 0): Promise<DownloadTask[]> {
    const response = await api.get(`/downloads?limit=${limit}&offset=${offset}`);
    return response.data.data;
  },

  async getDownload(id: string): Promise<DownloadTask> {
    const response = await api.get(`/downloads/${id}`);
    return response.data.data;
  },

  async retryDownload(id: string): Promise<DownloadTask> {
    const response = await api.post(`/downloads/${id}/retry`);
    return response.data.data;
  },

  async deleteDownload(id: string): Promise<void> {
    await api.delete(`/downloads/${id}`);
  },

  async getDownloadStats(): Promise<{
    total_downloads: number;
    successful_downloads: number;
    failed_downloads: number;
    total_size: number;
    downloads_today: number;
    downloads_this_week: number;
    downloads_this_month: number;
  }> {
    const response = await api.get('/downloads/stats');
    return response.data.data;
  },
};

// File management
export const fileService = {
  async getFiles(path = '/'): Promise<{
    files: Array<{
      name: string;
      path: string;
      size: number;
      type: 'file' | 'directory';
      modified: string;
    }>;
    total_size: number;
  }> {
    const response = await api.get(`/files?path=${encodeURIComponent(path)}`);
    return response.data.data;
  },

  async createFolder(path: string, name: string): Promise<void> {
    await api.post('/files/folder', { path, name });
  },

  async deleteFile(path: string): Promise<void> {
    await api.delete(`/files?path=${encodeURIComponent(path)}`);
  },

  async moveFile(from: string, to: string): Promise<void> {
    await api.put('/files/move', { from, to });
  },

  async getStorageInfo(): Promise<{
    total_space: number;
    used_space: number;
    available_space: number;
    usage_by_folder: Array<{
      path: string;
      size: number;
      file_count: number;
    }>;
  }> {
    const response = await api.get('/files/storage');
    return response.data.data;
  },
};

// Settings management
export const settingsService = {
  async getSettings(): Promise<{
    download_path: string;
    auto_organize: boolean;
    file_naming: 'original' | 'timestamp' | 'custom';
    custom_naming_pattern?: string;
    max_concurrent_downloads: number;
    notification_settings: {
      email_notifications: boolean;
      browser_notifications: boolean;
      download_complete: boolean;
      download_failed: boolean;
    };
  }> {
    const response = await api.get('/settings');
    return response.data.data;
  },

  async updateSettings(settings: any): Promise<void> {
    await api.put('/settings', settings);
  },

  async testNotification(): Promise<void> {
    await api.post('/settings/test-notification');
  },
};

// WebSocket connection for real-time updates
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(onMessage: (data: any) => void, onError?: (error: Event) => void) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(onMessage, onError);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };
  }

  private attemptReconnect(onMessage: (data: any) => void, onError?: (error: Event) => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(onMessage, onError);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const wsService = new WebSocketService();


