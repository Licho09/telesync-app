#!/usr/bin/env python3
"""
Python entry point for Render deployment
This starts both the Node.js server and Python monitor
"""

import subprocess
import os
import sys
import time
import threading
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

def main():
    """Main entry point."""
    print("🌐 TeleSync Backend Starting...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("server.js").exists():
        print("❌ server.js not found. Make sure you're in the project root.")
        sys.exit(1)
    
    # Start Node.js server in a separate thread
    node_thread = threading.Thread(target=start_node_server, daemon=True)
    node_thread.start()
    
    # Give Node.js server time to start
    print("⏳ Waiting for Node.js server to start...")
    time.sleep(5)
    
    print("✅ Backend is running!")
    print("📡 Node.js server: http://localhost:3001")
    print("🤖 Python monitor: Ready to start when Telegram connects")
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
