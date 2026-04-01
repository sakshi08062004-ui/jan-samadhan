#!/usr/bin/env python3
"""
JAN SAMADHAN Backend Server Starter
Quick script to start the backend server with proper configuration
"""

import sys
import os
import subprocess
import time
import requests
from pathlib import Path

def check_python_version():
    """Check if Python 3.6+ is installed"""
    if sys.version_info < (3, 6):
        print("❌ Python 3.6+ is required")
        print(f"   Current version: {sys.version}")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = ['flask', 'flask_cors', 'flask_jwt_extended', 'werkzeug']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('_', '-'))
            print(f"✅ {package} is installed")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} is missing")
    
    if missing_packages:
        print(f"\n📦 Installing missing packages: {', '.join(missing_packages)}")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing_packages)
            print("✅ All dependencies installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install packages: {e}")
            return False
    
    return True

def check_port_available(port):
    """Check if port is available"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return True
        except OSError:
            return False

def start_backend_server():
    """Start the backend server"""
    # Get the backend directory
    backend_dir = Path(__file__).parent / 'backend'
    
    if not backend_dir.exists():
        print(f"❌ Backend directory not found: {backend_dir}")
        return False
    
    # Change to backend directory
    os.chdir(backend_dir)
    print(f"📁 Changed to directory: {os.getcwd()}")
    
    # List available backend files
    backend_files = [
        ('fullstack_app.py', 8000, 'Full-Stack Backend')
    ]
    
    print("\n🔍 Available backend files:")
    for filename, port, description in backend_files:
        available = Path(filename).exists()
        port_free = check_port_available(port)
        status = "✅" if available and port_free else "❌"
        print(f"   {status} {description} ({filename} - port {port})")
    
    # Try to start each backend
    for filename, port, description in backend_files:
        backend_file = Path(filename)
        if not backend_file.exists():
            print(f"⏭️  Skipping {filename} (not found)")
            continue
        
        if not check_port_available(port):
            print(f"⏭️  Skipping {filename} (port {port} in use)")
            continue
        
        print(f"\n🚀 Starting {description}...")
        print(f"   File: {filename}")
        print(f"   Port: {port}")
        print(f"   URL: http://localhost:{port}")
        
        try:
            # Start the server using uvicorn
            cmd = [sys.executable, "-m", "uvicorn", "fullstack_app:app", "--host", "0.0.0.0", "--port", str(port)]
            process = subprocess.Popen(cmd)
            
            # Wait a moment for server to start
            time.sleep(5)
            
            # Test if server is responding
            try:
                response = requests.get(f"http://127.0.0.1:{port}/api/health", timeout=5)
                if response.status_code == 200:
                    print(f"✅ {description} started successfully!")
                    print(f"🌐 Server is running at: http://127.0.0.1:{port}")
                    print(f"📱 Customer Panel: http://127.0.0.1:8000/customer-panel.html")
                    print(f"📱 Admin Panel:    http://127.0.0.1:8000/admin-panel.html")
                    print(f"\n📋 Server Details:")
                    print(f"   - Backend URL: http://localhost:{port}")
                    print(f"   - API Endpoint: http://localhost:{port}/api")
                    print(f"   - Health Check: http://localhost:{port}/api/health")
                    print(f"   - Process ID: {process.pid}")
                    print(f"\n🔄 Press Ctrl+C to stop the server")
                    
                    # Keep the script running
                    try:
                        process.wait()
                    except KeyboardInterrupt:
                        print(f"\n🛑 Stopping {description}...")
                        process.terminate()
                        process.wait()
                        print("✅ Server stopped")
                    
                    return True
                else:
                    print(f"❌ Server responded with status {response.status_code}")
                    process.terminate()
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Failed to connect to server: {e}")
                process.terminate()
                
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to start {filename}: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
    
    print(f"\n❌ Failed to start any backend server")
    return False

def main():
    """Main function"""
    print("🔧 JAN SAMADHAN Backend Server Starter")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        input("Press Enter to exit...")
        return 1
    
    # Check dependencies
    if not check_dependencies():
        input("Press Enter to exit...")
        return 1
    
    # Start backend server
    if not start_backend_server():
        input("Press Enter to exit...")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
