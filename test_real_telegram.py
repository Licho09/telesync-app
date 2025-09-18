#!/usr/bin/env python3
"""
Test script for real Telegram API integration
Run this to test your Telegram credentials before using the full system
"""

import asyncio
import json
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

async def test_telegram_connection():
    """Test Telegram API connection with your credentials"""
    
    # Load configuration
    try:
        with open('telegram_config.json', 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        print("❌ telegram_config.json not found!")
        print("Please create it with your API credentials first.")
        return
    
    api_id = config.get('api_id')
    api_hash = config.get('api_hash')
    phone = config.get('phone')
    session_name = config.get('session_name', 'test_session')
    
    if not all([api_id, api_hash, phone]):
        print("❌ Missing API credentials in telegram_config.json")
        print("Please add your api_id, api_hash, and phone number.")
        return
    
    print(f"🔗 Testing connection with phone: {phone}")
    print(f"📱 API ID: {api_id}")
    print(f"🔑 API Hash: {api_hash[:8]}...")
    
    # Create client
    client = TelegramClient(session_name, api_id, api_hash)
    
    try:
        # Connect and authenticate
        await client.start(phone=phone)
        
        # Get user info
        me = await client.get_me()
        print(f"✅ Successfully connected as: {me.first_name} {me.last_name or ''}")
        print(f"📞 Phone: {me.phone}")
        print(f"🆔 User ID: {me.id}")
        
        # Test getting dialogs (chats/channels)
        dialogs = await client.get_dialogs(limit=5)
        print(f"\n📋 Found {len(dialogs)} recent chats/channels:")
        for dialog in dialogs:
            print(f"  - {dialog.name} ({dialog.entity.__class__.__name__})")
        
        print("\n🎉 Telegram API test successful!")
        print("You can now use real Telegram integration.")
        
    except SessionPasswordNeededError:
        print("🔐 Two-factor authentication is enabled.")
        print("Please enter your 2FA password:")
        password = input("Password: ")
        await client.sign_in(password=password)
        print("✅ 2FA authentication successful!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Check your API credentials at https://my.telegram.org")
        print("2. Make sure your phone number is in international format (+1234567890)")
        print("3. Verify you have internet connection")
        
    finally:
        await client.disconnect()

if __name__ == "__main__":
    print("🚀 Testing Telegram API Integration...")
    asyncio.run(test_telegram_connection())










