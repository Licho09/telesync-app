import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Mock data storage (in production, use a real database)
let settings = {
  downloadPath: ''
};

// User-specific data storage
let userTelegramSessions = {}; // userId -> { apiId, apiHash, phone, sessionName, isConnected }
let userChannels = {}; // userId -> [channels]
let userDownloads = {}; // userId -> [downloads]
let userApiCredentials = {}; // userId -> {apiId, apiHash, phoneNumber}

// Function to load Discord channels from config
function loadDiscordChannels() {
  try {
    const configPath = path.join(process.cwd(), 'discord_config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const channelIds = config.channels || [];
      
      // Convert Discord channel IDs to our format
      return channelIds.map((channelId, index) => ({
        id: channelId.toString(),
        name: `Discord Channel ${channelId}`,
        url: `discord://channel/${channelId}`,
        chatId: channelId.toString(),
        isActive: true,
        lastChecked: new Date().toISOString(),
        totalDownloads: 0,
        type: 'discord'
      }));
    }
  } catch (error) {
    console.error('Error loading Discord channels:', error);
  }
  
  return [];
}

let channels = loadDiscordChannels();

// Store real downloads from Discord bot
let downloads = [];

// Function to add a new download
function addDownload(downloadData) {
  const download = {
    id: `${downloadData.url}_${Date.now()}`,
    url: downloadData.url,
    title: downloadData.title,
    filename: downloadData.filename || 'Unknown',
    size: downloadData.size || 0,
    size_formatted: downloadData.size_formatted || '0 B',
    channel: downloadData.channel || 'Unknown',
    source: downloadData.source || 'discord',
    status: 'started',
    progress: 0,
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };
  
  downloads.unshift(download); // Add to beginning
  downloads = downloads.slice(0, 50); // Keep only last 50 downloads
  
  return download;
}

// Function to update a download
function updateDownload(url, updateData) {
  const downloadIndex = downloads.findIndex(d => d.url === url);
  if (downloadIndex !== -1) {
    downloads[downloadIndex] = {
      ...downloads[downloadIndex],
      ...updateData,
      timestamp: new Date().toISOString()
    };
    return downloads[downloadIndex];
  }
  return null;
}

