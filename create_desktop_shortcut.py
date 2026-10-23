import os
import subprocess
from pathlib import Path

def create_shortcut():
    root_dir = Path(__file__).resolve().parent
    vbs_path = root_dir / "Launch_App_Silent.vbs"
    
    desktop_dirs = [
        Path(os.path.expanduser("~")) / "Desktop",
        Path(os.path.expanduser("~")) / "OneDrive" / "Desktop",
        root_dir
    ]
    
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    icon_target = next((p for p in chrome_paths if os.path.exists(p)), "")
    
    ps_code = f'''
$WshShell = New-Object -ComObject WScript.Shell
'''
    created = []
    for d in desktop_dirs:
        if d.exists():
            lnk = d / "Piyush Invoice Generator.lnk"
            ps_code += f'''
$s = $WshShell.CreateShortcut("{lnk}")
$s.TargetPath = "wscript.exe"
$s.Arguments = '"{vbs_path}"'
$s.WorkingDirectory = "{root_dir}"
$s.Description = "Piyush Welding & Fabrication Invoice Generator"
'''
            if icon_target:
                ps_code += f'$s.IconLocation = "{icon_target}, 0"\n'
            ps_code += '$s.Save()\n'
            created.append(str(lnk))
            
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_code], capture_output=True, text=True)
    for c in created:
        print(f"Created desktop shortcut: {c}")

if __name__ == "__main__":
    create_shortcut()
