#!/usr/bin/env python3
"""
Test script to check if Python packages are available
"""
import sys
import subprocess

def test_imports():
    """Test if required packages can be imported"""
    packages = ['requests', 'telethon', 'yt_dlp']
    
    for package in packages:
        try:
            if package == 'yt_dlp':
                import yt_dlp
                print(f"✅ {package} imported successfully")
            else:
                __import__(package)
                print(f"✅ {package} imported successfully")
        except ImportError as e:
            print(f"❌ {package} import failed: {e}")
            return False
    
    return True

def test_pip_list():
    """List installed packages"""
    try:
        result = subprocess.run([sys.executable, '-m', 'pip', 'list'], 
                              capture_output=True, text=True)
        print("Installed packages:")
        print(result.stdout)
        return True
    except Exception as e:
        print(f"Failed to list packages: {e}")
        return False

if __name__ == "__main__":
    print("Testing Python package availability...")
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    
    test_pip_list()
    test_imports()




