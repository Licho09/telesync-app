#!/usr/bin/env python3
"""
Mock Telegram Monitor for testing - doesn't require external packages
"""
import json
import logging
import os
import sys
import time
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def start_monitor(user_id, api_id, api_hash, phone_number, web_app_url):
    """Mock monitor that simulates the real monitor"""
    logger.info(f"[MOCK MONITOR {user_id}] Starting mock monitor...")
    logger.info(f"[MOCK MONITOR {user_id}] Using web app URL: {web_app_url}")
    logger.info(f"[MOCK MONITOR {user_id}] Mock connected to Telegram for user {user_id}")
    logger.info(f"[MOCK MONITOR {user_id}] 🚀 Mock monitor is running! (This is a test version)")
    
    # Simulate monitoring
    try:
        while True:
            time.sleep(30)  # Check every 30 seconds
            logger.info(f"[MOCK MONITOR {user_id}] Mock check - no new videos found")
    except KeyboardInterrupt:
        logger.info(f"[MOCK MONITOR {user_id}] Mock monitor stopped")

if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: python mock_telegram_monitor.py <user_id> <api_id> <api_hash> <phone_number> <web_app_url>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    api_id = sys.argv[2]
    api_hash = sys.argv[3]
    phone_number = sys.argv[4]
    web_app_url = sys.argv[5]
    
    start_monitor(user_id, api_id, api_hash, phone_number, web_app_url)
