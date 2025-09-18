#!/usr/bin/env python3
"""
Test script to verify Supabase setup for TeleSync
Run this script to test your Supabase configuration before deploying
"""

import os
import asyncio
import logging
from pathlib import Path
from datetime import datetime

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, use system environment variables

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_supabase_setup():
    """Test Supabase setup"""
    print("🧪 Testing Supabase Setup for TeleSync")
    print("=" * 50)
    
    # Check if .env file exists
    env_file = Path('.env')
    if env_file.exists():
        print("✅ Found .env file")
    else:
        print("⚠️ No .env file found, using system environment variables")
    
    # Check environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_BUCKET']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        print("\nDebug info:")
        for var in required_vars:
            value = os.getenv(var)
            if value:
                print(f"  {var}: {'*' * 20} (found)")
            else:
                print(f"  {var}: (not found)")
        print("\nPlease check your .env file or set these environment variables:")
        for var in missing_vars:
            print(f"  export {var}=your_value_here")
        return False
    
    print("✅ Environment variables found")
    
    # Test imports
    try:
        from cloud_storage_service import cloud_storage, FileMetadata
        print("✅ Cloud storage service imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import cloud storage service: {e}")
        return False
    
    # Test aiohttp
    try:
        import aiohttp
        print("✅ aiohttp imported successfully")
    except ImportError:
        print("❌ aiohttp not installed. Run: pip install aiohttp")
        return False
    
    # Test Supabase connection
    try:
        import aiohttp
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        bucket_name = os.getenv('SUPABASE_BUCKET')
        
        # Test bucket access
        headers = {
            'Authorization': f'Bearer {supabase_key}',
            'apikey': supabase_key
        }
        
        async with aiohttp.ClientSession() as session:
            # Test storage API access
            url = f"{supabase_url}/storage/v1/bucket/{bucket_name}"
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    print(f"✅ Successfully connected to Supabase bucket: {bucket_name}")
                else:
                    print(f"❌ Failed to access bucket: HTTP {response.status}")
                    print("Troubleshooting tips:")
                    print("1. Check your SUPABASE_URL and SUPABASE_ANON_KEY")
                    print("2. Verify bucket name exists")
                    print("3. Check bucket permissions")
                    return False
        
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check your Supabase URL and API key")
        print("2. Verify bucket name")
        print("3. Ensure bucket exists in your Supabase project")
        return False
    
    # Create test file
    test_file = Path("test_upload.txt")
    test_content = f"TeleSync Supabase Test - {datetime.now().isoformat()}"
    test_file.write_text(test_content)
    
    print(f"✅ Created test file: {test_file}")
    
    # Test upload
    try:
        metadata = FileMetadata(
            user_id="test-user",
            channel_name="test-channel",
            channel_username="test",
            filename="test_upload.txt",
            file_size=test_file.stat().st_size,
            file_type="text/plain",
            cloud_path="",
            local_path=str(test_file),
            source="test"
        )
        
        print("📤 Testing file upload...")
        upload_success = await cloud_storage.upload_file(test_file, metadata)
        
        if upload_success:
            print(f"✅ Upload successful! Cloud path: {metadata.cloud_path}")
        else:
            print("❌ Upload failed")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False
    
    # Test download
    try:
        download_path = Path("test_download.txt")
        print("📥 Testing file download...")
        
        download_success = await cloud_storage.download_file(metadata.cloud_path, download_path)
        
        if download_success:
            downloaded_content = download_path.read_text()
            if downloaded_content == test_content:
                print("✅ Download successful and content matches!")
            else:
                print("❌ Download successful but content doesn't match")
                return False
        else:
            print("❌ Download failed")
            return False
            
    except Exception as e:
        print(f"❌ Download error: {e}")
        return False
    
    # Test metadata retrieval
    try:
        print("📋 Testing metadata retrieval...")
        user_files = await cloud_storage.get_user_files("test-user")
        
        if user_files:
            print(f"✅ Retrieved {len(user_files)} files for test-user")
            test_file_found = any(f['filename'] == 'test_upload.txt' for f in user_files)
            if test_file_found:
                print("✅ Test file found in metadata")
            else:
                print("❌ Test file not found in metadata")
                return False
        else:
            print("❌ No files found in metadata")
            return False
            
    except Exception as e:
        print(f"❌ Metadata retrieval error: {e}")
        return False
    
    # Test delete
    try:
        print("🗑️ Testing file deletion...")
        delete_success = await cloud_storage.delete_file(metadata.cloud_path)
        
        if delete_success:
            print("✅ File deletion successful")
        else:
            print("❌ File deletion failed")
            return False
            
    except Exception as e:
        print(f"❌ Delete error: {e}")
        return False
    
    # Cleanup local files
    try:
        test_file.unlink()
        download_path.unlink()
        print("✅ Cleaned up local test files")
    except Exception as e:
        print(f"⚠️ Warning: Failed to clean up local files: {e}")
    
    print("\n🎉 All tests passed! Your Supabase setup is working correctly.")
    print("\nNext steps:")
    print("1. Deploy your cloud monitor with these environment variables")
    print("2. Set up your Telegram channels")
    print("3. Test the full sync workflow")
    print("4. When you're ready to scale, migrate to AWS S3")
    
    return True

def main():
    """Main function"""
    try:
        success = asyncio.run(test_supabase_setup())
        if not success:
            print("\n❌ Supabase setup test failed. Please fix the issues above.")
            exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(1)

if __name__ == "__main__":
    main()