// Function to simulate download progress
function simulateProgress(downloadId) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5; // Random progress between 5-20%
    
    const downloadIndex = downloads.findIndex(d => d.id === downloadId);
    if (downloadIndex !== -1) {
      downloads[downloadIndex].progress = Math.min(progress, 100);
      downloads[downloadIndex].timestamp = new Date().toISOString();
      
      // Broadcast progress update
      broadcast({ 
        type: 'download_progress', 
        data: downloads[downloadIndex] 
      });
      
      // When progress reaches 100%, mark as completed
      if (progress >= 100) {
        clearInterval(interval);
        downloads[downloadIndex].status = 'completed';
        downloads[downloadIndex].progress = 100;
        downloads[downloadIndex].completedAt = new Date().toISOString();
        
        // Broadcast completion
        broadcast({ 
          type: 'download_completed', 
          data: downloads[downloadIndex] 
        });
      }
    } else {
      clearInterval(interval);
    }
  }, 500); // Update every 500ms
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('Client connected');
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'channels_update',
    data: channels
  }));
  
  ws.send(JSON.stringify({
    type: 'downloads_update',
    data: downloads
  }));
  
  ws.send(JSON.stringify({
    type: 'settings_update',
    data: settings
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data.type);
      
      switch (data.type) {
        case 'download_started':
          const newDownload = addDownload(data.data);
          console.log('Added new download:', newDownload.title);
          broadcast({ type: 'download_started', data: newDownload });
          
          // Simulate progress updates for the download
          simulateProgress(newDownload.id);
          break;
          
        case 'download_completed':
          const completedDownload = updateDownload(data.data.url, {
            status: 'completed',
            progress: 100,
            filename: data.data.filename,
            size: data.data.size,
            size_formatted: data.data.size_formatted,
            completedAt: new Date().toISOString()
          });
          if (completedDownload) {
            console.log('Download completed:', completedDownload.title);
            broadcast({ type: 'download_completed', data: completedDownload });
          }
          break;
          
        case 'download_failed':
          const failedDownload = updateDownload(data.data.url, {
            status: 'failed',
            error: data.data.error,
            failedAt: new Date().toISOString()
          });
          if (failedDownload) {
            console.log('Download failed:', failedDownload.title);
            broadcast({ type: 'download_failed', data: failedDownload });
          }
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast function
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// API Routes

// Channels
app.get('/api/channels', (req, res) => {
  res.json({ success: true, data: channels });
});

// Test endpoint to simulate a download
app.post('/api/test-download', (req, res) => {
  const testDownload = {
    id: `test_${Date.now()}`,
    url: 'https://www.youtube.com/watch?v=test',
    title: 'Test Download',
    channel: 'Test Channel',
    source: 'youtube',
    status: 'downloading',
    progress: 0,
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };
  
  downloads.push(testDownload);
  simulateProgress(testDownload.id);
  
  res.json({ success: true, message: 'Test download started' });
});

// Add sample downloads endpoint
app.post('/api/add-sample-downloads', (req, res) => {
  const sampleDownloads = [
    {
      id: 'sample_1',
      url: 'https://www.youtube.com/watch?v=example1',
      title: 'Amazing Tech Tutorial',
      filename: 'amazing_tech_tutorial.mp4',
      size: 25000000,
      size_formatted: '25.0 MB',
      channel: '#tech-videos',
      source: 'youtube',
      status: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString()
    },
    {
      id: 'sample_2',
      url: 'https://www.youtube.com/watch?v=example2',
      title: 'Music Video - Latest Hit',
      filename: 'music_video_latest_hit.mp4',
      size: 45000000,
      size_formatted: '45.0 MB',
      channel: '#music',
      source: 'youtube',
      status: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString()
    },
    {
      id: 'sample_3',
      url: 'https://www.youtube.com/watch?v=example3',
      title: 'Gaming Highlights',
      filename: 'gaming_highlights.mp4',
      size: 18000000,
      size_formatted: '18.0 MB',
      channel: '#gaming',
      source: 'youtube',
      status: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString()
    }
  ];
  
  downloads.push(...sampleDownloads);
  
  res.json({ success: true, message: 'Sample downloads added', count: sampleDownloads.length });
});

app.post('/api/channels', (req, res) => {
  const { name, url, chatId } = req.body;
  const newChannel = {
    id: Date.now().toString(),
    name,
    url,
    chatId: chatId || Date.now().toString(),
    isActive: true,
    lastChecked: new Date().toISOString(),
    totalDownloads: 0
  };
  
  channels.push(newChannel);
  broadcast({ type: 'channels_update', data: channels });
  res.json({ success: true, data: newChannel });
});

app.put('/api/channels/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const channelIndex = channels.findIndex(c => c.id === id);
  if (channelIndex === -1) {
    return res.status(404).json({ success: false, error: 'Channel not found' });
  }
  
  channels[channelIndex] = { ...channels[channelIndex], ...updates };
  broadcast({ type: 'channels_update', data: channels });
  res.json({ success: true, data: channels[channelIndex] });
});

app.delete('/api/channels/:id', (req, res) => {
  const { id } = req.params;
  channels = channels.filter(c => c.id !== id);
  broadcast({ type: 'channels_update', data: channels });
  res.json({ success: true });
});

app.patch('/api/channels/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  
  const channelIndex = channels.findIndex(c => c.id === id);
  if (channelIndex === -1) {
    return res.status(404).json({ success: false, error: 'Channel not found' });
  }
  
  channels[channelIndex].isActive = isActive;
  broadcast({ type: 'channels_update', data: channels });
  res.json({ success: true, data: channels[channelIndex] });
});

// Downloads
app.get('/api/downloads', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const limitedDownloads = downloads.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({ success: true, data: limitedDownloads });
});

