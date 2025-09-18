# AWS S3 Setup Guide for TeleSync

This guide will walk you through setting up AWS S3 for cloud storage with TeleSync. AWS S3 is perfect for this use case because it's:
- **Pay-as-you-use**: Only pay for what you store and transfer
- **Highly scalable**: Can handle any amount of data
- **Reliable**: 99.999999999% (11 9's) durability
- **Cost-effective**: Very competitive pricing

## 💰 AWS S3 Pricing (as of 2024)

### Storage Costs
- **Standard Storage**: $0.023 per GB per month
- **Intelligent Tiering**: $0.0125 per GB per month (for files accessed less frequently)

### Transfer Costs
- **First 1 GB/month**: FREE
- **Next 9.999 TB/month**: $0.09 per GB
- **Next 40 TB/month**: $0.085 per GB

### Request Costs
- **PUT requests**: $0.0004 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests

### Example Monthly Cost
For a typical user with 10GB of videos:
- Storage: 10GB × $0.023 = $0.23/month
- Transfer: ~2GB × $0.09 = $0.18/month
- Requests: ~1,000 × $0.0004 = $0.0004/month
- **Total: ~$0.41/month**

## 🚀 Step-by-Step Setup

### Step 1: Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the signup process
4. You'll need a credit card, but you get 12 months free tier

### Step 2: Create S3 Bucket

1. **Login to AWS Console**
   - Go to [console.aws.amazon.com](https://console.aws.amazon.com)
   - Sign in with your account

2. **Navigate to S3**
   - Search for "S3" in the services search
   - Click on "S3" service

3. **Create Bucket**
   - Click "Create bucket"
   - **Bucket name**: `telesync-files-[your-unique-id]` (must be globally unique)
   - **Region**: Choose closest to your users (e.g., `us-east-1`, `us-west-2`, `eu-west-1`)
   - **Object Ownership**: ACLs disabled (recommended)
   - **Block Public Access**: Keep all settings enabled (for security)
   - Click "Create bucket"

### Step 3: Create IAM User

1. **Navigate to IAM**
   - Search for "IAM" in services
   - Click on "IAM" service

2. **Create User**
   - Click "Users" in left sidebar
   - Click "Create user"
   - **User name**: `telesync-storage-user`
   - **Access type**: Programmatic access
   - Click "Next"

3. **Set Permissions**
   - Click "Attach policies directly"
   - Search for and select: `AmazonS3FullAccess`
   - Click "Next"

4. **Review and Create**
   - Review settings
   - Click "Create user"

5. **Save Credentials**
   - **IMPORTANT**: Copy and save these credentials securely:
     - Access Key ID
     - Secret Access Key
   - You won't be able to see the secret key again!

### Step 4: Configure TeleSync

#### Environment Variables
Set these in your cloud server environment:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET=telesync-files-your-unique-id
S3_REGION=us-east-1

# Cloud Storage Type
CLOUD_STORAGE_TYPE=s3
```

#### For Railway Deployment
```bash
# In Railway dashboard, go to your project
# Click on "Variables" tab
# Add these environment variables:
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=telesync-files-your-unique-id
S3_REGION=us-east-1
CLOUD_STORAGE_TYPE=s3
```

#### For Render Deployment
```bash
# In Render dashboard, go to your service
# Click on "Environment" tab
# Add these environment variables:
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=telesync-files-your-unique-id
S3_REGION=us-east-1
CLOUD_STORAGE_TYPE=s3
```

### Step 5: Test the Setup

Create a test script to verify everything works:

```python
# test_s3_setup.py
import os
import asyncio
from cloud_storage_service import cloud_storage, FileMetadata
from pathlib import Path

async def test_s3():
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
    
    # Upload to S3
    print("Uploading test file to S3...")
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
    asyncio.run(test_s3())
```

Run the test:
```bash
python test_s3_setup.py
```

## 🔒 Security Best Practices

### 1. IAM Policy (More Restrictive)
Instead of `AmazonS3FullAccess`, create a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::telesync-files-your-unique-id/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::telesync-files-your-unique-id"
        }
    ]
}
```

### 2. Bucket Policy (Optional)
Add a bucket policy to restrict access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "RestrictAccess",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::telesync-files-your-unique-id",
                "arn:aws:s3:::telesync-files-your-unique-id/*"
            ],
            "Condition": {
                "StringNotEquals": {
                    "aws:userid": "AIDACKCEVSQ6C2EXAMPLE"
                }
            }
        }
    ]
}
```

### 3. Environment Variables
- Never commit AWS credentials to version control
- Use environment variables or AWS Secrets Manager
- Rotate access keys regularly

## 📊 Monitoring and Costs

### AWS Cost Explorer
1. Go to AWS Console → Billing → Cost Explorer
2. Set up budgets to monitor spending
3. Set up alerts when costs exceed thresholds

### S3 Storage Class Optimization
For cost optimization, you can implement automatic lifecycle policies:

```python
# In cloud_storage_service.py, add this method:
async def optimize_storage_costs(self):
    """Move old files to cheaper storage classes"""
    try:
        import boto3
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=self.s3_region
        )
        
        # Move files older than 30 days to IA (Infrequent Access)
        s3_client.put_bucket_lifecycle_configuration(
            Bucket=self.s3_bucket,
            LifecycleConfiguration={
                'Rules': [
                    {
                        'ID': 'MoveToIA',
                        'Status': 'Enabled',
                        'Transitions': [
                            {
                                'Days': 30,
                                'StorageClass': 'STANDARD_IA'
                            }
                        ]
                    }
                ]
            }
        )
        
        logger.info("Storage lifecycle policy configured")
        
    except Exception as e:
        logger.error(f"Error configuring lifecycle policy: {e}")
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Access Denied
```
Error: Access Denied
```
**Solution**: Check IAM permissions and bucket policy

#### 2. Bucket Not Found
```
Error: The specified bucket does not exist
```
**Solution**: Verify bucket name and region

#### 3. Invalid Credentials
```
Error: The security token included in the request is invalid
```
**Solution**: Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

#### 4. Region Mismatch
```
Error: The authorization header is malformed
```
**Solution**: Ensure S3_REGION matches your bucket region

### Debug Mode
Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📈 Scaling Considerations

### For Multiple Users
- Use separate folders per user: `user1/`, `user2/`, etc.
- Consider separate buckets for different user tiers
- Implement user-specific IAM policies

### For High Volume
- Use S3 Transfer Acceleration for faster uploads
- Implement multipart uploads for large files
- Use CloudFront CDN for faster downloads

### Cost Optimization
- Set up lifecycle policies to move old files to cheaper storage
- Use S3 Intelligent Tiering for automatic cost optimization
- Monitor usage with AWS Cost Explorer

## 🎯 Next Steps

1. **Set up AWS account and S3 bucket**
2. **Create IAM user with proper permissions**
3. **Configure environment variables**
4. **Test the setup with the test script**
5. **Deploy your cloud monitor**
6. **Monitor costs and usage**

AWS S3 is perfect for your use case - you'll only pay for what you use, and it scales automatically as your user base grows!


