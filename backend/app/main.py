import os
import re
import subprocess
import threading
import ctypes
import getpass
import winreg
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from .winfocus import focus_window

from .calculations import calculate_invoice_totals, format_currency_inr
from .words import amount_to_words_inr
from .mistake_checker import validate_invoice_data
from .docx_engine import generate_invoice_docx
from .crud import (
    get_all_settings,
    set_setting,
    get_setting,
    get_next_invoice_number,
    has_invoice_serial,
    peek_next_serial,
    commit_serial,
    save_invoice_record,
    get_invoice_by_no,
    list_invoices,
    list_customers,
    export_backup_json
)

app = FastAPI(title="Piyush Welding & Fabrication Invoice Engine", version="1.0.0")

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InvoicePayload(BaseModel):
    invoice_no: str
    invoice_date: str
    place_of_supply: str = "Haryana (06)"
    station: str = "Gurugram"
    vehicle_no: str = ""
    eway_bill_no: str = ""
    customer_name: str
    customer_address: str = ""
    customer_gstin: str = ""
    customer_mobile: str = ""
    shipping_name: str = ""
    shipping_address: str = ""
    shipping_gstin: str = ""
    shipping_mobile: str = ""
    tax_type: str = "Intra-State (CGST + SGST)"
    cgst_rate: float = 9.0
    sgst_rate: float = 9.0
    igst_rate: float = 18.0
    template_path: str = ""
    items: List[Dict[str, Any]] = []

def get_current_session_id() -> int:
    try:
        session_id = ctypes.c_ulong()
        if ctypes.windll.kernel32.ProcessIdToSessionId(os.getpid(), ctypes.byref(session_id)):
            return session_id.value
    except Exception:
        pass
    return -1

def get_word_executable() -> str | None:
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE")
        val, _ = winreg.QueryValueEx(key, "")
        if val and os.path.exists(val):
            return os.path.normpath(val)
    except Exception:
        pass
    return None

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Piyush Welding Invoice Engine"}

@app.get("/api/debug/whoami")
def api_debug_whoami():
    try:
        username = getpass.getuser()
    except Exception:
        username = os.environ.get("USERNAME", "unknown")
    return {
        "pid": os.getpid(),
        "username": username,
        "session_id": get_current_session_id(),
        "cwd": os.getcwd()
    }

@app.get("/api/settings")
def api_get_settings():
    return get_all_settings()

@app.post("/api/settings")
def api_update_settings(settings: Dict[str, str]):
    for k, v in settings.items():
        set_setting(k, v)
    return {"status": "updated", "settings": get_all_settings()}

@app.get("/api/invoices/next-number")
def api_next_number():
    next_no = get_next_invoice_number()
    return {"next_invoice_no": next_no}

@app.post("/api/invoices/calculate")
def api_calculate(invoice: InvoicePayload):
    calc = calculate_invoice_totals(
        items=invoice.items,
        tax_type=invoice.tax_type,
        cgst_rate=invoice.cgst_rate,
        sgst_rate=invoice.sgst_rate,
        igst_rate=invoice.igst_rate
    )
    words = amount_to_words_inr(calc["final_amount"])
    subtotal_fmt = format_currency_inr(calc["subtotal"])
    cgst_fmt = format_currency_inr(calc["cgst_amount"])
    sgst_fmt = format_currency_inr(calc["sgst_amount"])
    igst_fmt = format_currency_inr(calc["igst_amount"])
    final_fmt = format_currency_inr(calc["final_amount"])
    return {
        "calculated": {
            "subtotal": float(calc["subtotal"]),
            "subtotal_formatted": subtotal_fmt,
            "is_igst": calc["is_igst"],
            "cgst_amount": float(calc["cgst_amount"]),
            "cgst_amount_formatted": cgst_fmt,
            "cgst_formatted": cgst_fmt,
            "sgst_amount": float(calc["sgst_amount"]),
            "sgst_amount_formatted": sgst_fmt,
            "sgst_formatted": sgst_fmt,
            "igst_amount": float(calc["igst_amount"]),
            "igst_amount_formatted": igst_fmt,
            "igst_formatted": igst_fmt,
            "round_off": float(calc["round_off"]),
            "round_off_formatted": f"{abs(calc['round_off']):.2f}",
            "final_amount": float(calc["final_amount"]),
            "final_amount_formatted": final_fmt,
            "amount_in_words": words
        }
    }