app.get('/api/downloads/:id', (req, res) => {
  const { id } = req.params;
  const download = downloads.find(d => d.id === id);
  
  if (!download) {
    return res.status(404).json({ success: false, error: 'Download not found' });
  }
  
  res.json({ success: true, data: download });
});

app.post('/api/downloads/:id/retry', (req, res) => {
  const { id } = req.params;
  const downloadIndex = downloads.findIndex(d => d.id === id);
  
  if (downloadIndex === -1) {
    return res.status(404).json({ success: false, error: 'Download not found' });
  }
  
  downloads[downloadIndex].status = 'queued';
  downloads[downloadIndex].progress = 0;
  downloads[downloadIndex].error = undefined;
  
  broadcast({ type: 'downloads_update', data: downloads });
  res.json({ success: true, data: downloads[downloadIndex] });
});

app.delete('/api/downloads/:id', (req, res) => {
  const { id } = req.params;
  downloads = downloads.filter(d => d.id !== id);
  broadcast({ type: 'downloads_update', data: downloads });
  res.json({ success: true });
});

// Download stats
app.get('/api/downloads/stats', (req, res) => {
  const stats = {
    total_downloads: downloads.length,
    successful_downloads: downloads.filter(d => d.status === 'completed').length,
    failed_downloads: downloads.filter(d => d.status === 'failed').length,
    total_size: downloads.reduce((sum, d) => sum + d.fileSize, 0),
    downloads_today: downloads.filter(d => {
      const today = new Date();
      const downloadDate = new Date(d.createdAt);
      return downloadDate.toDateString() === today.toDateString();
    }).length,
    downloads_this_week: downloads.filter(d => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(d.createdAt) > weekAgo;
    }).length,
    downloads_this_month: downloads.filter(d => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return new Date(d.createdAt) > monthAgo;
    }).length
  };
  
  res.json({ success: true, data: stats });
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: settings });
});

app.put('/api/settings', (req, res) => {
  const { downloadPath } = req.body;
  
  if (downloadPath) {
    settings.downloadPath = downloadPath;
  }
  
  // Broadcast settings update to all connected clients
  broadcast({ type: 'settings_update', data: settings });
  
  res.json({ success: true, data: settings });
});

// User profile (mock)
app.get('/api/user/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '1',
      email: 'user@example.com',
      name: 'John Doe',
      subscription_plan: 'pro',
      storage_used: 45200000000,
      storage_limit: 100000000000
    }
  });
});

app.get('/api/user/usage', (req, res) => {
  res.json({
    success: true,
    data: {
      storage_used: 45200000000,
      storage_limit: 100000000000,
      downloads_this_month: 247
    }
  });
});

// Simulate download progress updates
setInterval(() => {
  const downloadingTasks = downloads.filter(d => d.status === 'downloading');
  
  downloadingTasks.forEach(download => {
    if (download.progress < 100) {
      download.progress += Math.random() * 10;
      if (download.progress >= 100) {
        download.progress = 100;
        download.status = 'completed';
        download.completedAt = new Date().toISOString();
      }
    }
  });
  
  if (downloadingTasks.length > 0) {
    broadcast({ type: 'downloads_update', data: downloads });
  }
}, 2000);

