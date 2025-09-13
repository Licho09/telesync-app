# Discord Bot Setup Guide

This guide will help you set up the Discord bot to automatically download videos from Discord channels.

## 🚀 Quick Start

### Step 1: Create a Discord Bot

1. **Go to Discord Developer Portal**
   - Visit https://discord.com/developers/applications
   - Click "New Application"
   - Give it a name like "TeleSync Downloader"

2. **Create the Bot**
   - Go to the "Bot" section in the left sidebar
   - Click "Add Bot"
   - Copy the bot token (keep this secret!)

3. **Set Bot Permissions**
   - Go to "OAuth2" > "URL Generator"
   - Select "bot" scope
   - Select these permissions:
     - Read Messages
     - Send Messages
     - Attach Files
     - Embed Links
     - Read Message History

4. **Invite Bot to Server**
   - Copy the generated URL
   - Open it in your browser
   - Select your server and authorize

### Step 2: Install Dependencies

```bash
pip install discord.py aiohttp aiofiles
```

### Step 3: Configure the Bot

1. **Edit the script** with your bot token:
   ```python
   BOT_TOKEN = 'your_actual_bot_token_here'
   ```

2. **Run the bot**:
   ```bash
   python discord_downloader.py
   ```

### Step 4: Add Channels to Monitor

In any Discord channel where you want to monitor for videos:

```
!add_channel
```

The bot will respond with a confirmation message.

## 🤖 Bot Commands

- `!add_channel` - Add current channel to monitoring
- `!remove_channel` - Remove current channel from monitoring  
- `!list_channels` - List all monitored channels
- `!stats` - Show download statistics
- `!help_downloader` - Show help message

## 📁 How It Works

1. **Automatic Detection**: Bot monitors specified channels for new messages
2. **Video Detection**: Automatically detects video attachments and video links
3. **Download**: Downloads videos to organized folders
4. **Organization**: Files are saved in `discord_downloads/ChannelName/timestamp_filename.mp4`
5. **Notifications**: Bot sends confirmation messages when videos are downloaded

## 🔧 Configuration

### Supported Video Formats
- `.mp4`, `.avi`, `.mov`, `.mkv`, `.wmv`, `.flv`, `.webm`, `.m4v`

### Supported Video Links (Detection Only)
- YouTube, Vimeo, Dailymotion, Twitch, Streamable, Gfycat, Reddit

### File Organization
```
discord_downloads/
├── general/
│   ├── 20241201_143022_video.mp4
│   └── 20241201_150315_clip.webm
├── memes/
│   └── 20241201_160000_funny.mp4
└── videos/
    └── 20241201_170000_tutorial.mkv
```

## 🚨 Important Notes

### Permissions
- Bot needs to be in the same server as the channels you want to monitor
- Bot needs "Read Messages" permission in those channels
- Bot needs "Send Messages" permission to send download confirmations

### Rate Limits
- Discord has rate limits for API calls
- The bot includes proper delays to avoid limits
- Don't run multiple instances of the bot

### File Size Limits
- Discord has attachment size limits (usually 8MB for free servers, 25MB for Nitro)
- Large videos may not be downloadable if they exceed these limits

## 🔧 Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if bot token is correct
   - Verify bot has proper permissions
   - Check if bot is online in Discord

2. **Can't add channels**
   - Make sure bot has "Read Messages" permission
   - Check if you're using the command in the right channel

3. **Downloads failing**
   - Check disk space
   - Verify file permissions
   - Check network connection

4. **Bot not detecting videos**
   - Make sure the file has a video extension
   - Check if the attachment is actually a video file

### Getting Help

1. Check the logs in `discord_downloader.log`
2. Verify your configuration in `discord_config.json`
3. Test with a simple video file first
4. Check Discord API documentation

## 🎉 You're Ready!

Once everything is set up:

1. **Run the bot**: `python discord_downloader.py`
2. **Add channels**: Use `!add_channel` in Discord channels
3. **Post videos**: Upload video files to monitored channels
4. **Watch downloads**: Bot will automatically download and organize files

The bot will automatically download any video files posted to monitored channels and organize them in the `discord_downloads/` folder.

## 🔄 Integration with Web App

The Discord bot can be integrated with your TeleSync web application:

1. **Run both**: Discord bot + web app simultaneously
2. **Monitor both**: Telegram channels + Discord channels
3. **Unified dashboard**: Web app can show downloads from both sources
4. **Centralized management**: Manage all channels from one interface

Happy downloading! 🎬📥




