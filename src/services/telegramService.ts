// Telegram Bot API service for monitoring channels and downloading videos
export interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  video?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  document?: {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    title?: string;
    username?: string;
    type: string;
  };
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  chatId: string;
  isActive: boolean;
  lastChecked: string;
  totalDownloads: number;
}

export interface DownloadTask {
  id: string;
  messageId: number;
  chatId: string;
  filename: string;
  fileId: string;
  fileSize: number;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number;
  localPath: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

class TelegramService {
  private botToken: string;
  private baseUrl: string;

  constructor() {
    this.botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  // Initialize bot and get webhook info
  async initializeBot(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('Bot initialized:', data.result);
        return true;
      } else {
        console.error('Bot initialization failed:', data.description);
        return false;
      }
    } catch (error) {
      console.error('Error initializing bot:', error);
      return false;
    }
  }

  // Get updates from Telegram (messages, etc.)
  async getUpdates(offset?: number): Promise<TelegramMessage[]> {
    try {
      const params = new URLSearchParams();
      if (offset) params.append('offset', offset.toString());
      params.append('timeout', '30');

      const response = await fetch(`${this.baseUrl}/getUpdates?${params}`);
      const data = await response.json();

      if (data.ok) {
        return data.result.map((update: any) => update.message).filter(Boolean);
      } else {
        console.error('Failed to get updates:', data.description);
        return [];
      }
    } catch (error) {
      console.error('Error getting updates:', error);
      return [];
    }
  }

  // Get file info from Telegram
  async getFileInfo(fileId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/getFile?file_id=${fileId}`);
      const data = await response.json();

      if (data.ok) {
        return data.result;
      } else {
        console.error('Failed to get file info:', data.description);
        return null;
      }
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  // Download file from Telegram
  async downloadFile(filePath: string): Promise<Blob | null> {
    try {
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const response = await fetch(fileUrl);
      
      if (response.ok) {
        return await response.blob();
      } else {
        console.error('Failed to download file:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  // Process a message and extract video/document info
  processMessage(message: TelegramMessage): DownloadTask | null {
    const video = message.video || message.document;
    
    if (!video) return null;

    // Check if it's a video file
    const isVideo = message.video || 
      (message.document && message.document.mime_type?.startsWith('video/'));

    if (!isVideo) return null;

    const filename = video.file_name || 
      `video_${message.message_id}_${Date.now()}.mp4`;

    return {
      id: `task_${message.message_id}_${Date.now()}`,
      messageId: message.message_id,
      chatId: message.chat.id.toString(),
      filename,
      fileId: video.file_id,
      fileSize: video.file_size || 0,
      status: 'queued',
      progress: 0,
      localPath: `/downloads/${message.chat.title || 'unknown'}/${filename}`,
      createdAt: new Date().toISOString(),
    };
  }

  // Monitor channels for new videos
  async monitorChannels(channels: Channel[]): Promise<DownloadTask[]> {
    const activeChannels = channels.filter(channel => channel.isActive);
    const newTasks: DownloadTask[] = [];

    try {
      const messages = await this.getUpdates();
      
      for (const message of messages) {
        // Check if message is from a monitored channel
        const channel = activeChannels.find(ch => 
          ch.chatId === message.chat.id.toString() || 
          ch.url.includes(message.chat.username || '')
        );

        if (channel) {
          const task = this.processMessage(message);
          if (task) {
            newTasks.push(task);
          }
        }
      }

      return newTasks;
    } catch (error) {
      console.error('Error monitoring channels:', error);
      return [];
    }
  }

  // Simulate download progress (in real implementation, this would track actual download)
  async downloadVideo(task: DownloadTask, onProgress?: (progress: number) => void): Promise<boolean> {
    try {
      // Get file info
      const fileInfo = await this.getFileInfo(task.fileId);
      if (!fileInfo) {
        task.status = 'failed';
        task.error = 'Failed to get file info';
        return false;
      }

      // Simulate download progress
      task.status = 'downloading';
      
      for (let progress = 0; progress <= 100; progress += 10) {
        task.progress = progress;
        onProgress?.(progress);
        
        // Simulate download time
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // In a real implementation, you would:
      // 1. Download the file from Telegram
      // 2. Save it to the specified local path
      // 3. Update the task status

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      return true;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }
}

export const telegramService = new TelegramService();