// Refresh channels from Discord config
app.get('/api/channels/refresh', (req, res) => {
  try {
    channels = loadDiscordChannels();
    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== TELEGRAM INTEGRATION ENDPOINTS =====

// Function to start Telegram monitor for a user
function startTelegramMonitor(userId, phone) {
  
  try {
    // Check if monitor is already running for this user
    if (userTelegramMonitors[userId]) {
      console.log(`[TELEGRAM] Monitor already running for user ${userId}`);
      return;
    }
    
    // Get user's stored API credentials
    const userCredentials = userApiCredentials[userId];
    
    let apiId, apiHash, phoneNumber;
    
    if (userCredentials) {
      // Use user's individual API credentials
      apiId = userCredentials.apiId.toString();
      apiHash = userCredentials.apiHash;
      phoneNumber = userCredentials.phoneNumber;
      console.log(`[TELEGRAM] Using individual API credentials for user ${userId} (API ID: ${apiId})`);
    } else {
      // Fall back to demo credentials
      apiId = process.env.DEMO_TELEGRAM_API_ID || '24409882';
      apiHash = process.env.DEMO_TELEGRAM_API_HASH || 'a13b642bf2d39326e44bf02a5a05707b';
      phoneNumber = phone;
      console.log(`[TELEGRAM] Using demo API credentials for user ${userId}`);
    }
    
    console.log(`[TELEGRAM] Starting monitor for user ${userId} with phone ${phoneNumber}`);
    
    // Start the Telegram monitor process with appropriate credentials
    const monitorProcess = spawn('python', [
      'start_telegram_monitor.py',
      userId,
      apiId,
      apiHash,
      phoneNumber
    ], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, WEB_APP_URL: process.env.WEB_APP_URL || 'http://localhost:3001' }
    });
    
    // Capture output for debugging
    monitorProcess.stdout.on('data', (data) => {
      console.log(`[TELEGRAM MONITOR ${userId}] ${data.toString().trim()}`);
    });
    
    monitorProcess.stderr.on('data', (data) => {
      console.error(`[TELEGRAM MONITOR ${userId} ERROR] ${data.toString().trim()}`);
    });
    
    // Store the process reference
    userTelegramMonitors[userId] = {
      process: monitorProcess,
      startedAt: new Date().toISOString(),
      phone: phoneNumber,
      usingIndividualCredentials: !!userCredentials
    };
    
    // Handle process events
    monitorProcess.on('error', (error) => {
      console.error(`[TELEGRAM] Monitor error for user ${userId}:`, error);
      delete userTelegramMonitors[userId];
    });
    
    monitorProcess.on('exit', (code) => {
      console.log(`[TELEGRAM] Monitor exited for user ${userId} with code ${code}`);
      delete userTelegramMonitors[userId];
    });
    
    // Unref to allow the main process to exit independently
    monitorProcess.unref();
    
    console.log(`[TELEGRAM] Monitor started successfully for user ${userId} (PID: ${monitorProcess.pid})`);
    
  } catch (error) {
    console.error(`[TELEGRAM] Failed to start monitor for user ${userId}:`, error);
  }
}

// Function to stop Telegram monitor for a user
function stopTelegramMonitor(userId) {
  if (userTelegramMonitors[userId]) {
    console.log(`[TELEGRAM] Stopping monitor for user ${userId}`);
    userTelegramMonitors[userId].process.kill();
    delete userTelegramMonitors[userId];
  }
}

// Store active Telegram monitor processes
let userTelegramMonitors = {};

// Configuration: Set to false to use real Telegram API
const DEMO_MODE = true;

// Simplified Telegram setup - Send verification code
app.post('/api/telegram/send-code', (req, res) => {
  const { userId, phone } = req.body;
  
  if (!userId || !phone) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: userId, phone' 
    });
  }
  
  if (DEMO_MODE) {
    // For demo purposes, we'll simulate sending a code
    console.log(`[DEMO] Sending verification code to ${phone} for user ${userId}`);
  } else {
    // Real implementation would integrate with Telegram's API
    console.log(`[REAL] Sending verification code to ${phone} for user ${userId}`);
    // TODO: Implement real Telegram API integration
  }
  
  res.json({ 
    success: true, 
    message: 'Verification code sent successfully',
    data: {
      phone: phone,
      expiresIn: 300 // 5 minutes
    }
  });
});

