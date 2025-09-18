#!/usr/bin/env python3
"""
Local Sync Service for TeleSync
Downloads files from cloud storage to local folder when PC is online
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import aiohttp
import aiofiles

from cloud_storage_service import cloud_storage, FileMetadata

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('local_sync.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class LocalSyncService:
    """Service for syncing files from cloud storage to local folder"""
    
    def __init__(self, user_id: str, local_sync_path: str = None):
        """
        Initialize local sync service
        
        Args:
            user_id: User identifier
            local_sync_path: Local path to sync files to (defaults to Downloads/telesync)
        """
        self.user_id = user_id
        self.local_sync_path = Path(local_sync_path) if local_sync_path else Path.home() / "Downloads" / "telesync"
        self.local_sync_path.mkdir(parents=True, exist_ok=True)
        
        # Sync state
        self.sync_state_file = self.local_sync_path / ".sync_state.json"
        self.sync_state = self.load_sync_state()
        
        # Web app connection
        self.web_app_url = os.getenv('WEB_APP_URL', 'http://localhost:3001')
        
        # Sync settings
        self.sync_interval = 300  # 5 minutes
        self.max_concurrent_downloads = 3
        self.sync_enabled = True
        
        logger.info(f"Local sync service initialized for user {user_id}")
        logger.info(f"Local sync path: {self.local_sync_path}")
    
    def load_sync_state(self) -> Dict:
        """Load sync state from file"""
        try:
            if self.sync_state_file.exists():
                with open(self.sync_state_file, 'r') as f:
                    return json.load(f)
            else:
                return {
                    'last_sync': None,
                    'synced_files': {},
                    'failed_downloads': {},
                    'total_synced': 0,
                    'total_size': 0
                }
        except Exception as e:
            logger.error(f"Error loading sync state: {e}")
            return {
                'last_sync': None,
                'synced_files': {},
                'failed_downloads': {},
                'total_synced': 0,
                'total_size': 0
            }
    
    def save_sync_state(self):
        """Save sync state to file"""
        try:
            with open(self.sync_state_file, 'w') as f:
                json.dump(self.sync_state, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving sync state: {e}")
    
    async def get_cloud_files(self) -> List[Dict]:
        """Get list of files from cloud storage"""
        try:
            # Get files from cloud storage service
            cloud_files = await cloud_storage.get_user_files(self.user_id)
            
            # Filter out already synced files
            unsynced_files = []
            for file_info in cloud_files:
                cloud_path = file_info.get('cloud_path', '')
                if cloud_path not in self.sync_state['synced_files']:
                    unsynced_files.append(file_info)
            
            logger.info(f"Found {len(unsynced_files)} new files to sync")
            return unsynced_files
            
        except Exception as e:
            logger.error(f"Error getting cloud files: {e}")
            return []
    
    async def sync_file(self, file_info: Dict) -> bool:
        """
        Sync a single file from cloud storage to local folder
        
        Args:
            file_info: File metadata from cloud storage
            
        Returns:
            bool: True if sync successful
        """
        try:
            cloud_path = file_info['cloud_path']
            filename = file_info['filename']
            channel_name = file_info['channel_name']
            
            # Create local directory structure
            local_dir = self.local_sync_path / channel_name
            local_dir.mkdir(exist_ok=True)
            
            local_file_path = local_dir / filename
            
            # Skip if file already exists and is the same size
            if local_file_path.exists():
                local_size = local_file_path.stat().st_size
                cloud_size = file_info.get('file_size', 0)
                if local_size == cloud_size:
                    logger.info(f"File already synced: {filename}")
                    self.sync_state['synced_files'][cloud_path] = {
                        'local_path': str(local_file_path),
                        'synced_at': datetime.now().isoformat(),
                        'size': local_size
                    }
                    self.save_sync_state()
                    return True
            
            # Download file from cloud storage
            logger.info(f"Syncing file: {filename}")
            success = await cloud_storage.download_file(cloud_path, local_file_path)
            
            if success:
                # Update sync state
                file_size = local_file_path.stat().st_size
                self.sync_state['synced_files'][cloud_path] = {
                    'local_path': str(local_file_path),
                    'synced_at': datetime.now().isoformat(),
                    'size': file_size
                }
                self.sync_state['total_synced'] += 1
                self.sync_state['total_size'] += file_size
                
                # Remove from failed downloads if it was there
                if cloud_path in self.sync_state['failed_downloads']:
                    del self.sync_state['failed_downloads'][cloud_path]
                
                self.save_sync_state()
                
                # Notify web app
                await self.notify_web_app('file_synced', {
                    'user_id': self.user_id,
                    'filename': filename,
                    'channel_name': channel_name,
                    'local_path': str(local_file_path),
                    'size': file_size,
                    'synced_at': datetime.now().isoformat()
                })
                
                logger.info(f"Successfully synced: {filename}")
                return True
            else:
                # Track failed download
                self.sync_state['failed_downloads'][cloud_path] = {
                    'filename': filename,
                    'failed_at': datetime.now().isoformat(),
                    'retry_count': self.sync_state['failed_downloads'].get(cloud_path, {}).get('retry_count', 0) + 1
                }
                self.save_sync_state()
                
                logger.error(f"Failed to sync: {filename}")
                return False
                
        except Exception as e:
            logger.error(f"Error syncing file {file_info.get('filename', 'unknown')}: {e}")
            return False
    
    async def sync_all_files(self) -> Dict:
        """
        Sync all new files from cloud storage
        
        Returns:
            Dict: Sync results summary
        """
        if not self.sync_enabled:
            logger.info("Sync is disabled")
            return {'status': 'disabled'}
        
        logger.info("Starting sync process...")
        start_time = time.time()
        
        try:
            # Get list of files to sync
            files_to_sync = await self.get_cloud_files()
            
            if not files_to_sync:
                logger.info("No new files to sync")
                return {'status': 'no_new_files'}
            
            # Sync files with concurrency limit
            semaphore = asyncio.Semaphore(self.max_concurrent_downloads)
            
            async def sync_with_semaphore(file_info):
                async with semaphore:
                    return await self.sync_file(file_info)
            
            # Start sync tasks
            sync_tasks = [sync_with_semaphore(file_info) for file_info in files_to_sync]
            results = await asyncio.gather(*sync_tasks, return_exceptions=True)
            
            # Count results
            successful = sum(1 for result in results if result is True)
            failed = len(results) - successful
            
            # Update last sync time
            self.sync_state['last_sync'] = datetime.now().isoformat()
            self.save_sync_state()
            
            sync_time = time.time() - start_time
            
            summary = {
                'status': 'completed',
                'total_files': len(files_to_sync),
                'successful': successful,
                'failed': failed,
                'sync_time': sync_time,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"Sync completed: {successful}/{len(files_to_sync)} files synced in {sync_time:.2f}s")
            
            # Notify web app
            await self.notify_web_app('sync_completed', summary)
            
            return summary
            
        except Exception as e:
            logger.error(f"Error during sync: {e}")
            return {'status': 'error', 'error': str(e)}
    
    async def notify_web_app(self, event_type: str, data: Dict):
        """Send notification to web app"""
        try:
            notification = {
                'type': event_type,
                'data': data
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.web_app_url}/api/sync/notification",
                    json=notification,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        logger.debug(f"Successfully notified web app: {event_type}")
                    else:
                        logger.warning(f"Web app notification failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to notify web app: {e}")
    
    async def get_sync_status(self) -> Dict:
        """Get current sync status"""
        return {
            'user_id': self.user_id,
            'local_sync_path': str(self.local_sync_path),
            'sync_enabled': self.sync_enabled,
            'last_sync': self.sync_state.get('last_sync'),
            'total_synced': self.sync_state.get('total_synced', 0),
            'total_size': self.sync_state.get('total_size', 0),
            'failed_downloads': len(self.sync_state.get('failed_downloads', {})),
            'sync_interval': self.sync_interval
        }
    
    async def retry_failed_downloads(self) -> Dict:
        """Retry failed downloads"""
        failed_downloads = self.sync_state.get('failed_downloads', {})
        
        if not failed_downloads:
            return {'status': 'no_failed_downloads'}
        
        logger.info(f"Retrying {len(failed_downloads)} failed downloads...")
        
        retry_results = []
        for cloud_path, failed_info in failed_downloads.items():
            # Limit retry attempts
            if failed_info.get('retry_count', 0) >= 3:
                logger.warning(f"Skipping {failed_info['filename']} - too many retry attempts")
                continue
            
            # Get file info from cloud storage
            cloud_files = await cloud_storage.get_user_files(self.user_id)
            file_info = next((f for f in cloud_files if f.get('cloud_path') == cloud_path), None)
            
            if file_info:
                success = await self.sync_file(file_info)
                retry_results.append({
                    'filename': failed_info['filename'],
                    'success': success
                })
        
        successful_retries = sum(1 for result in retry_results if result['success'])
        
        return {
            'status': 'completed',
            'total_retries': len(retry_results),
            'successful': successful_retries,
            'failed': len(retry_results) - successful_retries
        }
    
    async def start_periodic_sync(self):
        """Start periodic sync process"""
        logger.info(f"Starting periodic sync (interval: {self.sync_interval}s)")
        
        while True:
            try:
                if self.sync_enabled:
                    await self.sync_all_files()
                
                # Wait for next sync
                await asyncio.sleep(self.sync_interval)
                
            except Exception as e:
                logger.error(f"Error in periodic sync: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    def enable_sync(self):
        """Enable sync"""
        self.sync_enabled = True
        logger.info("Sync enabled")
    
    def disable_sync(self):
        """Disable sync"""
        self.sync_enabled = False
        logger.info("Sync disabled")
    
    def set_sync_interval(self, interval: int):
        """Set sync interval in seconds"""
        self.sync_interval = interval
        logger.info(f"Sync interval set to {interval}s")

# Global sync service instance
sync_service = None

def get_sync_service(user_id: str, local_sync_path: str = None) -> LocalSyncService:
    """Get or create sync service instance"""
    global sync_service
    if sync_service is None or sync_service.user_id != user_id:
        sync_service = LocalSyncService(user_id, local_sync_path)
    return sync_service

async def main():
    """Main function for testing"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python local_sync_service.py <user_id> [local_sync_path]")
        sys.exit(1)
    
    user_id = sys.argv[1]
    local_sync_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Create sync service
    sync = get_sync_service(user_id, local_sync_path)
    
    try:
        # Run one sync
        result = await sync.sync_all_files()
        print(f"Sync result: {result}")
        
        # Show status
        status = await sync.get_sync_status()
        print(f"Sync status: {status}")
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(main())


