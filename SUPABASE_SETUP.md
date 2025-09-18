# Supabase Setup Guide for TeleSync

This guide will walk you through setting up Supabase for cloud storage with TeleSync. Supabase is perfect for getting started because it's:
- **Free tier**: 1GB storage, 2GB bandwidth
- **Easy setup**: No complex AWS configuration
- **Built-in features**: Database, auth, and storage in one platform
- **Great for development**: Perfect for testing and small-scale deployment

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new organization if prompted

### Step 2: Create New Project

1. Click "New Project"
2. **Organization**: Select your organization
3. **Name**: `telesync-storage` (or any name you prefer)
4. **Database Password**: Create a strong password (save this!)
5. **Region**: Choose closest to your users
6. Click "Create new project"

Wait 2-3 minutes for the project to be created.

### Step 3: Create Storage Bucket

1. In your project dashboard, go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. **Name**: `telesync-files`
4. **Public bucket**: Leave unchecked (for security)
5. Click **"Create bucket"**

### Step 4: Get API Credentials

1. Go to **Settings** → **API** in the left sidebar
2. Copy these values:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Step 5: Configure TeleSync

Set these environment variables in your cloud server:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=telesync-files

# Cloud Storage Type
CLOUD_STORAGE_TYPE=supabase
```

#### For Railway Deployment
```bash
# In Railway dashboard, go to your project
# Click on "Variables" tab
# Add these environment variables:
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=telesync-files
CLOUD_STORAGE_TYPE=supabase
```

#### For Render Deployment
```bash
# In Render dashboard, go to your service
# Click on "Environment" tab
# Add these environment variables:
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=telesync-files
CLOUD_STORAGE_TYPE=supabase
```

## 🧪 Test Your Setup

Create a test script to verify everything works:

```python
# test_supabase_setup.py
import os
import asyncio
from cloud_storage_service import cloud_storage, FileMetadata
from pathlib import Path

async def test_supabase():
    # Create a test file
    test_file = Path("test_file.txt")
    test_file.write_text("Hello from TeleSync!")
    
    # Create metadata
    metadata = FileMetadata(
        user_id="test-user",
        channel_name="test-channel",
        channel_username="test",
        filename="test_file.txt",
        file_size=test_file.stat().st_size,
        file_type="text/plain",
        cloud_path="",
        local_path=str(test_file)
    )
    
    # Upload to Supabase
    print("Uploading test file to Supabase...")
    success = await cloud_storage.upload_file(test_file, metadata)
    
    if success:
        print("✅ Upload successful!")
        print(f"Cloud path: {metadata.cloud_path}")
        
        # Test download
        print("Testing download...")
        download_path = Path("downloaded_test.txt")
        download_success = await cloud_storage.download_file(metadata.cloud_path, download_path)
        
        if download_success:
            print("✅ Download successful!")
            print(f"Downloaded content: {download_path.read_text()}")
        else:
            print("❌ Download failed")
    else:
        print("❌ Upload failed")
    
    # Cleanup
    test_file.unlink()
    if download_path.exists():
        download_path.unlink()

if __name__ == "__main__":
    asyncio.run(test_supabase())
```

Run the test:
```bash
python test_supabase_setup.py
```

## 📊 Supabase Pricing

### Free Tier (Perfect for Getting Started)
- **Storage**: 1GB
- **Bandwidth**: 2GB/month
- **Database**: 500MB
- **API requests**: 50,000/month
- **Duration**: Forever (no expiration)

### Pro Tier (When You Scale)
- **Storage**: 8GB included, then $0.021/GB/month
- **Bandwidth**: 250GB/month included, then $0.09/GB
- **Database**: 8GB included, then $0.125/GB/month
- **Cost**: $25/month

### Example Costs
- **Free tier**: Perfect for testing and small deployments
- **10GB storage**: $25/month (Pro tier)
- **100GB storage**: $25 + (92GB × $0.021) = ~$27/month

## 🔒 Security Setup

### 1. Row Level Security (RLS)
Enable RLS on your storage bucket:

1. Go to **Storage** → **Policies**
2. Click **"New Policy"**
3. Select **"For full customization"**
4. Add this policy:

```sql
-- Allow users to upload files
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to download their own files
CREATE POLICY "Users can download own files" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Bucket Permissions
1. Go to **Storage** → **Buckets**
2. Click on your `telesync-files` bucket
3. **Public bucket**: Keep unchecked
4. **File size limit**: Set to 50MB (or your preference)

## 🚀 Migration to AWS S3 (When You Scale)

When you're ready to scale, migrating to AWS S3 is easy:

### 1. Set Up AWS S3
Follow the `AWS_S3_SETUP.md` guide

### 2. Update Environment Variables
```bash
# Change from Supabase to S3
CLOUD_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=telesync-files
S3_REGION=us-east-1
```

### 3. Migrate Existing Files (Optional)
Create a migration script:

```python
# migrate_to_s3.py
import asyncio
from cloud_storage_service import CloudStorageService

async def migrate_files():
    # Initialize both storage services
    supabase_storage = CloudStorageService("supabase")
    s3_storage = CloudStorageService("s3")
    
    # Get all files from Supabase
    files = await supabase_storage.get_user_files("all")
    
    for file_info in files:
        # Download from Supabase
        temp_path = Path(f"temp_{file_info['filename']}")
        await supabase_storage.download_file(file_info['cloud_path'], temp_path)
        
        # Upload to S3
        metadata = FileMetadata(**file_info)
        await s3_storage.upload_file(temp_path, metadata)
        
        # Cleanup
        temp_path.unlink()
        print(f"Migrated: {file_info['filename']}")

if __name__ == "__main__":
    asyncio.run(migrate_files())
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Invalid API key"
```
Error: Invalid API key
```
**Solution**: Check your `SUPABASE_ANON_KEY` - it should start with `eyJ`

#### 2. "Bucket not found"
```
Error: Bucket not found
```
**Solution**: Verify bucket name matches exactly: `telesync-files`

#### 3. "Permission denied"
```
Error: Permission denied
```
**Solution**: Check RLS policies or make bucket public temporarily for testing

#### 4. "File too large"
```
Error: File too large
```
**Solution**: Increase file size limit in bucket settings

### Debug Mode
Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📈 Monitoring Usage

### Supabase Dashboard
1. Go to your project dashboard
2. Check **Storage** → **Usage** for storage consumption
3. Check **API** → **Usage** for bandwidth usage

### Set Up Alerts
1. Go to **Settings** → **Billing**
2. Set up usage alerts at 80% of limits
3. Monitor costs in the billing section

## 🎯 Next Steps

1. **Set up Supabase project** (5 minutes)
2. **Create storage bucket**
3. **Get API credentials**
4. **Configure environment variables**
5. **Test with the test script**
6. **Deploy your cloud monitor**
7. **Monitor usage and costs**
8. **Migrate to AWS S3 when you scale**

Supabase is perfect for getting started - you can have cloud storage working in minutes, and when you're ready to scale, migrating to AWS S3 is just a configuration change!