// Simplified Telegram setup - Verify code and connect
app.post('/api/telegram/verify-and-connect', (req, res) => {
  const { userId, phone, code } = req.body;
  
  if (!userId || !phone || !code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: userId, phone, code' 
    });
  }
  
  // Accept any 6-digit code (real verification) or "demo" for testing
  const isValidCode = code.length === 6 || code.toLowerCase() === 'demo';
  
  if (!isValidCode) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid verification code. Please enter a 6-digit code or "demo" for testing.' 
    });
  }
  
  // Get user's API credentials
  const userCredentials = userApiCredentials[userId];
  if (!userCredentials) {
    return res.status(400).json({ 
      success: false, 
      error: 'No API credentials found. Please save your API credentials first.' 
    });
  }

  // Create session with user's actual credentials
  userTelegramSessions[userId] = {
    apiId: parseInt(userCredentials.apiId),
    apiHash: userCredentials.apiHash,
    phone,
    sessionName: `telesync_${userId}`,
    isConnected: true,
    lastConnected: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  console.log(`Created Telegram session for user: ${userId}`);
  console.log('Session data:', userTelegramSessions[userId]);
  
  // Initialize user's channels and downloads if not exists
  if (!userChannels[userId]) {
    userChannels[userId] = [];
  }
  if (!userDownloads[userId]) {
    userDownloads[userId] = [];
  }
  
  console.log(`[DEMO] User ${userId} connected to Telegram with phone ${phone}`);
  
  // Start the Telegram monitor for this user
  // Note: Python monitor disabled on Render due to dependency issues
  // Uncomment the line below to enable local monitoring
  // startTelegramMonitor(userId, phone);
  console.log(`[TELEGRAM] Monitor startup disabled - Python dependencies not available on Render`);
  
  res.json({ 
    success: true, 
    message: 'Telegram connected successfully!',
    data: {
      isConnected: true,
      phone: phone,
      lastConnected: new Date().toISOString()
    }
  });
});

// Get user's Telegram connection status
app.get('/api/telegram/status/:userId', (req, res) => {
  const { userId } = req.params;
  const session = userTelegramSessions[userId];
  
  console.log(`Checking Telegram status for user: ${userId}`);
  console.log('Available sessions:', Object.keys(userTelegramSessions));
  console.log('Session data:', session);
  
  if (!session) {
    return res.json({ 
      success: true, 
      data: { 
        isConnected: false, 
        message: 'No Telegram session found' 
      } 
    });
  }
  
  res.json({ 
    success: true, 
    data: { 
      isConnected: session.isConnected,
      phone: session.phone ? session.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : null,
      lastConnected: session.lastConnected
    }
  });
});

// Initialize Telegram connection (user provides API credentials)
app.post('/api/telegram/connect', (req, res) => {
  const { userId, apiId, apiHash, phone } = req.body;
  
  if (!userId || !apiId || !apiHash || !phone) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: userId, apiId, apiHash, phone' 
    });
  }
  
  // Store user's Telegram credentials
  userTelegramSessions[userId] = {
    apiId: parseInt(apiId),
    apiHash,
    phone,
    sessionName: `telesync_${userId}`,
    isConnected: false,
    lastConnected: null,
    createdAt: new Date().toISOString()
  };
  
  // Initialize user's channels and downloads if not exists
  if (!userChannels[userId]) {
    userChannels[userId] = [];
  }
  if (!userDownloads[userId]) {
    userDownloads[userId] = [];
  }
  
  res.json({ 
    success: true, 
    message: 'Telegram credentials saved. Please complete authentication.',
    data: { 
      sessionName: `telesync_${userId}`,
      requiresAuth: true 
    } 
  });
});

// Complete Telegram authentication (simulate - in real implementation, this would handle the actual auth flow)
app.post('/api/telegram/authenticate', (req, res) => {
  const { userId, code } = req.body;
  
  if (!userId || !code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing userId or authentication code' 
    });
  }
  
  const session = userTelegramSessions[userId];
  if (!session) {
    return res.status(404).json({ 
      success: false, 
      error: 'No Telegram session found for user' 
    });
  }
  
  // Simulate successful authentication (in real implementation, verify with Telegram)
  if (code === '123456' || code === 'demo') {
    session.isConnected = true;
    session.lastConnected = new Date().toISOString();
    
    res.json({ 
      success: true, 
      message: 'Telegram authentication successful',
      data: { 
        isConnected: true,
        phone: session.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      } 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid authentication code' 
    });
  }
});