@app.post("/api/invoices/validate")
def api_validate(invoice: InvoicePayload):
    calc_res = api_calculate(invoice)["calculated"]
    return {
        "is_valid": True,
        "errors": [],
        "warnings": [],
        "info": [],
        "calculated": calc_res
    }

@app.post("/api/invoices/save-draft")
def api_save_draft(invoice: InvoicePayload):
    inv_dict = invoice.model_dump()
    inv_id = save_invoice_record(inv_dict, status="draft")
    return {"status": "saved", "id": inv_id, "invoice_no": inv_dict["invoice_no"]}

def get_word_executable() -> str:
    """Finds WINWORD.EXE path on Windows."""
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Winword.exe") as key:
            val, _ = winreg.QueryValueEx(key, "")
            if val and os.path.exists(val):
                return val
    except Exception:
        pass

    candidates = [
        r"C:\Program Files\Microsoft Office\Root\Office16\WINWORD.EXE",
        r"C:\Program Files (x86)\Microsoft Office\Root\Office16\WINWORD.EXE",
        r"C:\Program Files\Microsoft Office\Office16\WINWORD.EXE",
        r"C:\Program Files (x86)\Microsoft Office\Office16\WINWORD.EXE",
        r"C:\Program Files\Microsoft Office\Office15\WINWORD.EXE",
        r"C:\Program Files (x86)\Microsoft Office\Office15\WINWORD.EXE",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return ""

def launch_word_document(file_path: str) -> bool:
    """Reliably opens a document directly in Microsoft Word."""
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return True
    if not file_path or not os.path.exists(file_path):
        return False
    norm_path = os.path.normpath(os.path.abspath(file_path))

    # Priority 1: Launch Microsoft Word executable directly
    word_exe = get_word_executable()
    if word_exe:
        try:
            subprocess.Popen([word_exe, norm_path])
            return True
        except Exception as e:
            print(f"Direct WINWORD.EXE launch error: {e}")

    # Priority 2: os.startfile
    try:
        os.startfile(norm_path)
        return True
    except Exception as e:
        print(f"os.startfile error: {e}")

    # Priority 3: Windows ShellExecuteW
    try:
        import ctypes
        res = ctypes.windll.shell32.ShellExecuteW(None, "open", norm_path, None, None, 1)
        return res > 32
    except Exception as e:
        print(f"ShellExecuteW error: {e}")
        return False

@app.post("/api/invoices/generate-docx")
def api_generate_docx(invoice: InvoicePayload):
    inv_dict = invoice.model_dump()
    raw_inv_no = str(inv_dict.get("invoice_no") or "").strip()

    fy = get_setting("financial_year", "2026-27")
    prefix = get_setting("invoice_prefix", "PW")

    req_customer = (inv_dict.get("customer_name") or "").strip()
    seq_to_commit = None
    warning_msg = None

    if has_invoice_serial(raw_inv_no, fy=fy, prefix=prefix):
        cleaned_no = re.sub(r'[^A-Za-z0-9/\-]', '', raw_inv_no)[:16]
        existing_row = get_invoice_by_no(cleaned_no)

        if existing_row:
            existing_cust = (existing_row.get("customer_name") or "").strip()
            # If customer differs, treat as NEW invoice
            if existing_cust.lower() != req_customer.lower() and req_customer != "":
                seq_to_commit, assigned_no = peek_next_serial(fy=fy, prefix=prefix)
                warning_msg = f"Number {cleaned_no} belongs to {existing_cust}; assigned {assigned_no}"
                inv_dict["invoice_no"] = assigned_no
            else:
                # Same customer = regenerate, reuse the number
                inv_dict["invoice_no"] = cleaned_no
        else:
            # Does not exist in DB yet: use typed number
            inv_dict["invoice_no"] = cleaned_no
    else:
        # Serial is empty: auto-assign next serial (peek, no writes yet)
        seq_to_commit, assigned_no = peek_next_serial(fy=fy, prefix=prefix)
        inv_dict["invoice_no"] = assigned_no

    output_folder = get_setting("output_folder", r"C:\invoices")
    try:
        os.makedirs(output_folder, exist_ok=True)
    except Exception:
        output_folder = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "output", "invoices")
        )

    template_path = inv_dict.get("template_path") or None
    try:
        out_file = generate_invoice_docx(
            inv_dict,
            output_dir=output_folder,
            template_path=template_path,
            is_incomplete=False
        )

        # Call commit_serial ONLY after the file exists and is >0 bytes
        if os.path.exists(out_file) and os.path.getsize(out_file) > 0:
            if seq_to_commit is not None:
                commit_serial(seq_to_commit, fy=fy)
        else:
            raise IOError(f"Generated DOCX file is missing or 0 bytes: {out_file}")

        inv_id = save_invoice_record(inv_dict, status="generated", output_path=out_file)

        # Automatically open in Microsoft Word on Windows
        launch_word_document(out_file)

        return {
            "status": "success",
            "id": inv_id,
            "invoice_no": inv_dict["invoice_no"],
            "file_path": out_file,
            "filename": os.path.basename(out_file),
            "warning": warning_msg
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={"errors": [f"Could not generate document: {str(e)}"]})

