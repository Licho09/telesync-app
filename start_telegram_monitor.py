#!/usr/bin/env python3
"""
Start Telegram Monitor for TeleSync
This script starts the Telegram monitoring service for a user
"""

import asyncio
import sys
import json
from telegram_monitor import start_monitor

async def main():
    if len(sys.argv) < 5:
        print("Usage: python start_telegram_monitor.py <user_id> <api_id> <api_hash> <phone> [channels...]")
        print("Example: python start_telegram_monitor.py user123 12345678 abcdef1234567890 +1234567890 @channel1 @channel2")
        sys.exit(1)
    
    user_id = sys.argv[1]
    api_id = int(sys.argv[2])
    api_hash = sys.argv[3]
    phone = sys.argv[4]
    channels = sys.argv[5:] if len(sys.argv) > 5 else []
    
    print(f"Starting Telegram monitor for user: {user_id}")
    print(f"Phone: {phone}")
    print(f"Channels to monitor: {channels if channels else 'None (will be added via web app)'}")
    print("Press Ctrl+C to stop monitoring")
    print("-" * 50)
    
    try:
        await start_monitor(user_id, api_id, api_hash, phone, channels)
    except KeyboardInterrupt:
        print("\nStopping monitor...")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())