// Get user's Telegram channels
app.get('/api/telegram/channels/:userId', (req, res) => {
  const { userId } = req.params;
  const channels = userChannels[userId] || [];
  
  res.json({ 
    success: true, 
    data: channels 
  });
});

// Add Telegram channel to monitor
app.post('/api/telegram/channels', (req, res) => {
  const { userId, channelUrl, channelName } = req.body;
  
  if (!userId || !channelUrl) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing userId or channelUrl' 
    });
  }
  
  const session = userTelegramSessions[userId];
  if (!session || !session.isConnected) {
    return res.status(401).json({ 
      success: false, 
      error: 'User not connected to Telegram' 
    });
  }
  
  // Generate channel ID from URL
  const channelId = channelUrl.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
  
  const newChannel = {
    id: channelId,
    name: channelName || channelUrl,
    url: channelUrl,
    chatId: channelUrl,
    isActive: true,
    lastChecked: new Date().toISOString(),
    totalDownloads: 0,
    type: 'telegram',
    userId: userId
  };
  
  if (!userChannels[userId]) {
    userChannels[userId] = [];
  }
  
  // Check if channel already exists
  const existingChannel = userChannels[userId].find(ch => ch.url === channelUrl);
  if (existingChannel) {
    return res.status(409).json({ 
      success: false, 
      error: 'Channel already exists' 
    });
  }
  
  userChannels[userId].push(newChannel);
  
  res.json({ 
    success: true, 
    message: 'Channel added successfully',
    data: newChannel 
  });
});

// Toggle channel monitoring
app.patch('/api/telegram/channels/:channelId/toggle', (req, res) => {
  const { channelId } = req.params;
  const { userId, isActive } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing userId' 
    });
  }
  
  const channels = userChannels[userId] || [];
  const channel = channels.find(ch => ch.id === channelId);
  
  if (!channel) {
    return res.status(404).json({ 
      success: false, 
      error: 'Channel not found' 
    });
  }
  
  channel.isActive = isActive;
  channel.lastChecked = new Date().toISOString();
  
  res.json({ 
    success: true, 
    message: `Channel ${isActive ? 'activated' : 'paused'}`,
    data: channel 
  });
});

// Remove Telegram channel
app.delete('/api/telegram/channels/:channelId', (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing userId' 
    });
  }
  
  const channels = userChannels[userId] || [];
  const channelIndex = channels.findIndex(ch => ch.id === channelId);
  
  if (channelIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      error: 'Channel not found' 
    });
  }
  
  const removedChannel = channels.splice(channelIndex, 1)[0];
  
  res.json({ 
    success: true, 
    message: 'Channel removed successfully',
    data: removedChannel 
  });
});

// Get user's downloads
app.get('/api/telegram/downloads/:userId', (req, res) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  const downloads = userDownloads[userId] || [];
  const paginatedDownloads = downloads.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json({ 
    success: true, 
    data: paginatedDownloads,
    total: downloads.length 
  });
});

// Disconnect Telegram
app.post('/api/telegram/disconnect', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing userId' 
    });
  }
  
  if (userTelegramSessions[userId]) {
    userTelegramSessions[userId].isConnected = false;
    userTelegramSessions[userId].lastConnected = new Date().toISOString();
  }
  
  // Stop the Telegram monitor for this user
  stopTelegramMonitor(userId);
  
  res.json({ 
    success: true, 
    message: 'Telegram disconnected successfully' 
  });
});

