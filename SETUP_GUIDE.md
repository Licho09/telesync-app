# TeleSync Setup Guide

This guide will help you set up both the web application and the Python Telegram downloader for a complete automated video downloading solution.

## 🚀 Quick Start

### Option 1: Web Application Only (Demo/UI)
If you just want to see the beautiful interface and test the functionality:

```bash
# Install dependencies
npm install

# Start the application
npm run dev:full
```

Open http://localhost:5173 in your browser.

### Option 2: Full Setup with Python Downloader (Production)
For actual Telegram video downloading, you'll need both the web app and Python script.

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.8+ and pip
- Telegram account
- Telegram API credentials (from https://my.telegram.org)

## 🔧 Step-by-Step Setup

### 1. Get Telegram API Credentials

1. Go to https://my.telegram.org
2. Log in with your phone number
3. Go to "API development tools"
4. Create a new application
5. Note down your `api_id` and `api_hash`

### 2. Set Up the Web Application

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your Supabase credentials (optional for demo):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001/ws
```

Start the web application:
```bash
npm run dev:full
```

### 3. Set Up the Python Downloader

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy and edit configuration
cp config.example.json config.json
```

Edit `config.json` with your Telegram channels:
```json
{
  "channels": [
    "@your_channel_name",
    "@another_channel"
  ],
  "download_path": "downloads"
}
```

Edit `telegram_downloader.py` with your API credentials:
```python
API_ID = 123456  # Your API ID
API_HASH = 'your_api_hash_here'  # Your API hash
PHONE = '+1234567890'  # Your phone number
```

Run the Python downloader:
```bash
python telegram_downloader.py
```

## 🎯 How It Works

### Web Application
- **Landing Page**: Beautiful marketing page showcasing features
- **Authentication**: Google OAuth or email magic links via Supabase
- **Dashboard**: Real-time monitoring of channels and downloads
- **API Server**: Express.js backend with WebSocket for live updates

### Python Downloader
- **Telethon Integration**: Uses official Telegram client library
- **Automatic Monitoring**: Listens for new videos in specified channels
- **Smart Organization**: Downloads to channel-specific folders
- **Statistics Tracking**: Logs download success/failure rates

## 🔄 Integration Options

### Option A: Standalone Python Script
Run the Python script independently for simple automation:
```bash
python telegram_downloader.py
```

### Option B: Web App + Python Integration
1. Run the web app for monitoring and management
2. Run the Python script for actual downloading
3. Use the web dashboard to add/remove channels
4. Python script automatically updates its config

### Option C: Full Production Setup
1. Deploy web app to Vercel/Netlify
2. Deploy Python script to a VPS or cloud function
3. Set up Supabase for authentication and data storage
4. Configure Telegram bot for advanced features

## 📁 File Structure

```
project/
├── src/                          # React frontend
│   ├── components/               # UI components
│   ├── contexts/                 # React contexts
│   └── services/                 # API services
├── server.js                     # Express.js backend
├── telegram_downloader.py        # Python Telegram client
├── config.json                   # Python script configuration
├── requirements.txt              # Python dependencies
└── package.json                  # Node.js dependencies
```

## 🛠️ Configuration

### Web App Configuration
- **Environment Variables**: Set in `.env` file
- **Supabase**: For authentication and data storage
- **API Endpoints**: Backend server configuration

### Python Script Configuration
- **API Credentials**: Telegram API ID and hash
- **Phone Number**: Your Telegram phone number
- **Channels**: List of channels to monitor
- **Download Path**: Where to save downloaded videos

## 🚨 Important Notes

### Security
- Never commit your API credentials to version control
- Use environment variables for sensitive data
- Keep your session files secure

### Rate Limits
- Telegram has rate limits for API calls
- The script includes proper delays to avoid limits
- Monitor your usage to stay within limits

### Legal Considerations
- Only download content you have permission to download
- Respect copyright and terms of service
- Use responsibly and ethically

## 🔧 Troubleshooting

### Common Issues

1. **"require is not defined" error**
   - Fixed: Server now uses ES modules

2. **Telegram API errors**
   - Check your API credentials
   - Ensure your phone number is correct
   - Verify you have access to the channels

3. **Permission errors**
   - Make sure you're a member of the channels
   - Check if channels are private/public

4. **Download failures**
   - Check disk space
   - Verify network connection
   - Check file permissions

### Getting Help

1. Check the logs in `telegram_downloader.log`
2. Verify your configuration in `config.json`
3. Test with a simple channel first
4. Check Telegram API documentation

## 🎉 You're Ready!

Once everything is set up:

1. **Web App**: Visit http://localhost:5173
2. **Python Script**: Run `python telegram_downloader.py`
3. **Add Channels**: Use the web interface or edit `config.json`
4. **Monitor Downloads**: Watch the dashboard for real-time updates

The system will automatically download any new videos posted to your monitored channels and organize them in the `downloads/` folder.

Happy downloading! 🎬📥




