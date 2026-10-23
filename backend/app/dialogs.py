import sys
import subprocess
import os

def choose_file(title="Select Word Template", initial_dir=""):
    init_dir = initial_dir if (initial_dir and os.path.exists(initial_dir)) else os.getcwd()
    script = '''
import sys
import tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
root.wm_attributes('-topmost', 1)
root.lift()
root.focus_force()
title = sys.argv[1] if len(sys.argv) > 1 else "Select File"
initialdir = sys.argv[2] if len(sys.argv) > 2 else ""
res = filedialog.askopenfilename(
    title=title,
    filetypes=[("Word Document", "*.docx"), ("All Files", "*.*")],
    initialdir=initialdir
)
root.destroy()
print(res)
'''
    try:
        proc = subprocess.run(
            [sys.executable, "-c", script, title, init_dir],
            capture_output=True,
            text=True,
            timeout=180
        )
        return proc.stdout.strip()
    except Exception:
        return ""

def choose_folder(title="Select Output Folder for Invoices", initial_dir="C:\\invoices"):
    if not initial_dir or not os.path.exists(initial_dir):
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        initial_dir = desktop if os.path.exists(desktop) else os.path.expanduser("~")

    script = '''
import sys
import tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
root.wm_attributes('-topmost', 1)
root.lift()
root.focus_force()
title = sys.argv[1] if len(sys.argv) > 1 else "Select Folder"
initialdir = sys.argv[2] if len(sys.argv) > 2 else ""
res = filedialog.askdirectory(
    title=title,
    initialdir=initialdir
)
root.destroy()
print(res)
'''
    try:
        proc = subprocess.run(
            [sys.executable, "-c", script, title, initial_dir],
            capture_output=True,
            text=True,
            timeout=180
        )
        selected = proc.stdout.strip()
        if selected:
            return selected
    except Exception:
        pass

    # Secondary fallback using PowerShell FolderBrowserDialog
    try:
        ps_cmd = f'''
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "{title}"
$dialog.ShowNewFolderButton = $true
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.SelectedPath
}}
'''
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_cmd],
            capture_output=True,
            text=True,
            timeout=180
        )
        return proc.stdout.strip()
    except Exception:
        return ""
