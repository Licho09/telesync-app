#!/usr/bin/env python3
"""
Run Telegram Monitor Locally
This script helps you run the Telegram monitor locally while using the deployed backend
"""

import os
import sys
import asyncio
from telegram_monitor import start_monitor

async def main():
    print("🚀 TeleSync Local Telegram Monitor")
    print("=" * 50)
    
    # Configuration
    user_id = "demo-user-123"
    api_id = 24409882  # Your API ID
    api_hash = "a13b642bf2d39326e44bf02a5a05707b"  # Your API Hash
    phone = "+18327080194"  # Your phone number
    
    # Set the backend URL to your deployed backend
    os.environ['WEB_APP_URL'] = 'https://telesync-backend-jkqs.onrender.com'
    
    print(f"User ID: {user_id}")
    print(f"Phone: {phone}")
    print(f"Backend URL: {os.environ['WEB_APP_URL']}")
    print("=" * 50)
    print("Starting monitor... (Press Ctrl+C to stop)")
    print("=" * 50)
    
    try:
        await start_monitor(user_id, api_id, api_hash, phone)
    except KeyboardInterrupt:
        print("\n🛑 Monitor stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())






