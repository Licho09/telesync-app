#!/usr/bin/env python3
"""
Cloud-based Telegram Monitor for TeleSync
Runs on cloud servers to provide 24/7 monitoring and cloud storage
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from telegram_monitor import TelegramMonitor, monitors
from cloud_storage_service import cloud_storage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('telegram_monitor_cloud.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CloudTelegramMonitor:
    """Cloud-based Telegram monitoring service"""
    
    def __init__(self):
        """Initialize cloud monitor"""
        self.running_monitors: Dict[str, TelegramMonitor] = {}
        self.monitor_tasks: Dict[str, asyncio.Task] = {}
        self.web_app_url = os.getenv('WEB_APP_URL', 'http://localhost:3001')
        
        # Cloud storage configuration
        self.storage_type = os.getenv('CLOUD_STORAGE_TYPE', 'local')
        logger.info(f"Cloud storage type: {self.storage_type}")
        
        # Load user configurations
        self.user_configs = self.load_user_configs()
        
        logger.info("Cloud Telegram Monitor initialized")
    
    def load_user_configs(self) -> Dict:
        """Load user configurations from environment or config file"""
        configs = {}
        
        # Try to load from environment variables (for single user)
        if os.getenv('TELEGRAM_API_ID') and os.getenv('TELEGRAM_API_HASH'):
            user_id = os.getenv('USER_ID', 'default-user')
            configs[user_id] = {
                'api_id': int(os.getenv('TELEGRAM_API_ID')),
                'api_hash': os.getenv('TELEGRAM_API_HASH'),
                'phone': os.getenv('TELEGRAM_PHONE'),
                'channels': os.getenv('TELEGRAM_CHANNELS', '').split(',') if os.getenv('TELEGRAM_CHANNELS') else []
            }
            logger.info(f"Loaded config for user: {user_id}")
        
        # Try to load from config file (for multiple users)
        config_file = Path('cloud_user_configs.json')
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    file_configs = json.load(f)
                    configs.update(file_configs)
                    logger.info(f"Loaded {len(file_configs)} user configs from file")
            except Exception as e:
                logger.error(f"Error loading config file: {e}")
        
        return configs
    
    async def add_user_monitor(self, user_id: str, config: Dict):
        """Add a user to monitor"""
        self.user_configs[user_id] = config
        logger.info(f"Added user {user_id} to monitor")
    
    async def start_user_monitor(self, user_id: str, config: Dict):
        """Start monitoring for a specific user"""
        try:
            logger.info(f"Starting monitor for user: {user_id}")
            
            # Create monitor instance
            monitor = TelegramMonitor(
                user_id=user_id,
                api_id=config['api_id'],
                api_hash=config['api_hash'],
                phone=config['phone']
            )
            
            # Start monitor in background task
            monitor_task = asyncio.create_task(monitor.start())
            
            # Store references
            self.running_monitors[user_id] = monitor
            self.monitor_tasks[user_id] = monitor_task
            
            logger.info(f"Monitor started for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to start monitor for user {user_id}: {e}")
    
    async def stop_user_monitor(self, user_id: str):
        """Stop monitoring for a specific user"""
        try:
            if user_id in self.running_monitors:
                # Stop the monitor
                await self.running_monitors[user_id].stop()
                
                # Cancel the task
                if user_id in self.monitor_tasks:
                    self.monitor_tasks[user_id].cancel()
                    try:
                        await self.monitor_tasks[user_id]
                    except asyncio.CancelledError:
                        pass
                
                # Clean up references
                del self.running_monitors[user_id]
                del self.monitor_tasks[user_id]
                
                logger.info(f"Monitor stopped for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Error stopping monitor for user {user_id}: {e}")
    
    async def start_all_monitors(self):
        """Start monitoring for all configured users"""
        logger.info(f"Starting monitors for {len(self.user_configs)} users")
        
        for user_id, config in self.user_configs.items():
            await self.start_user_monitor(user_id, config)
            # Small delay between starting monitors
            await asyncio.sleep(2)
        
        logger.info("All monitors started")
    
    async def stop_all_monitors(self):
        """Stop all running monitors"""
        logger.info("Stopping all monitors")
        
        for user_id in list(self.running_monitors.keys()):
            await self.stop_user_monitor(user_id)
        
        logger.info("All monitors stopped")
    
    async def get_monitor_status(self) -> Dict:
        """Get status of all monitors"""
        status = {
            'total_users': len(self.user_configs),
            'running_monitors': len(self.running_monitors),
            'monitors': {}
        }
        
        for user_id, monitor in self.running_monitors.items():
            try:
                status['monitors'][user_id] = {
                    'running': True,
                    'stats': monitor.stats,
                    'monitored_channels': len(monitor.monitored_channels),
                    'download_path': str(monitor.download_path) if monitor.download_path else None
                }
            except Exception as e:
                status['monitors'][user_id] = {
                    'running': False,
                    'error': str(e)
                }
        
        return status
    
    async def health_check(self):
        """Perform health check on all monitors"""
        logger.info("Performing health check...")
        
        for user_id, monitor in self.running_monitors.items():
            try:
                # Check if monitor is still running
                if not monitor.client.is_connected():
                    logger.warning(f"Monitor for user {user_id} is disconnected, restarting...")
                    await self.stop_user_monitor(user_id)
                    
                    # Restart monitor
                    if user_id in self.user_configs:
                        await self.start_user_monitor(user_id, self.user_configs[user_id])
                
            except Exception as e:
                logger.error(f"Health check failed for user {user_id}: {e}")
    
    async def periodic_health_check(self):
        """Run periodic health checks"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                await self.health_check()
            except Exception as e:
                logger.error(f"Error in periodic health check: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    async def cleanup_old_files(self):
        """Clean up old temporary files"""
        try:
            temp_dirs = []
            for monitor in self.running_monitors.values():
                if monitor.download_path:
                    temp_dir = monitor.download_path / "temp"
                    if temp_dir.exists():
                        temp_dirs.append(temp_dir)
            
            for temp_dir in temp_dirs:
                # Remove files older than 1 hour
                current_time = datetime.now().timestamp()
                for file_path in temp_dir.iterdir():
                    if file_path.is_file():
                        file_age = current_time - file_path.stat().st_mtime
                        if file_age > 3600:  # 1 hour
                            try:
                                file_path.unlink()
                                logger.debug(f"Cleaned up old temp file: {file_path}")
                            except Exception as e:
                                logger.warning(f"Failed to clean up temp file {file_path}: {e}")
            
        except Exception as e:
            logger.error(f"Error in cleanup: {e}")
    
    async def periodic_cleanup(self):
        """Run periodic cleanup"""
        while True:
            try:
                await asyncio.sleep(3600)  # Clean up every hour
                await self.cleanup_old_files()
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes before retrying
    
    async def start(self):
        """Start the cloud monitor service"""
        logger.info("Starting Cloud Telegram Monitor Service")
        logger.info("=" * 50)
        
        try:
            # Start all user monitors
            await self.start_all_monitors()
            
            if not self.running_monitors:
                logger.warning("No monitors started. Check your configuration.")
                return
            
            # Start background tasks
            health_task = asyncio.create_task(self.periodic_health_check())
            cleanup_task = asyncio.create_task(self.periodic_cleanup())
            
            logger.info("Cloud monitor service is running!")
            logger.info(f"Monitoring {len(self.running_monitors)} users")
            logger.info("Press Ctrl+C to stop")
            
            # Keep running
            try:
                while True:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                logger.info("Received interrupt signal")
            
        except Exception as e:
            logger.error(f"Error starting cloud monitor: {e}")
            raise
        finally:
            # Cleanup
            logger.info("Shutting down cloud monitor service...")
            await self.stop_all_monitors()
            logger.info("Cloud monitor service stopped")

async def main():
    """Main function"""
    # Check cloud storage environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_BUCKET']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        logger.error("Please set the following environment variables:")
        for var in missing_vars:
            logger.error(f"  {var}")
        logger.error("Note: Telegram credentials are entered by users through the web interface")
        sys.exit(1)
    
    # Get command line arguments
    if len(sys.argv) >= 5:
        user_id = sys.argv[1]
        api_id = sys.argv[2]
        api_hash = sys.argv[3]
        phone = sys.argv[4]
        
        logger.info(f"Starting monitor for user: {user_id}")
        logger.info(f"API ID: {api_id}")
        logger.info(f"Phone: {phone}")
        
        # Create and start cloud monitor with user data
        cloud_monitor = CloudTelegramMonitor()
        
        # Add user to monitor
        await cloud_monitor.add_user_monitor(user_id, {
            'api_id': api_id,
            'api_hash': api_hash,
            'phone': phone,
            'channels': []  # Will be populated from API
        })
        
        try:
            await cloud_monitor.start()
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            sys.exit(1)
    else:
        logger.error("Usage: python telegram_monitor_cloud.py <user_id> <api_id> <api_hash> <phone>")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())