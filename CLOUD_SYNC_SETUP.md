# TeleSync Cloud Sync Setup Guide

This guide explains how to set up TeleSync with cloud storage for 24/7 monitoring and local sync capabilities.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Telegram      │    │   Cloud Server   │    │   User's PC     │
│   Channels      │───▶│  (Always On)     │    │  (When Online)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Cloud Storage   │    │  Local Sync     │
                       │ (Supabase/S3)    │◀───│  Service        │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Cloud Server Setup (24/7 Monitoring)

Deploy the cloud monitor to a platform like Railway, Render, or Heroku:

#### Environment Variables
```bash
# Cloud Storage (choose one)
# Option 1: Supabase (Recommended for getting started)
SUPABASE_URL=https://iausgqikbmhkkicmuzei.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdXNncWlrYm1oa2tpY211emVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTQ2NjEsImV4cCI6MjA3MzM3MDY2MX0.EGXA8llbbTQ3QvhttQN_sIklVM0ymBQ0VZ2qYva45js
SUPABASE_BUCKET=telesync-files
CLOUD_STORAGE_TYPE=supabase

# Option 2: AWS S3 (For scaling up)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=telesync-files-your-unique-id
S3_REGION=us-east-1
CLOUD_STORAGE_TYPE=s3

# Option 3: Local (for testing)
CLOUD_STORAGE_TYPE=local
```

#### Deploy to Railway
1. Create a new Railway project
2. Connect your GitHub repository
3. Set environment variables
4. Deploy with `telegram_monitor_cloud.py` as the entry point

#### Deploy to Render
1. Create a new Web Service
2. Connect your repository
3. Set environment variables
4. Use `telegram_monitor_cloud.py` as the start command

### 2. Local Sync Setup (User's PC)

#### Option A: Desktop App (Recommended)
```bash
# Install dependencies
pip install -r requirements.txt

# Run desktop sync app
python desktop_sync_app.py
```

#### Option B: Command Line
```bash
# Run sync service
python local_sync_service.py your_user_id /path/to/sync/folder

# Or run with custom settings
python -c "
import asyncio
from local_sync_service import LocalSyncService

async def main():
    sync = LocalSyncService('your_user_id', '/path/to/sync')
    await sync.sync_all_files()

asyncio.run(main())
"
```

## 📁 File Structure

```
project/
├── cloud_storage_service.py      # Cloud storage abstraction
├── local_sync_service.py         # Local sync service
├── telegram_monitor_cloud.py     # Cloud-based monitor
├── desktop_sync_app.py           # Desktop GUI app
├── telegram_monitor.py           # Updated with cloud storage
└── cloud_storage/                # Local cloud storage (fallback)
    ├── metadata.json
    └── user_id/
        └── channel_name/
            └── files...
```

## 🔧 Configuration

### Cloud Storage Options

#### 1. Supabase (Recommended for Getting Started)
- **Free tier**: 1GB storage, 2GB bandwidth forever
- **Easy setup**: 5-minute setup, no complex configuration
- **Built-in features**: Database, auth, and storage in one platform
- **Great for development**: Perfect for testing and small-scale deployment

```bash
# Setup Supabase (See SUPABASE_SETUP.md for detailed guide)
1. Create account at supabase.com
2. Create new project
3. Go to Storage > Create bucket
4. Set bucket name: telesync-files
5. Get URL and anon key from Settings > API
```

**Cost Example**: Free for 1GB, then $25/month for 8GB

#### 2. AWS S3 (For Scaling Up)
- **Pay-as-you-use**: Only pay for what you store and transfer
- **Highly scalable**: Can handle any amount of data
- **Cost-effective**: ~$0.023/GB/month for storage
- **Reliable**: 99.999999999% durability

```bash
# Setup AWS S3 (See AWS_S3_SETUP.md for detailed guide)
1. Create AWS account (free tier available)
2. Create S3 bucket with unique name
3. Create IAM user with S3 permissions
4. Get access key and secret key
5. Set environment variables
```

**Cost Example**: 10GB storage + 2GB transfer = ~$0.41/month

#### 3. Local Storage (Testing)
- Files stored in `cloud_storage/` folder
- Good for development and testing
- No external dependencies

### Multi-User Configuration

For multiple users, create `cloud_user_configs.json`:

