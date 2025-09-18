#!/usr/bin/env python3
"""
Test Supabase upload functionality
"""

import os
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_supabase_upload():
    """Test Supabase upload with a small test file"""
    
    # Get environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    bucket_name = os.getenv('SUPABASE_BUCKET')
    
    print(f"Supabase URL: {supabase_url}")
    print(f"Supabase Key: {supabase_key[:20]}..." if supabase_key else "None")
    print(f"Bucket Name: {bucket_name}")
    
    if not all([supabase_url, supabase_key, bucket_name]):
        print("❌ Missing required environment variables")
        return False
    
    # Create a test file
    test_content = b"Hello, Supabase! This is a test file."
    test_file_path = Path("test_upload.txt")
    
    try:
        # Write test file
        async with aiofiles.open(test_file_path, 'wb') as f:
            await f.write(test_content)
        
        print(f"✅ Created test file: {test_file_path}")
        
        # Upload to Supabase
        cloud_path = "test/test_upload.txt"
        url = f"{supabase_url}/storage/v1/object/{bucket_name}/{cloud_path}"
        
        headers = {
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/octet-stream',
            'x-upsert': 'true'
        }
        
        print(f"📤 Uploading to: {url}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=test_content, headers=headers) as response:
                response_text = await response.text()
                
                print(f"📊 Response Status: {response.status}")
                print(f"📊 Response Text: {response_text}")
                
                if response.status == 200:
                    print("✅ Upload successful!")
                    return True
                else:
                    print("❌ Upload failed!")
                    return False
                    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        # Clean up test file
        if test_file_path.exists():
            test_file_path.unlink()
            print("🧹 Cleaned up test file")

if __name__ == "__main__":
    asyncio.run(test_supabase_upload())
