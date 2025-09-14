#!/usr/bin/env python3
"""
Cloud Telegram Monitor for TeleSync
Runs 24/7 in the cloud to monitor Telegram channels
"""

import asyncio
import json
import logging
import os
import requests
import subprocess
import re
import signal
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from telethon import TelegramClient, events

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CloudTelegramMonitor:
    def __init__(self, user_id: str, api_id: int, api_hash: str, phone: str):
        """
        Initialize cloud Telegram monitor.
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
        self.download_path = None
        
        # Web app connection - use environment variable
        self.web_app_url = os.getenv('WEB_APP_URL', 'https://telesync-backend-jkqs.onrender.com')
        logger.info(f"Using web app URL: {self.web_app_url}")
        
        # Statistics
        self.stats = {
            'total_downloads': 0,
            'successful_downloads': 0,
            'failed_downloads': 0,
            'total_size': 0,
            'last_download': None
        }
        
        self.setup_event_handlers()
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down gracefully...")
            asyncio.create_task(self.stop())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def setup_event_handlers(self):
        """Set up event handlers for new messages."""
        
        @self.client.on(events.NewMessage)
        async def handle_new_message(event):
            """Handle new messages from monitored channels."""
            try:
                message = event.message
                chat = await event.get_chat()
                channel_name = getattr(chat, 'title', 'Unknown')
                channel_username = getattr(chat, 'username', '')
                
                # Log all messages for debugging
                channel_id = getattr(chat, 'id', None)
                logger.info(f"NEW MESSAGE DETECTED! From: {channel_name} (@{channel_username}) - Channel ID: {channel_id} - Message ID: {message.id}")
                
                # Check if this channel is being monitored
                channel_identifier = f"@{channel_username}" if channel_username else channel_name
                channel_url = f"https://t.me/{channel_username}" if channel_username else None
                channel_id_str = str(channel_id) if channel_id else None
                
                # Check multiple possible identifiers
                is_monitored = (
                    channel_identifier in self.monitored_channels or
                    channel_name in self.monitored_channels or
                    (channel_url and channel_url in self.monitored_channels) or
                    (channel_username and f"@{channel_username}" in self.monitored_channels) or
                    (channel_id_str and channel_id_str in self.monitored_channels) or
                    any(channel_id_str in ch for ch in self.monitored_channels if channel_id_str)
                )
                
                if not is_monitored:
                    logger.info(f"Ignoring message from unmonitored channel: {channel_name} (@{channel_username})")
                    return
                
                logger.info(f"Processing message from monitored channel: {channel_name} (@{channel_username})")
                
                # Check if message contains video
                has_video_file = message.video or (message.document and self.is_video_document(message.document))
                has_video_url, video_url = self.is_video_url(message.text) if message.text else (False, None)
                
                if has_video_file:
                    logger.info(f"Found video file in message from {channel_name}")
                    await self.download_video(message, channel_name, channel_username)
                elif has_video_url:
                    logger.info(f"Found video URL in message from {channel_name}: {video_url}")
                    await self.download_video_from_url(video_url, channel_name, channel_username)
                else:
                    logger.debug(f"Non-video message from {channel_name}: {message.text[:50] if message.text else 'Media'}")
                    
            except Exception as e:
                logger.error(f"Error handling message: {e}")
    
    def is_video_document(self, document) -> bool:
        """Check if a document is a video file."""
        if not document.mime_type:
            return False
        return document.mime_type.startswith('video/')

    def is_video_url(self, text):
        """Check if text contains a video URL."""
        if not text:
            return False, None
        
        # YouTube patterns
        youtube_patterns = [
            r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)',
            r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]+)',
            r'(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]+)',
            r'(?:https?://)?(?:www\.)?youtube\.com/v/([a-zA-Z0-9_-]+)'
        ]
        
        # Other video platforms
        other_patterns = [
            r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)',
            r'(?:https?://)?(?:www\.)?dailymotion\.com/video/([a-zA-Z0-9_-]+)',
            r'(?:https?://)?(?:www\.)?twitch\.tv/videos/(\d+)',
            r'(?:https?://)?(?:www\.)?tiktok\.com/@[^/]+/video/(\d+)'
        ]
        
        all_patterns = youtube_patterns + other_patterns
        
        for pattern in all_patterns:
            match = re.search(pattern, text)
            if match:
                return True, match.group(0)
        
        return False, None

    async def download_video_from_url(self, url, channel_name, channel_username):
        """Download video from URL using yt-dlp."""
        try:
            logger.info(f"Starting download from URL: {url}")
            
            # Create download directory
            today = datetime.now().strftime('%Y-%m-%d')
            channel_folder = f"{channel_name}_{channel_username}" if channel_username else channel_name
            download_dir = self.download_path / today / channel_folder
            download_dir.mkdir(parents=True, exist_ok=True)
            
            # Use yt-dlp to download the video
            cmd = [
                'yt-dlp',
                '--output', str(download_dir / '%(title)s.%(ext)s'),
                '--format', 'best[height<=720]',
                '--no-playlist',
                url
            ]
            
            # Run the download command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                # Get the downloaded file
                downloaded_files = list(download_dir.glob('*'))
                if downloaded_files:
                    file_path = downloaded_files[0]
                    file_size = file_path.stat().st_size
                    filename = file_path.name
                    
                    logger.info(f"Successfully downloaded: {filename} ({self.format_size(file_size)})")
                    
                    # Notify the web app
                    await self.notify_web_app({
                        'type': 'download_completed',
                        'data': {
                            'user_id': self.user_id,
                            'channel': channel_name,
                            'channel_username': channel_username,
                            'title': filename,
                            'filename': filename,
                            'size': file_size,
                            'size_formatted': self.format_size(file_size),
                            'file_path': str(file_path),
                            'completed_at': datetime.now().isoformat(),
                            'source': 'telegram_url',
                            'url': url
                        }
                    })
                    
                    return True
                else:
                    logger.error("No files were downloaded")
                    return False
            else:
                logger.error(f"yt-dlp failed with return code {process.returncode}")
                logger.error(f"stderr: {stderr.decode()}")
                return False
                
        except Exception as e:
            logger.error(f"Error downloading video from URL: {e}")
            return False
    
    async def download_video(self, message, channel_name: str, channel_username: str):
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
            
            # Notify the web app
            await self.notify_web_app({
                'type': 'download_completed',
                'data': {
                    'user_id': self.user_id,
                    'id': f"telegram_{message.id}_{int(datetime.now().timestamp())}",
                    'url': f"https://t.me/{channel_username}/{message.id}" if channel_username else f"telegram://{channel_name}/{message.id}",
                    'title': filename,
                    'filename': filename,
                    'size': file_size,
                    'size_formatted': self.format_size(file_size),
                    'channel': f"#{channel_name}",
                    'source': 'telegram',
                    'status': 'completed',
                    'progress': 100,
                    'createdAt': datetime.now().isoformat(),
                    'completedAt': datetime.now().isoformat(),
                    'timestamp': datetime.now().isoformat()
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
                    'channel_username': channel_username,
                    'error': str(e),
                    'failed_at': datetime.now().isoformat()
                }
            })
    
    async def notify_web_app(self, data: dict):
        """Send notification to the web app via HTTP."""
        try:
            # Send to web app API
            response = requests.post(
                f"{self.web_app_url}/api/telegram/download-notification",
                json=data,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully notified web app: {data['type']}")
            else:
                logger.warning(f"Web app notification failed: {response.status_code}")
                
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
    
    async def fetch_download_path_from_web_app(self):
        """Fetch download path from the web app settings."""
        try:
            response = requests.get(
                f"{self.web_app_url}/api/settings",
                timeout=10
            )
            
            if response.status_code == 200:
                settings_data = response.json()
                if settings_data.get('success'):
                    settings = settings_data.get('data', {})
                    base_download_path = settings.get('downloadPath', 'downloads')
                    
                    # Use cloud storage path
                    self.download_path = Path("/tmp") / base_download_path / "telegram" / self.user_id
                    self.download_path.mkdir(parents=True, exist_ok=True)
                    logger.info(f"Download path set to: {self.download_path}")
                    return True
                else:
                    logger.warning("Web app returned unsuccessful response for settings")
                    return False
            else:
                logger.warning(f"Failed to fetch settings: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error fetching download path from web app: {e}")
            # Fallback to temp directory
            self.download_path = Path("/tmp") / "downloads" / "telegram" / self.user_id
            self.download_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Using fallback download path: {self.download_path}")
            return False

    async def fetch_channels_from_web_app(self):
        """Fetch monitored channels from the web app."""
        try:
            response = requests.get(
                f"{self.web_app_url}/api/telegram/channels/{self.user_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                channels_data = response.json()
                if channels_data.get('success'):
                    channels = channels_data.get('data', [])
                    # Extract channel identifiers from the web app data
                    self.monitored_channels = []
                    for channel in channels:
                        if channel.get('isActive', False):
                            # Store both the full URL and extracted username for matching
                            url = channel.get('url', '')
                            self.monitored_channels.append(url)  # Store full URL
                            
                            # Also extract username for easier matching
                            if '@' in url:
                                username = url.split('@')[-1].split('/')[0]
                                self.monitored_channels.append(f"@{username}")
                            elif 't.me/' in url:
                                username = url.split('t.me/')[-1].split('/')[0]
                                self.monitored_channels.append(f"@{username}")
                    
                    logger.info(f"Fetched {len(self.monitored_channels)} active channels from web app")
                    return True
                else:
                    logger.warning("Web app returned unsuccessful response")
                    return False
            else:
                logger.warning(f"Failed to fetch channels: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error fetching channels from web app: {e}")
            return False

    async def periodic_channel_refresh(self):
        """Periodically refresh the list of monitored channels and download path."""
        while True:
            try:
                await asyncio.sleep(30)  # Refresh every 30 seconds
                old_channels = self.monitored_channels.copy()
                old_download_path = self.download_path
                
                # Refresh both channels and download path
                await self.fetch_channels_from_web_app()
                await self.fetch_download_path_from_web_app()
                
                # Log if channels changed
                if old_channels != self.monitored_channels:
                    logger.info(f"Channel list updated: {self.monitored_channels}")
                
                # Log if download path changed
                if old_download_path != self.download_path:
                    logger.info(f"Download path updated: {self.download_path}")
                    
            except Exception as e:
                logger.error(f"Error in periodic refresh: {e}")

    async def start(self):
        """Start the cloud Telegram monitor."""
        logger.info(f"Starting cloud Telegram monitor for user {self.user_id}")
        
        try:
            # Connect to Telegram
            await self.client.start(phone=self.phone)
            logger.info(f"Connected to Telegram for user {self.user_id}")
            
            # Fetch download path and channels from web app
            await self.fetch_download_path_from_web_app()
            await self.fetch_channels_from_web_app()
            
            # Display monitored channels and download path
            logger.info(f"Download path for user {self.user_id}: {self.download_path}")
            logger.info(f"Monitored channels for user {self.user_id}: {self.monitored_channels}")
            
            # Start periodic refresh
            asyncio.create_task(self.periodic_channel_refresh())
            
            logger.info("🚀 Cloud monitor is running 24/7! Listening for new videos...")
            
            # Keep running
            await self.client.run_until_disconnected()
            
        except Exception as e:
            logger.error(f"Error starting cloud Telegram monitor for user {self.user_id}: {e}")
            raise
    
    async def stop(self):
        """Stop the cloud Telegram monitor."""
        logger.info(f"Stopping cloud Telegram monitor for user {self.user_id}")
        await self.client.disconnect()

async def main():
    """Main function for cloud deployment."""
    # Get configuration from environment variables
    user_id = os.getenv('TELEGRAM_USER_ID', 'demo-user-123')
    api_id = int(os.getenv('TELEGRAM_API_ID', '24409882'))
    api_hash = os.getenv('TELEGRAM_API_HASH', 'a13b642bf2d39326e44bf02a5a05707b')
    phone = os.getenv('TELEGRAM_PHONE', '+18327080194')
    
    logger.info("🌐 Starting TeleSync Cloud Monitor")
    logger.info(f"User ID: {user_id}")
    logger.info(f"Phone: {phone}")
    logger.info(f"API ID: {api_id}")
    
    try:
        # Create and start monitor
        monitor = CloudTelegramMonitor(user_id, api_id, api_hash, phone)
        await monitor.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