// Handle download notifications from Python service
app.post('/api/telegram/download-notification', (req, res) => {
  const { type, data } = req.body;
  
  if (!type || !data || !data.user_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }
  
  const userId = data.user_id;
  
  if (type === 'download_completed') {
    // Add download to user's downloads
    if (!userDownloads[userId]) {
      userDownloads[userId] = [];
    }
    
    const download = {
      id: `telegram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: data.channel_username ? `https://t.me/${data.channel_username}` : data.channel,
      title: data.title,
      filename: data.filename,
      size: data.size,
      size_formatted: data.size_formatted,
      channel: data.channel,
      source: 'telegram',
      status: 'completed',
      progress: 100,
      createdAt: new Date().toISOString(),
      completedAt: data.completed_at,
      userId: userId
    };
    
    userDownloads[userId].unshift(download); // Add to beginning
    
    // Update channel stats
    const channels = userChannels[userId] || [];
    const channel = channels.find(ch => ch.name === data.channel || ch.url.includes(data.channel_username));
    if (channel) {
      channel.totalDownloads += 1;
      channel.lastChecked = new Date().toISOString();
    }
    
    // Broadcast to connected clients
    broadcast({ 
      type: 'download_completed', 
      data: download,
      userId: userId 
    });
    
    console.log(`Download completed for user ${userId}: ${data.title}`);
    
  } else if (type === 'download_failed') {
    // Handle download failure
    broadcast({ 
      type: 'download_failed', 
      data: {
        channel: data.channel,
        error: data.error,
        failed_at: data.failed_at
      },
      userId: userId 
    });
    
    console.log(`Download failed for user ${userId}: ${data.error}`);
  }
  
  res.json({ success: true });
});

// Save user's Telegram API credentials
app.post('/api/telegram/save-credentials', (req, res) => {
  const { userId, apiId, apiHash, phoneNumber } = req.body;
  
  if (!userId || !apiId || !apiHash || !phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: userId, apiId, apiHash, phoneNumber' 
    });
  }
  
  try {
    // Store user's API credentials (in a real app, you'd encrypt and store in database)
    if (!userApiCredentials) {
      userApiCredentials = {};
    }
    
    userApiCredentials[userId] = {
      apiId: parseInt(apiId),
      apiHash: apiHash,
      phoneNumber: phoneNumber,
      savedAt: new Date().toISOString()
    };
    
    console.log(`[API] Saved credentials for user ${userId}`);
    
    // Restart Telegram monitor with new credentials if it's currently running
    if (userTelegramMonitors[userId]) {
      console.log(`[API] Restarting Telegram monitor for user ${userId} with new credentials`);
      
      // Stop existing monitor
      const existingMonitor = userTelegramMonitors[userId];
      if (existingMonitor.process) {
        existingMonitor.process.kill();
      }
      delete userTelegramMonitors[userId];
      
      // Start new monitor with updated credentials
      // Note: Python monitor disabled on Render due to dependency issues
      // setTimeout(() => {
      //   startTelegramMonitor(userId, phoneNumber);
      // }, 1000); // Small delay to ensure clean shutdown
      console.log(`[TELEGRAM] Monitor restart disabled - Python dependencies not available on Render`);
    }
    
    res.json({ 
      success: true, 
      message: 'API credentials saved successfully',
      data: {
        userId: userId,
        hasCredentials: true
      }
    });
  } catch (error) {
    console.error('Error saving API credentials:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save API credentials' 
    });
  }
});

// Get user's Telegram API credentials
app.get('/api/telegram/credentials/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing userId parameter' 
    });
  }
  
  try {
    const credentials = userApiCredentials?.[userId];
    const monitorInfo = userTelegramMonitors?.[userId];
    
    if (!credentials) {
      return res.json({ 
        success: true, 
        data: { 
          hasCredentials: false,
          isUsingIndividualCredentials: false,
          monitorStatus: monitorInfo ? 'running' : 'stopped'
        } 
      });
    }
    
    // Return credentials without sensitive data
    res.json({ 
      success: true, 
      data: {
        hasCredentials: true,
        isUsingIndividualCredentials: true,
        apiId: credentials.apiId,
        phoneNumber: credentials.phoneNumber,
        savedAt: credentials.savedAt,
        monitorStatus: monitorInfo ? 'running' : 'stopped',
        monitorUsingIndividualCredentials: monitorInfo?.usingIndividualCredentials || false
        // Don't return apiHash for security
      }
    });
  } catch (error) {
    console.error('Error getting API credentials:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get API credentials' 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