@app.get("/api/invoices/download")
def api_download_invoice(file_path: str):
    if file_path and os.path.exists(file_path):
        return FileResponse(
            file_path,
            filename=os.path.basename(file_path),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    raise HTTPException(status_code=404, detail="File does not exist")

@app.get("/api/invoices")
def api_list_invoices(search: str = "", limit: int = 50):
    return list_invoices(limit=limit, search=search)

@app.get("/api/invoices/{invoice_no}")
def api_get_invoice(invoice_no: str):
    inv = get_invoice_by_no(invoice_no)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv

@app.get("/api/customers")
def api_list_customers():
    return list_customers()

@app.get("/api/backup")
def api_backup():
    return JSONResponse(
        content=export_backup_json(),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=invoices_backup.json"}
    )

@app.post("/api/invoices/open-file")
def api_open_file(data: Dict[str, str]):
    raw_path = data.get("file_path", "")
    norm_path = os.path.normpath(os.path.abspath(raw_path)) if raw_path else ""
    exists = os.path.exists(norm_path) if norm_path else False
    size = os.path.getsize(norm_path) if exists else 0
    session_id = get_current_session_id()

    print(f"\n==================================================")
    print(f"[API: open-file] Request received")
    print(f"[API: open-file] Server PID       : {os.getpid()}")
    print(f"[API: open-file] Session ID       : {session_id}")
    print(f"[API: open-file] Raw path         : {raw_path!r}")
    print(f"[API: open-file] Normalized path  : {norm_path!r}")
    print(f"[API: open-file] File exists      : {exists}")
    print(f"[API: open-file] File size        : {size} bytes")

    if not norm_path or not exists:
        err_msg = f"File does not exist at path: {norm_path}"
        print(f"[API: open-file] ERROR: {err_msg}")
        print(f"==================================================\n")
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": err_msg, "path": norm_path, "exists": False}
        )

    try:
        word_exe = get_word_executable()
        if word_exe:
            print(f"[API: open-file] Found WINWORD.EXE via registry: {word_exe}")
            print(f"[API: open-file] Invoking: subprocess.Popen([{word_exe!r}, {norm_path!r}])")
            proc = subprocess.Popen([word_exe, norm_path])
            word_title = os.path.splitext(os.path.basename(norm_path))[0]
            threading.Thread(
                target=focus_window,
                args=("OpusApp", word_title),
                kwargs={"fallback_any": True},
                daemon=True
            ).start()
            print(f"[API: open-file] Result: SUCCESS (Spawned WINWORD.EXE PID {proc.pid})")
            print(f"==================================================\n")
            return {
                "status": "success",
                "message": f"Successfully launched in Word: {os.path.basename(norm_path)}",
                "path": norm_path,
                "exists": True,
                "size_bytes": size,
                "pid": proc.pid,
                "method": "WINWORD.EXE"
            }
        else:
            print(f"[API: open-file] WINWORD.EXE not found in registry; invoking os.startfile({norm_path!r})")
            os.startfile(norm_path)
            print(f"[API: open-file] Result: SUCCESS (os.startfile returned without exception)")
            print(f"==================================================\n")
            return {
                "status": "success",
                "message": f"Successfully launched: {os.path.basename(norm_path)}",
                "path": norm_path,
                "exists": True,
                "size_bytes": size,
                "method": "os.startfile"
            }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[API: open-file] EXCEPTION: {e}\n{tb}")
        print(f"==================================================\n")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Launch exception: {str(e)}", "path": norm_path, "exists": True, "traceback": tb}
        )

