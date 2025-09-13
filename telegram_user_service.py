#!/usr/bin/env python3
"""
TeleSync User-Specific Telegram Service
Handles Telegram monitoring for individual users
"""

import asyncio
import json
import sys
import logging
import websockets
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from telethon import TelegramClient, events
from telethon.tl.types import MessageMediaVideo, MessageMediaDocument

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class UserTelegramService:
    def __init__(self, user_id: str, api_id: int, api_hash: str, phone: str):
        """
        Initialize Telegram service for a specific user.
        
        Args:
            user_id: Unique user identifier
            api_id: User's Telegram API ID
            api_hash: User's Telegram API Hash
            phone: User's phone number
        """
        self.user_id = user_id
        self.api_id = api_id
        self.api_hash = api_hash
        self.phone = phone
        
        # Create user-specific session file
        session_path = Path(f"sessions/{user_id}.session")
        session_path.parent.mkdir(exist_ok=True)
        
        self.client = TelegramClient(str(session_path), api_id, api_hash)
        self.monitored_channels: List[str] = []
        self.download_path = Path(f"downloads/{user_id}")
        self.download_path.mkdir(parents=True, exist_ok=True)
        
        # Statistics
        self.stats = {
            'total_downloads': 0,
            'successful_downloads': 0,
            'failed_downloads': 0,
            'total_size': 0,
            'last_download': None
        }
        
        self.setup_event_handlers()
    
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
            
            # Notify the web app via WebSocket
            await self.notify_web_app({
                'type': 'download_completed',
                'data': {
                    'user_id': self.user_id,
                    'channel': channel_name,
                    'title': filename,
                    'filename': filename,
                    'size': file_size,
                    'size_formatted': self.format_size(file_size),
                    'file_path': str(file_path),
                    'completed_at': datetime.now().isoformat()
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to download video from {channel_name}: {e}")
            self.stats['failed_downloads'] += 1
            
            # Notify web app of failure
            await self.notify_web_app({
                'type': 'download_failed',
                'data': {
                    'user_id': self.user_id,
                    'channel': channel_name,
                    'error': str(e),
                    'failed_at': datetime.now().isoformat()
                }
            })
    
    async def notify_web_app(self, data: dict):
        """Send notification to the web app via WebSocket."""
        try:
            # In a real implementation, you'd connect to your WebSocket server
            # For now, we'll just log the notification
            logger.info(f"Notifying web app: {json.dumps(data, indent=2)}")
            
            # TODO: Implement WebSocket connection to notify the Node.js server
            # async with websockets.connect("ws://localhost:3001") as websocket:
            #     await websocket.send(json.dumps(data))
            
        except Exception as e:
            logger.error(f"Failed to notify web app: {e}")
    
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
    
    async def add_channel(self, channel_username: str):
        """Add a channel to monitor."""
        try:
            # Validate channel exists
            entity = await self.client.get_entity(channel_username)
            if channel_username not in self.monitored_channels:
                self.monitored_channels.append(channel_username)
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
            logger.info(f"Removed channel: {channel_username}")
            return True
        else:
            logger.warning(f"Channel not found: {channel_username}")
            return False
    
    async def start(self):
        """Start the Telegram service for this user."""
        logger.info(f"Starting Telegram service for user {self.user_id}")
        
        try:
            # Connect to Telegram
            await self.client.start(phone=self.phone)
            logger.info(f"Connected to Telegram for user {self.user_id}")
            
            # Display monitored channels
            logger.info(f"Monitored channels for user {self.user_id}: {self.monitored_channels}")
            
            # Keep running
            await self.client.run_until_disconnected()
            
        except Exception as e:
            logger.error(f"Error starting Telegram service for user {self.user_id}: {e}")
            raise
    
    async def stop(self):
        """Stop the Telegram service."""
        logger.info(f"Stopping Telegram service for user {self.user_id}")
        await self.client.disconnect()

# Example usage
async def main():
    if len(sys.argv) != 5:
        print("Usage: python telegram_user_service.py <user_id> <api_id> <api_hash> <phone>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    api_id = int(sys.argv[2])
    api_hash = sys.argv[3]
    phone = sys.argv[4]
    
    # Initialize service
    service = UserTelegramService(user_id, api_id, api_hash, phone)
    
    try:
        # Start monitoring
        await service.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await service.stop()

if __name__ == "__main__":
    # Check if required packages are installed
    try:
        import telethon
    except ImportError:
        print("Error: telethon is not installed.")
        print("Please install it with: pip install telethon")
        sys.exit(1)
    
    # Run the service
    asyncio.run(main())



