#!/usr/bin/env python3
"""
Cloud Storage Service for TeleSync
Handles uploading files to cloud storage (Supabase/S3) and managing file metadata
"""

import os
import json
import logging
import asyncio
import aiohttp
import aiofiles
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, BinaryIO
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cloud_storage.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class FileMetadata:
    """Metadata for uploaded files"""
    user_id: str
    channel_name: str
    channel_username: str
    filename: str
    file_size: int
    file_type: str
    cloud_path: str
    local_path: Optional[str] = None
    uploaded_at: str = None
    synced_at: Optional[str] = None
    source: str = "telegram"  # telegram, discord, etc.
    message_id: Optional[str] = None
    message_url: Optional[str] = None

class CloudStorageService:
    """Service for managing cloud storage operations"""
    
    def __init__(self, storage_type: str = "supabase"):
        """
        Initialize cloud storage service
        
        Args:
            storage_type: Type of storage ("supabase", "s3", "local")
        """
        self.storage_type = storage_type
        self.setup_storage()
    
    def setup_storage(self):
        """Setup storage configuration based on type"""
        if self.storage_type == "supabase":
            self.setup_supabase()
        elif self.storage_type == "s3":
            self.setup_s3()
        elif self.storage_type == "local":
            self.setup_local()
        else:
            raise ValueError(f"Unsupported storage type: {self.storage_type}")
    
    def setup_supabase(self):
        """Setup Supabase storage configuration"""
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        self.bucket_name = os.getenv('SUPABASE_BUCKET', 'telesync-files')
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase credentials not found, falling back to local storage")
            self.storage_type = "local"
            self.setup_local()
            return
        
        logger.info(f"Supabase storage configured: {self.supabase_url}")
    
    def setup_s3(self):
        """Setup AWS S3 storage configuration"""
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.s3_bucket = os.getenv('S3_BUCKET', 'telesync-files')
        self.s3_region = os.getenv('S3_REGION', 'us-east-1')
        
        if not self.aws_access_key or not self.aws_secret_key:
            logger.warning("AWS credentials not found, falling back to local storage")
            self.storage_type = "local"
            self.setup_local()
            return
        
        logger.info(f"S3 storage configured: {self.s3_bucket}")
    
    def setup_local(self):
        """Setup local cloud storage directory"""
        self.local_cloud_path = Path("cloud_storage")
        self.local_cloud_path.mkdir(exist_ok=True)
        logger.info(f"Local cloud storage configured: {self.local_cloud_path}")
    
    async def upload_file(self, file_path: Path, metadata: FileMetadata) -> bool:
        """
        Upload file to cloud storage
        
        Args:
            file_path: Local path to the file
            metadata: File metadata
            
        Returns:
            bool: True if upload successful
        """
        try:
            if self.storage_type == "supabase":
                return await self.upload_to_supabase(file_path, metadata)
            elif self.storage_type == "s3":
                return await self.upload_to_s3(file_path, metadata)
            elif self.storage_type == "local":
                return await self.upload_to_local(file_path, metadata)
            else:
                logger.error(f"Unknown storage type: {self.storage_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error uploading file {file_path}: {e}")
            return False
    
    async def upload_to_supabase(self, file_path: Path, metadata: FileMetadata) -> bool:
        """Upload file to Supabase storage"""
        try:
            # Create cloud path
            cloud_path = f"{metadata.user_id}/{metadata.channel_name}/{metadata.filename}"
            metadata.cloud_path = cloud_path
            
            # Read file
            async with aiofiles.open(file_path, 'rb') as f:
                file_data = await f.read()
            
            # Upload to Supabase
            headers = {
                'Authorization': f'Bearer {self.supabase_key}',
                'Content-Type': 'application/octet-stream',
                'x-upsert': 'true'  # Allow overwriting files
            }
            
            url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{cloud_path}"
            
            logger.info(f"Uploading to Supabase: {url}")
            logger.info(f"File size: {len(file_data)} bytes")
            logger.info(f"Cloud path: {cloud_path}")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=file_data, headers=headers) as response:
                    response_text = await response.text()
                    logger.info(f"Supabase response status: {response.status}")
                    logger.info(f"Supabase response: {response_text}")
                    
                    if response.status == 200:
                        logger.info(f"Successfully uploaded to Supabase: {cloud_path}")
                        await self.save_metadata(metadata)
                        return True
                    else:
                        logger.error(f"Supabase upload failed: {response.status}")
                        logger.error(f"Response: {response_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error uploading to Supabase: {e}")
            return False
    
    async def upload_to_s3(self, file_path: Path, metadata: FileMetadata) -> bool:
        """Upload file to AWS S3"""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            # Create S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.s3_region
            )
            
            # Create cloud path
            cloud_path = f"{metadata.user_id}/{metadata.channel_name}/{metadata.filename}"
            metadata.cloud_path = cloud_path
            
            # Upload file
            s3_client.upload_file(
                str(file_path),
                self.s3_bucket,
                cloud_path,
                ExtraArgs={'ContentType': metadata.file_type}
            )
            
            logger.info(f"Successfully uploaded to S3: {cloud_path}")
            await self.save_metadata(metadata)
            return True
            
        except Exception as e:
            logger.error(f"Error uploading to S3: {e}")
            return False
    
    async def upload_to_local(self, file_path: Path, metadata: FileMetadata) -> bool:
        """Upload file to local cloud storage directory"""
        try:
            # Create cloud path
            cloud_path = f"{metadata.user_id}/{metadata.channel_name}/{metadata.filename}"
            metadata.cloud_path = cloud_path
            
            # Create directory structure
            cloud_file_path = self.local_cloud_path / cloud_path
            cloud_file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            import shutil
            shutil.copy2(file_path, cloud_file_path)
            
            logger.info(f"Successfully uploaded to local cloud storage: {cloud_path}")
            await self.save_metadata(metadata)
            return True
            
        except Exception as e:
            logger.error(f"Error uploading to local cloud storage: {e}")
            return False
    
    async def save_metadata(self, metadata: FileMetadata):
        """Save file metadata to database/file"""
        try:
            metadata.uploaded_at = datetime.now().isoformat()
            
            # Save to JSON file (in production, use a proper database)
            metadata_file = self.local_cloud_path / "metadata.json"
            
            # Load existing metadata
            if metadata_file.exists():
                async with aiofiles.open(metadata_file, 'r') as f:
                    content = await f.read()
                    all_metadata = json.loads(content) if content else []
            else:
                all_metadata = []
            
            # Add new metadata
            all_metadata.append(asdict(metadata))
            
            # Save updated metadata
            async with aiofiles.open(metadata_file, 'w') as f:
                await f.write(json.dumps(all_metadata, indent=2))
            
            logger.info(f"Metadata saved for: {metadata.filename}")
            
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
    
    async def get_user_files(self, user_id: str) -> List[Dict]:
        """Get all files for a user"""
        try:
            metadata_file = self.local_cloud_path / "metadata.json"
            
            if not metadata_file.exists():
                return []
            
            async with aiofiles.open(metadata_file, 'r') as f:
                content = await f.read()
                all_metadata = json.loads(content) if content else []
            
            # Filter by user
            user_files = [meta for meta in all_metadata if meta['user_id'] == user_id]
            return user_files
            
        except Exception as e:
            logger.error(f"Error getting user files: {e}")
            return []
    
    async def download_file(self, cloud_path: str, local_path: Path) -> bool:
        """Download file from cloud storage to local path"""
        try:
            if self.storage_type == "supabase":
                return await self.download_from_supabase(cloud_path, local_path)
            elif self.storage_type == "s3":
                return await self.download_from_s3(cloud_path, local_path)
            elif self.storage_type == "local":
                return await self.download_from_local(cloud_path, local_path)
            else:
                logger.error(f"Unknown storage type: {self.storage_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error downloading file {cloud_path}: {e}")
            return False
    
    async def download_from_supabase(self, cloud_path: str, local_path: Path) -> bool:
        """Download file from Supabase storage"""
        try:
            headers = {
                'Authorization': f'Bearer {self.supabase_key}'
            }
            
            url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{cloud_path}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        # Create local directory
                        local_path.parent.mkdir(parents=True, exist_ok=True)
                        
                        # Save file
                        async with aiofiles.open(local_path, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                await f.write(chunk)
                        
                        logger.info(f"Successfully downloaded from Supabase: {cloud_path}")
                        return True
                    else:
                        logger.error(f"Supabase download failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error downloading from Supabase: {e}")
            return False
    
    async def download_from_s3(self, cloud_path: str, local_path: Path) -> bool:
        """Download file from AWS S3"""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            # Create S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.s3_region
            )
            
            # Create local directory
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Download file
            s3_client.download_file(self.s3_bucket, cloud_path, str(local_path))
            
            logger.info(f"Successfully downloaded from S3: {cloud_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading from S3: {e}")
            return False
    
    async def download_from_local(self, cloud_path: str, local_path: Path) -> bool:
        """Download file from local cloud storage"""
        try:
            source_path = self.local_cloud_path / cloud_path
            
            if not source_path.exists():
                logger.error(f"File not found in local cloud storage: {cloud_path}")
                return False
            
            # Create local directory
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            import shutil
            shutil.copy2(source_path, local_path)
            
            logger.info(f"Successfully downloaded from local cloud storage: {cloud_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading from local cloud storage: {e}")
            return False
    
    async def delete_file(self, cloud_path: str) -> bool:
        """Delete file from cloud storage"""
        try:
            if self.storage_type == "supabase":
                return await self.delete_from_supabase(cloud_path)
            elif self.storage_type == "s3":
                return await self.delete_from_s3(cloud_path)
            elif self.storage_type == "local":
                return await self.delete_from_local(cloud_path)
            else:
                logger.error(f"Unknown storage type: {self.storage_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting file {cloud_path}: {e}")
            return False
    
    async def delete_from_supabase(self, cloud_path: str) -> bool:
        """Delete file from Supabase storage"""
        try:
            headers = {
                'Authorization': f'Bearer {self.supabase_key}'
            }
            
            url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{cloud_path}"
            
            async with aiohttp.ClientSession() as session:
                async with session.delete(url, headers=headers) as response:
                    if response.status == 200:
                        logger.info(f"Successfully deleted from Supabase: {cloud_path}")
                        return True
                    else:
                        logger.error(f"Supabase delete failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error deleting from Supabase: {e}")
            return False
    
    async def delete_from_s3(self, cloud_path: str) -> bool:
        """Delete file from AWS S3"""
        try:
            import boto3
            
            # Create S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.s3_region
            )
            
            # Delete file
            s3_client.delete_object(Bucket=self.s3_bucket, Key=cloud_path)
            
            logger.info(f"Successfully deleted from S3: {cloud_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting from S3: {e}")
            return False
    
    async def delete_from_local(self, cloud_path: str) -> bool:
        """Delete file from local cloud storage"""
        try:
            file_path = self.local_cloud_path / cloud_path
            
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Successfully deleted from local cloud storage: {cloud_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {cloud_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting from local cloud storage: {e}")
            return False

# Global instance
cloud_storage = CloudStorageService()