@app.post("/api/invoices/open-folder")
def api_open_folder(data: Dict[str, str]):
    raw_path = data.get("file_path", "")
    norm_path = os.path.normpath(os.path.abspath(raw_path)) if raw_path else ""
    exists = os.path.exists(norm_path) if norm_path else False
    session_id = get_current_session_id()

    print(f"\n==================================================")
    print(f"[API: open-folder] Request received")
    print(f"[API: open-folder] Server PID       : {os.getpid()}")
    print(f"[API: open-folder] Session ID       : {session_id}")
    print(f"[API: open-folder] Raw path        : {raw_path!r}")
    print(f"[API: open-folder] Normalized path : {norm_path!r}")
    print(f"[API: open-folder] File exists     : {exists}")

    target = norm_path if exists else os.path.normpath(get_setting("output_folder", r"C:\invoices"))
    target_exists = os.path.exists(target)

    if not target_exists:
        err_msg = f"Target location does not exist: {target}"
        print(f"[API: open-folder] ERROR: {err_msg}")
        print(f"==================================================\n")
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": err_msg, "path": target, "exists": False}
        )

    try:
        # User Requirement 5: Python subprocess.Popen(f'explorer /select,"{os.path.normpath(p)}"')
        # and do NOT treat a nonzero exit code as failure.
        cmd = f'explorer /select,"{target}"'
        print(f"[API: open-folder] Invoking: {cmd}")
        proc = subprocess.Popen(cmd)
        folder_name = os.path.basename(os.path.dirname(norm_path))
        threading.Thread(
            target=focus_window,
            args=("CabinetWClass", folder_name),
            daemon=True
        ).start()
        print(f"[API: open-folder] Result: SUCCESS (Spawned explorer process PID {proc.pid})")
        print(f"==================================================\n")
        return {
            "status": "success",
            "message": f"File Explorer opened for: {os.path.basename(target)}",
            "path": target,
            "exists": True,
            "pid": proc.pid
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[API: open-folder] EXCEPTION: {e}\n{tb}")
        print(f"==================================================\n")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Explorer launch exception: {str(e)}", "path": target, "exists": True, "traceback": tb}
        )

from .dialogs import choose_file, choose_folder

@app.get("/api/browse-file")
def api_browse_file():
    """Opens native Windows file picker dialog to select a .docx template."""
    try:
        selected = choose_file(title="Select Word Template (.docx)")
        if selected and os.path.exists(selected):
            norm = os.path.normpath(selected)
            return {"status": "selected", "file_path": norm, "filename": os.path.basename(norm)}
        return {"status": "cancelled", "file_path": None}
    except Exception as e:
        return {"status": "error", "message": str(e), "file_path": None}

@app.get("/api/browse-folder")
def api_browse_folder():
    """Opens native Windows folder picker dialog to select an output folder."""
    try:
        current = get_setting("output_folder", "C:\\invoices")
        selected = choose_folder(title="Select Output Folder for Generated Invoices", initial_dir=current)
        if selected and os.path.exists(selected):
            norm = os.path.normpath(selected)
            set_setting("output_folder", norm)
            return {"status": "selected", "folder_path": norm}
        return {"status": "cancelled", "folder_path": None}
    except Exception as e:
        return {"status": "error", "message": str(e), "folder_path": None}

from fastapi import UploadFile, File
import shutil

@app.post("/api/upload-template")
async def api_upload_template(file: UploadFile = File(...)):
    """Uploads a .docx template from browser file picker."""
    try:
        custom_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "template", "custom")
        os.makedirs(custom_dir, exist_ok=True)
        dest_path = os.path.join(custom_dir, file.filename)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        norm = os.path.normpath(dest_path)
        return {"status": "success", "file_path": norm, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount built React frontend SPA
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