```json
{
  "user1": {
    "api_id": 123456,
    "api_hash": "your_hash",
    "phone": "+1234567890",
    "channels": ["@channel1", "@channel2"]
  },
  "user2": {
    "api_id": 789012,
    "api_hash": "another_hash", 
    "phone": "+0987654321",
    "channels": ["@channel3"]
  }
}
```

## 🔄 How It Works

### 1. Real-time Monitoring (Cloud Server)
- Telegram monitor runs 24/7 on cloud server
- Detects new videos in monitored channels
- Downloads files temporarily
- Uploads to cloud storage
- Cleans up temporary files

### 2. Cloud Storage
- Files stored permanently in cloud
- Organized by user and channel
- Metadata tracked for sync management
- Accessible via web interface

### 3. Local Sync (User's PC)
- Sync service runs when PC is online
- Downloads new files from cloud storage
- Organizes files in local folder structure
- Tracks sync status and progress

### 4. Web Interface
- Shows all files from cloud storage
- Real-time sync status
- Download individual files
- Manage sync settings

## 📊 Sync Status

The system tracks:
- Last sync time
- Total files synced
- Total storage used
- Failed downloads
- Sync progress

## 🛠️ Troubleshooting

### Common Issues

#### 1. Cloud Upload Fails
- Check cloud storage credentials
- Verify network connectivity
- Check file size limits
- Review cloud storage quotas

#### 2. Local Sync Not Working
- Verify user ID matches cloud server
- Check local sync path permissions
- Ensure cloud storage is accessible
- Review sync service logs

#### 3. Telegram Connection Issues
- Verify API credentials
- Check phone number format
- Ensure session files are valid
- Review Telegram API limits

### Logs
- Cloud monitor: `telegram_monitor_cloud.log`
- Local sync: `local_sync.log`
- Desktop app: `desktop_sync.log`
- Cloud storage: `cloud_storage.log`

## 🔒 Security Considerations

1. **API Keys**: Store securely, never commit to version control
2. **Session Files**: Keep Telegram session files secure
3. **Cloud Storage**: Use proper access controls
4. **Network**: Use HTTPS for all communications
5. **Local Files**: Consider encryption for sensitive content

## 📈 Scaling

### For Multiple Users
- Use multi-user configuration file
- Deploy multiple cloud monitor instances
- Use load balancer for high availability
- Consider database for metadata storage

### For High Volume
- Use message queues (Redis/RabbitMQ)
- Implement file deduplication
- Use CDN for file delivery
- Monitor storage costs and limits

## 💰 Cost Estimation

### Supabase (Getting Started)
- **Free tier**: 1GB storage, 2GB bandwidth forever
- **Pro tier**: $25/month for 8GB storage, 250GB bandwidth
- **Example**: Free for 1GB, then $25/month for 8GB

### AWS S3 (Scaling Up)
- **Storage**: $0.023/GB/month
- **Transfer**: $0.09/GB (first 1GB free)
- **Requests**: $0.0004/1000 requests
- **Example**: 10GB storage + 2GB transfer = ~$0.41/month

### Cloud Hosting
- Railway: $5/month for hobby plan
- Render: Free tier available
- Heroku: $7/month for basic dyno

### Total Monthly Cost Examples
**Getting Started (Supabase)**:
- **Supabase**: Free (1GB storage)
- **Railway hosting**: $5.00
- **Total**: ~$5.00/month

**Scaling Up (AWS S3)**:
- **AWS S3**: $0.41 (10GB storage)
- **Railway hosting**: $5.00
- **Total**: ~$5.41/month for 10GB of files

## 🎯 Next Steps

1. **Deploy cloud monitor** to your preferred platform
2. **Set up Supabase** (see SUPABASE_SETUP.md for detailed guide)
3. **Install desktop sync app** on your PC
4. **Configure channels** via web interface
5. **Test sync functionality** with a few files
6. **Monitor logs** for any issues
7. **Scale as needed** for multiple users

## 📞 Support

For issues or questions:
1. Check the logs for error messages
2. Verify configuration settings
3. Test with a simple setup first
4. Review this guide for common solutions

The cloud sync system provides reliable 24/7 monitoring with flexible local sync options, making it perfect for users who want their Telegram files available even when their PC is off!
