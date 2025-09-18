#!/usr/bin/env python3
"""
Python entry point for Render deployment
This starts both the Node.js server and cloud-based Python monitor
"""

import subprocess
import os
import sys
import time
import threading
import asyncio
from pathlib import Path

def start_node_server():
    """Start the Node.js server in a separate thread."""
    print("🚀 Starting Node.js server...")
    try:
        # Install Node.js dependencies if needed
        if not Path("node_modules").exists():
            print("📦 Installing Node.js dependencies...")
            subprocess.run(["npm", "install"], check=True)
        
        # Start the Node.js server
        subprocess.run(["node", "server.js"], check=True)
    except Exception as e:
        print(f"❌ Error starting Node.js server: {e}")
        sys.exit(1)

def start_cloud_monitor():
    """Start the cloud-based Telegram monitor."""
    print("☁️ Starting cloud Telegram monitor...")
    try:
        # Import and start the cloud monitor
        from telegram_monitor_cloud import main as cloud_main
        asyncio.run(cloud_main())
    except Exception as e:
        print(f"❌ Error starting cloud monitor: {e}")
        # Don't exit, just log the error and continue with Node.js server

def main():
    """Main entry point."""
    print("🌐 TeleSync Cloud Backend Starting...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("server.js").exists():
        print("❌ server.js not found. Make sure you're in the project root.")
        sys.exit(1)
    
    # Check cloud storage environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_BUCKET']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"⚠️ Missing cloud storage environment variables: {missing_vars}")
        print("Cloud monitoring will not be available.")
    else:
        print("✅ Cloud storage environment variables found")
    
    # Start Node.js server in a separate thread
    node_thread = threading.Thread(target=start_node_server, daemon=True)
    node_thread.start()
    
    # Give Node.js server time to start
    print("⏳ Waiting for Node.js server to start...")
    time.sleep(5)
    
    # Start cloud monitor if environment variables are available
    if not missing_vars:
        cloud_thread = threading.Thread(target=start_cloud_monitor, daemon=True)
        cloud_thread.start()
        print("☁️ Cloud monitor started")
    else:
        print("⚠️ Cloud monitor not started - missing environment variables")
    
    print("✅ Backend is running!")
    print("📡 Node.js server: http://localhost:3001")
    print("☁️ Cloud storage: Supabase")
    print("🤖 Telegram monitoring: Ready for user connections")
    print("=" * 50)
    
    # Keep the main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        sys.exit(0)

if __name__ == "__main__":
    main()






