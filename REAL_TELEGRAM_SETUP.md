# Real Telegram API Setup Guide

## 🎯 Current Status
- ✅ **Demo Mode**: Working perfectly for interface testing
- 🔧 **Real API**: Ready to configure

## Step 1: Get Telegram API Credentials

1. **Go to**: https://my.telegram.org
2. **Log in** with your phone number
3. **Go to**: "API development tools"
4. **Create new application**:
   - App title: "TeleSync"
   - Short name: "telesync"
   - Platform: Desktop
5. **Copy your credentials**:
   - API ID (number)
   - API Hash (string)

## Step 2: Configure Real API

### Option A: Quick Test (Single User)
1. **Edit** `telegram_config.json`:
```json
{
  "api_id": "YOUR_ACTUAL_API_ID",
  "api_hash": "YOUR_ACTUAL_API_HASH", 
  "phone": "+YOUR_PHONE_NUMBER",
  "channels": ["@your_channel"],
  "download_path": "telegram_downloads",
  "session_name": "telesync_session"
}
```

2. **Run the real downloader**:
```bash
python telegram_downloader.py
```

### Option B: Multi-User Setup (Advanced)
The system supports multiple users with their own API credentials through the web interface.

## Step 3: Test Real Integration

1. **Keep demo mode** for interface testing
2. **Use real API** for actual downloads
3. **Switch between modes** as needed

## Step 4: Channels to Monitor

Add channels you want to monitor:
- `@channelname` (public channels)
- `https://t.me/channelname` (full URLs)
- Channel IDs (for private channels)

## Security Notes

- ⚠️ **Never commit** your API credentials to version control
- 🔒 **Keep** `telegram_config.json` in `.gitignore`
- 🛡️ **Use environment variables** for production

## Troubleshooting

### Common Issues:
1. **"Flood wait"**: Too many requests - wait and retry
2. **"Phone number invalid"**: Use international format (+1234567890)
3. **"API ID/Hash invalid"**: Double-check credentials from my.telegram.org

### Getting Help:
- Check `telegram_downloader.log` for detailed logs
- Verify credentials at https://my.telegram.org
- Test with a simple channel first


