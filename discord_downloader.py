import discord
import asyncio
import logging
import os
import json
import aiohttp
import yt_dlp
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('discord_downloader.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DiscordDownloader:
    def __init__(self, bot_token):
        self.bot_token = bot_token
        self.bot = discord.Client(intents=discord.Intents.default())
        self.download_path = 'discord_downloads'
        self.setup_handlers()
        
    def setup_handlers(self):
        @self.bot.event
        async def on_ready():
            logger.info(f'{self.bot.user} has connected to Discord!')
            
        @self.bot.event
        async def on_message(message):
            if message.author == self.bot.user:
                return
                
            # Check if message contains video links
            if self.contains_video_link(message.content):
                await self.handle_video_message(message)
    
    def contains_video_link(self, content):
        """Check if message contains video links"""
        video_domains = [
            'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
            'twitch.tv', 'instagram.com', 'tiktok.com', 'twitter.com'
        ]
        
        content_lower = content.lower()
        return any(domain in content_lower for domain in video_domains)
    
    async def handle_video_message(self, message):
        """Handle messages containing video links"""
        try:
            # Extract video URLs from message
            urls = self.extract_urls(message.content)
            
            for url in urls:
                if self.is_video_url(url):
                    await self.download_video(url, message)
                    
        except Exception as e:
            logger.error(f"Error handling video message: {e}")
    
    def extract_urls(self, text):
        """Extract URLs from text"""
        import re
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        return re.findall(url_pattern, text)
    
    def is_video_url(self, url):
        """Check if URL is a video URL"""
        video_domains = [
            'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
            'twitch.tv', 'instagram.com', 'tiktok.com', 'twitter.com'
        ]
        
        url_lower = url.lower()
        return any(domain in url_lower for domain in video_domains)
    
    async def download_video(self, url, message):
        """Download video from URL"""
        try:
            logger.info(f"Starting download for URL: {url}")
            
            # Create download directory
            channel_name = message.channel.name if hasattr(message.channel, 'name') else 'unknown'
            download_dir = Path(self.download_path) / channel_name
            download_dir.mkdir(parents=True, exist_ok=True)
            
            # Configure yt-dlp options
            ydl_opts = {
                'outtmpl': str(download_dir / '%(title)s.%(ext)s'),
                'format': 'best[height<=720]',  # Limit to 720p to save space
                'noplaylist': True,
            }
            
            # Download video
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                
            logger.info(f"Download completed: {filename}")
            
            # Send notification to channel
            await message.channel.send(f"✅ Downloaded: {info.get('title', 'Unknown title')}")
            
        except Exception as e:
            logger.error(f"Error downloading video: {e}")
            await message.channel.send(f"❌ Failed to download video: {str(e)}")
    
    async def start(self):
        """Start the Discord bot"""
        try:
            await self.bot.start(self.bot_token)
        except Exception as e:
            logger.error(f"Error starting bot: {e}")
    
    async def stop(self):
        """Stop the Discord bot"""
        logger.info("Stopping Discord bot...")
        await self.bot.close()

# Example usage
async def main():
    # Configuration - Replace with your actual values
    BOT_TOKEN = os.getenv('DISCORD_BOT_TOKEN')  # Get from environment variables
    
    if not BOT_TOKEN:
        logger.error("DISCORD_BOT_TOKEN environment variable not set")
        return
    
    # Initialize downloader
    downloader = DiscordDownloader(BOT_TOKEN)
    
    try:
        await downloader.start()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        await downloader.stop()

if __name__ == "__main__":
    asyncio.run(main())