import os
import sys
import time
import socket
import urllib.request
import webbrowser
import threading
import subprocess
from pathlib import Path

import io
ROOT_DIR = Path(__file__).resolve().parent

class TeeStream(io.TextIOBase):
    def __init__(self, filename, original_stream):
        self.file = open(filename, "a", encoding="utf-8", buffering=1)
        self.original = original_stream

    @property
    def encoding(self):
        return getattr(self.original, "encoding", "utf-8") or "utf-8"

    @property
    def errors(self):
        return getattr(self.original, "errors", "replace")

    def isatty(self):
        return getattr(self.original, "isatty", lambda: False)()

    def write(self, data):
        if self.original:
            try:
                self.original.write(data)
                self.original.flush()
            except Exception:
                pass
        try:
            self.file.write(data)
            self.file.flush()
        except Exception:
            pass
        return len(data)

    def flush(self):
        if self.original:
            try:
                self.original.flush()
            except Exception:
                pass
        try:
            self.file.flush()
        except Exception:
            pass

log_path = ROOT_DIR / "server.log"
sys.stdout = TeeStream(log_path, sys.stdout)
sys.stderr = TeeStream(log_path, sys.stderr)

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.8)
        return s.connect_ex((host, port)) == 0

def wait_for_server(url: str, timeout: float = 25.0) -> bool:
    """Waits until the server is actually responding with HTTP 200 on /api/health."""
    health_url = f"{url}/api/health"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            req = urllib.request.Request(
                health_url,
                headers={"User-Agent": "InvoiceGeneratorLauncher/1.0"}
            )
            with urllib.request.urlopen(req, timeout=0.8) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.15)
    return False

def kill_process_on_port(port: int):
    """Cleanly terminates any stale/zombie process occupying the target port."""
    try:
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-Command", f"(Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue).OwningProcess"],
            capture_output=True,
            text=True,
            timeout=5
        )
        pids = [int(p.strip()) for p in proc.stdout.splitlines() if p.strip().isdigit()]
        for pid in set(pids):
            if pid > 0 and pid != os.getpid():
                subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True, timeout=5)
        time.sleep(0.5)
    except Exception:
        pass

def open_in_browser(url: str, wait: bool = True):
    if wait:
        ready = wait_for_server(url, timeout=25.0)
        if not ready:
            print("[WARNING] Server did not respond within timeout; attempting browser open anyway...")
        else:
            print("[INFO] Server is healthy and responding. Launching application window...")

    # Flags to force direct offline loopback without proxy delays or WPAD detection
    chrome_flags = ["--no-proxy-server", f"--app={url}"]

    # 1. Check Google Chrome
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    chrome_bin = next((p for p in chrome_paths if os.path.exists(p)), None)
    if chrome_bin:
        try:
            subprocess.Popen([chrome_bin] + chrome_flags)
            return
        except Exception as e:
            print(f"[WARNING] Chrome launch error: {e}")

    # 2. Check Microsoft Edge (Chromium based, installed by default on Windows)
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
    ]
    edge_bin = next((p for p in edge_paths if os.path.exists(p)), None)
    if edge_bin:
        try:
            subprocess.Popen([edge_bin] + chrome_flags)
            return
        except Exception as e:
            print(f"[WARNING] Edge launch error: {e}")

    # 3. Fallback to default browser
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[WARNING] Could not open browser automatically: {e}")

def main():
    os.chdir(ROOT_DIR)
    
    # Ensure invoice storage directory exists
    invoices_dir = Path("C:/invoices")
    try:
        invoices_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    # Verify template exists
    template_path = ROOT_DIR / "template" / "Bill_PW_004.docx"
    if not template_path.exists():
        print(f"[ERROR] Template not found at: {template_path}")
        print("Please ensure template/Bill_PW_004.docx is in place.")
        if sys.stdin and sys.stdin.isatty():
            input("Press Enter to exit...")
        sys.exit(1)

    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"

    print("=" * 70)
    print("   Piyush Welding & Fabrication - Invoice Automation System")
    print("=" * 70)
    print(f"  * Web Application URL : {url}")
    print(f"  * Output Invoices Dir : C:\\invoices\\")
    print(f"  * Local SQLite DB     : data\\invoices.db")
    print(f"  * Word Template       : template\\Bill_PW_004.docx")
    print("=" * 70)

    if is_port_in_use(port, host):
        if wait_for_server(url, timeout=1.2):
            print(f"[INFO] Server is already running and active at {url}. Opening window...")
            open_in_browser(url, wait=False)
            print("[INFO] Application is ready in your browser.")
            if sys.stdin and sys.stdin.isatty():
                print("Press Enter to exit this launcher window...")
                try:
                    input()
                except Exception:
                    pass
            return
        else:
            print(f"[WARNING] Port {port} is occupied by an unresponsive process. Clearing it...")
            kill_process_on_port(port)

    # Start browser opener in background thread that waits until server is ready
    threading.Thread(target=open_in_browser, args=(url, True), daemon=True).start()

    print("[INFO] Starting server and opening Google Chrome...")
    print("[INFO] Keep this window open while using the application.")
    print("[INFO] Press Ctrl+C to stop the server at any time.")
    print("-" * 70)

    try:
        import uvicorn
        uvicorn.run(
            "backend.app.main:app",
            host=host,
            port=port,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped by user.")
    except Exception as e:
        with open(ROOT_DIR / "crash.log", "a", encoding="utf-8") as f:
            import traceback
            f.write(f"Server exception: {e}\n{traceback.format_exc()}\n")
        print(f"\n[ERROR] Server encountered an error: {e}")
        if sys.stdin and sys.stdin.isatty():
            try:
                input("Press Enter to exit...")
            except Exception:
                pass
        sys.exit(1)

if __name__ == "__main__":
    main()
