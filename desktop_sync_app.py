#!/usr/bin/env python3
"""
Desktop Sync Application for TeleSync
Simple GUI application for syncing files from cloud storage to local folder
"""

import asyncio
import json
import logging
import os
import sys
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import ttk, messagebox, filedialog
import threading

from local_sync_service import LocalSyncService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('desktop_sync.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DesktopSyncApp:
    """Desktop sync application with GUI"""
    
    def __init__(self):
        """Initialize the desktop sync app"""
        self.root = tk.Tk()
        self.root.title("TeleSync Desktop Sync")
        self.root.geometry("600x500")
        
        # Sync service
        self.sync_service = None
        self.sync_thread = None
        self.sync_running = False
        
        # GUI variables
        self.user_id_var = tk.StringVar(value="demo-user-123")
        self.sync_path_var = tk.StringVar(value=str(Path.home() / "Downloads" / "telesync"))
        self.sync_enabled_var = tk.BooleanVar(value=True)
        self.sync_interval_var = tk.IntVar(value=300)  # 5 minutes
        
        # Status variables
        self.status_var = tk.StringVar(value="Not connected")
        self.last_sync_var = tk.StringVar(value="Never")
        self.total_files_var = tk.StringVar(value="0")
        self.total_size_var = tk.StringVar(value="0 B")
        
        self.setup_gui()
        
    def setup_gui(self):
        """Setup the GUI"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="TeleSync Desktop Sync", font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # User ID
        ttk.Label(main_frame, text="User ID:").grid(row=1, column=0, sticky=tk.W, pady=5)
        user_id_entry = ttk.Entry(main_frame, textvariable=self.user_id_var, width=30)
        user_id_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=5, padx=(10, 0))
        
        # Sync Path
        ttk.Label(main_frame, text="Sync Path:").grid(row=2, column=0, sticky=tk.W, pady=5)
        path_frame = ttk.Frame(main_frame)
        path_frame.grid(row=2, column=1, sticky=(tk.W, tk.E), pady=5, padx=(10, 0))
        path_frame.columnconfigure(0, weight=1)
        
        path_entry = ttk.Entry(path_frame, textvariable=self.sync_path_var)
        path_entry.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 5))
        
        browse_button = ttk.Button(path_frame, text="Browse", command=self.browse_sync_path)
        browse_button.grid(row=0, column=1)
        
        # Sync Settings
        settings_frame = ttk.LabelFrame(main_frame, text="Sync Settings", padding="10")
        settings_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=20)
        settings_frame.columnconfigure(1, weight=1)
        
        # Enable Sync
        sync_check = ttk.Checkbutton(settings_frame, text="Enable automatic sync", variable=self.sync_enabled_var)
        sync_check.grid(row=0, column=0, columnspan=2, sticky=tk.W, pady=5)
        
        # Sync Interval
        ttk.Label(settings_frame, text="Sync Interval (seconds):").grid(row=1, column=0, sticky=tk.W, pady=5)
        interval_spin = ttk.Spinbox(settings_frame, from_=60, to=3600, textvariable=self.sync_interval_var, width=10)
        interval_spin.grid(row=1, column=1, sticky=tk.W, pady=5, padx=(10, 0))
        
        # Control Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=4, column=0, columnspan=3, pady=20)
        
        self.start_button = ttk.Button(button_frame, text="Start Sync", command=self.start_sync)
        self.start_button.grid(row=0, column=0, padx=5)
        
        self.stop_button = ttk.Button(button_frame, text="Stop Sync", command=self.stop_sync, state=tk.DISABLED)
        self.stop_button.grid(row=0, column=1, padx=5)
        
        self.sync_now_button = ttk.Button(button_frame, text="Sync Now", command=self.sync_now)
        self.sync_now_button.grid(row=0, column=2, padx=5)
        
        # Status Section
        status_frame = ttk.LabelFrame(main_frame, text="Status", padding="10")
        status_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=20)
        status_frame.columnconfigure(1, weight=1)
        
        # Status fields
        ttk.Label(status_frame, text="Status:").grid(row=0, column=0, sticky=tk.W, pady=2)
        ttk.Label(status_frame, textvariable=self.status_var).grid(row=0, column=1, sticky=tk.W, pady=2, padx=(10, 0))
        
        ttk.Label(status_frame, text="Last Sync:").grid(row=1, column=0, sticky=tk.W, pady=2)
        ttk.Label(status_frame, textvariable=self.last_sync_var).grid(row=1, column=1, sticky=tk.W, pady=2, padx=(10, 0))
        
        ttk.Label(status_frame, text="Total Files:").grid(row=2, column=0, sticky=tk.W, pady=2)
        ttk.Label(status_frame, textvariable=self.total_files_var).grid(row=2, column=1, sticky=tk.W, pady=2, padx=(10, 0))
        
        ttk.Label(status_frame, text="Total Size:").grid(row=3, column=0, sticky=tk.W, pady=2)
        ttk.Label(status_frame, textvariable=self.total_size_var).grid(row=3, column=1, sticky=tk.W, pady=2, padx=(10, 0))
        
        # Log Section
        log_frame = ttk.LabelFrame(main_frame, text="Log", padding="10")
        log_frame.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=20)
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(6, weight=1)
        
        # Log text widget
        self.log_text = tk.Text(log_frame, height=8, wrap=tk.WORD)
        log_scrollbar = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=log_scrollbar.set)
        
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # Start status update timer
        self.update_status()
        
    def browse_sync_path(self):
        """Browse for sync path"""
        path = filedialog.askdirectory(initialdir=self.sync_path_var.get())
        if path:
            self.sync_path_var.set(path)
    
    def log_message(self, message: str):
        """Add message to log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        
        # Keep only last 100 lines
        lines = self.log_text.get("1.0", tk.END).split('\n')
        if len(lines) > 100:
            self.log_text.delete("1.0", f"{len(lines)-100}.0")
    
    def start_sync(self):
        """Start the sync service"""
        try:
            user_id = self.user_id_var.get().strip()
            sync_path = self.sync_path_var.get().strip()
            
            if not user_id:
                messagebox.showerror("Error", "Please enter a User ID")
                return
            
            if not sync_path:
                messagebox.showerror("Error", "Please select a sync path")
                return
            
            # Create sync service
            self.sync_service = LocalSyncService(user_id, sync_path)
            self.sync_service.sync_enabled = self.sync_enabled_var.get()
            self.sync_service.set_sync_interval(self.sync_interval_var.get())
            
            # Start sync in background thread
            self.sync_thread = threading.Thread(target=self.run_sync_loop, daemon=True)
            self.sync_thread.start()
            
            self.sync_running = True
            self.start_button.config(state=tk.DISABLED)
            self.stop_button.config(state=tk.NORMAL)
            
            self.log_message(f"Started sync for user: {user_id}")
            self.log_message(f"Sync path: {sync_path}")
            self.status_var.set("Running")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start sync: {e}")
            self.log_message(f"Error starting sync: {e}")
    
    def stop_sync(self):
        """Stop the sync service"""
        try:
            if self.sync_service:
                self.sync_service.disable_sync()
                self.sync_running = False
                
                self.start_button.config(state=tk.NORMAL)
                self.stop_button.config(state=tk.DISABLED)
                
                self.log_message("Sync stopped")
                self.status_var.set("Stopped")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to stop sync: {e}")
            self.log_message(f"Error stopping sync: {e}")
    
    def sync_now(self):
        """Perform immediate sync"""
        if not self.sync_service:
            messagebox.showwarning("Warning", "Please start sync first")
            return
        
        def run_sync():
            try:
                self.log_message("Starting manual sync...")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                result = loop.run_until_complete(self.sync_service.sync_all_files())
                
                if result['status'] == 'completed':
                    self.log_message(f"Manual sync completed: {result['successful']}/{result['total_files']} files")
                else:
                    self.log_message(f"Manual sync failed: {result.get('error', 'Unknown error')}")
                
                loop.close()
                
            except Exception as e:
                self.log_message(f"Error in manual sync: {e}")
        
        # Run in background thread
        sync_thread = threading.Thread(target=run_sync, daemon=True)
        sync_thread.start()
    
    def run_sync_loop(self):
        """Run the sync loop in background thread"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Run periodic sync
            loop.run_until_complete(self.sync_service.start_periodic_sync())
            
        except Exception as e:
            self.log_message(f"Sync loop error: {e}")
        finally:
            loop.close()
    
    def update_status(self):
        """Update status display"""
        try:
            if self.sync_service and self.sync_running:
                # Get sync status
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                status = loop.run_until_complete(self.sync_service.get_sync_status())
                
                self.last_sync_var.set(status.get('last_sync', 'Never') or 'Never')
                self.total_files_var.set(str(status.get('total_synced', 0)))
                
                # Format total size
                total_size = status.get('total_size', 0)
                if total_size > 0:
                    size_str = self.format_size(total_size)
                else:
                    size_str = "0 B"
                self.total_size_var.set(size_str)
                
                loop.close()
            
        except Exception as e:
            logger.error(f"Error updating status: {e}")
        
        # Schedule next update
        self.root.after(5000, self.update_status)  # Update every 5 seconds
    
    def format_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        return f"{size_bytes:.1f} {size_names[i]}"
    
    def on_closing(self):
        """Handle application closing"""
        if self.sync_running:
            self.stop_sync()
        self.root.destroy()
    
    def run(self):
        """Run the application"""
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.root.mainloop()

def main():
    """Main function"""
    try:
        app = DesktopSyncApp()
        app.run()
    except Exception as e:
        logger.error(f"Error running desktop sync app: {e}")
        messagebox.showerror("Error", f"Failed to start application: {e}")

if __name__ == "__main__":
    main()


