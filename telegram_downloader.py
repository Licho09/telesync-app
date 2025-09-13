#!/usr/bin/env python3
"""
TeleSync Telegram Video Downloader
Automatically downloads videos from monitored Telegram channels using Telethon.
"""

import asyncio
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from telethon import TelegramClient, events
from telethon.tl.types import MessageMediaVideo, MessageMediaDocument

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('telegram_downloader.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TelegramDownloader:
    def __init__(self, api_id: int, api_hash: str, phone: str, session_name: str = 'telesync'):
        """
        Initialize the Telegram downloader.
        
        Args:
            api_id: Your Telegram API ID from my.telegram.org
            api_hash: Your Telegram API hash from my.telegram.org
            phone: Your phone number with country code (e.g., '+1234567890')
            session_name: Name for the session file
        """
        self.api_id = api_id
        self.api_hash = api_hash
        self.phone = phone
        self.session_name = session_name
        self.client = TelegramClient(session_name, api_id, api_hash)
        self.monitored_channels: List[str] = []
        self.download_path = Path("downloads")
        self.download_path.mkdir(exist_ok=True)
        
        # Statistics
        self.stats = {
            'total_downloads': 0,
            'successful_downloads': 0,
            'failed_downloads': 0,
            'total_size': 0,
            'last_download': None
        }
        
        self.load_config()
        self.setup_event_handlers()
    
    def load_config(self):
        """Load configuration from config.json if it exists."""
        config_file = Path('config.json')
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    self.monitored_channels = config.get('channels', [])
                    self.download_path = Path(config.get('download_path', 'downloads'))
                    self.download_path.mkdir(exist_ok=True)
                    logger.info(f"Loaded config: {len(self.monitored_channels)} channels")
            except Exception as e:
                logger.error(f"Error loading config: {e}")
    
    def save_config(self):
        """Save current configuration to config.json."""
        config = {
            'channels': self.monitored_channels,
            'download_path': str(self.download_path),
            'last_updated': datetime.now().isoformat()
        }
        try:
            with open('config.json', 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def setup_event_handlers(self):
        """Set up event handlers for new messages."""
        
        @self.client.on(events.NewMessage(chats=self.monitored_channels))
        async def handle_new_message(event):
            """Handle new messages from monitored channels."""
            try:
                message = event.message
                chat = await event.get_chat()
                channel_name = getattr(chat, 'title', 'Unknown')
                
                # Check if message contains video
                if message.video or (message.document and self.is_video_document(message.document)):
                    await self.download_video(message, channel_name)
                else:
                    logger.debug(f"Non-video message from {channel_name}: {message.text[:50] if message.text else 'Media'}")
                    
            except Exception as e:
                logger.error(f"Error handling message: {e}")
    
    def is_video_document(self, document) -> bool:
        """Check if a document is a video file."""
        if not document.mime_type:
            return False
        return document.mime_type.startswith('video/')
    
    async def download_video(self, message, channel_name: str):
        """Download a video from a message."""
        try:
            # Create channel-specific folder
            channel_folder = self.download_path / self.sanitize_filename(channel_name)
            channel_folder.mkdir(exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            if message.video:
                filename = f"{timestamp}_{message.id}.mp4"
            else:
                # For documents, try to preserve original filename
                original_filename = getattr(message.document, 'attributes', [])
                for attr in original_filename:
                    if hasattr(attr, 'file_name') and attr.file_name:
                        filename = f"{timestamp}_{attr.file_name}"
                        break
                else:
                    filename = f"{timestamp}_{message.id}.mp4"
            
            file_path = channel_folder / filename
            
            # Download the file
            logger.info(f"Downloading video from {channel_name}: {filename}")
            await message.download_media(file=str(file_path))
            
            # Update statistics
            file_size = file_path.stat().st_size
            self.stats['total_downloads'] += 1
            self.stats['successful_downloads'] += 1
            self.stats['total_size'] += file_size
            self.stats['last_download'] = datetime.now().isoformat()
            
            logger.info(f"Successfully downloaded: {file_path} ({self.format_size(file_size)})")
            
            # Save stats
            self.save_stats()
            
        except Exception as e:
            logger.error(f"Failed to download video from {channel_name}: {e}")
            self.stats['failed_downloads'] += 1
            self.save_stats()
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for filesystem compatibility."""
        import re
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove extra spaces and limit length
        filename = re.sub(r'\s+', '_', filename.strip())
        return filename[:100]  # Limit length
    
    def format_size(self, size_bytes: int) -> str:
        """Format file size in human readable format."""
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        return f"{size_bytes:.1f} {size_names[i]}"
    
    def save_stats(self):
        """Save download statistics."""
        try:
            with open('download_stats.json', 'w') as f:
                json.dump(self.stats, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving stats: {e}")
    
    async def add_channel(self, channel_username: str):
        """Add a channel to monitor."""
        try:
            # Validate channel exists
            entity = await self.client.get_entity(channel_username)
            if entity not in self.monitored_channels:
                self.monitored_channels.append(channel_username)
                self.save_config()
                logger.info(f"Added channel: {channel_username}")
                return True
            else:
                logger.warning(f"Channel already monitored: {channel_username}")
                return False
        except Exception as e:
            logger.error(f"Error adding channel {channel_username}: {e}")
            return False
    
    async def remove_channel(self, channel_username: str):
        """Remove a channel from monitoring."""
        if channel_username in self.monitored_channels:
            self.monitored_channels.remove(channel_username)
            self.save_config()
            logger.info(f"Removed channel: {channel_username}")
            return True
        else:
            logger.warning(f"Channel not found: {channel_username}")
            return False
    
    async def list_channels(self):
        """List all monitored channels."""
        logger.info(f"Monitored channels ({len(self.monitored_channels)}):")
        for i, channel in enumerate(self.monitored_channels, 1):
            try:
                entity = await self.client.get_entity(channel)
                title = getattr(entity, 'title', channel)
                logger.info(f"  {i}. {title} (@{channel})")
            except:
                logger.info(f"  {i}. {channel} (unable to fetch info)")
    
    async def get_stats(self):
        """Get download statistics."""
        logger.info("Download Statistics:")
        logger.info(f"  Total downloads: {self.stats['total_downloads']}")
        logger.info(f"  Successful: {self.stats['successful_downloads']}")
        logger.info(f"  Failed: {self.stats['failed_downloads']}")
        logger.info(f"  Total size: {self.format_size(self.stats['total_size'])}")
        if self.stats['last_download']:
            logger.info(f"  Last download: {self.stats['last_download']}")
    
    async def start(self):
        """Start the downloader."""
        logger.info("Starting TeleSync Telegram Downloader...")
        
        # Connect to Telegram
        await self.client.start(phone=self.phone)
        logger.info("Connected to Telegram")
        
        # Display monitored channels
        await self.list_channels()
        
        # Display stats
        await self.get_stats()
        
        logger.info("Listening for new videos... (Press Ctrl+C to stop)")
        
        # Keep running
        await self.client.run_until_disconnected()
    
    async def stop(self):
        """Stop the downloader."""
        logger.info("Stopping downloader...")
        await self.client.disconnect()

# Example usage
async def main():
    # Configuration - Replace with your actual values
    API_ID = 123456  # Get from https://my.telegram.org
    API_HASH = 'your_api_hash_here'  # Get from https://my.telegram.org
    PHONE = '+1234567890'  # Your phone number with country code
    
    # Initialize downloader
    downloader = TelegramDownloader(API_ID, API_HASH, PHONE)
    
    # Add channels to monitor (examples)
    # await downloader.add_channel('@channelname')
    # await downloader.add_channel('https://t.me/channelname')
    # await downloader.add_channel('channelname')  # Without @
    
    try:
        # Start monitoring
        await downloader.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await downloader.stop()

if __name__ == "__main__":
    # Check if required packages are installed
    try:
        import telethon
    except ImportError:
        print("Error: telethon is not installed.")
        print("Please install it with: pip install telethon")
        exit(1)
    
    # Run the downloader
    asyncio.run(main())




