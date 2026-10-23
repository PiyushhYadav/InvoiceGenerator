# Piyush Welding & Fabrication — Invoice Automation System

An offline-first, professional invoice generation application built specifically for **Piyush Welding & Fabrication**. It generates Microsoft Word (`.docx`) invoices by directly populating the business's official invoice template (`Bill_PW_004.docx`), preserving all fonts, company branding, table borders, and signature stamps with 100% fidelity.

---

## Quick Launch (One-Click)

Simply double-click the Windows batch launcher in the folder:
```bat
start_app.bat
```
or run:
```bat
python run.py
```
This launcher will:
1. Verify Python 3.10+ and the original `template/Bill_PW_004.docx`.
2. Ensure `C:\invoices\` output directory exists.
3. Start the application on `http://127.0.0.1:8000` (serving both the React UI and FastAPI backend).
4. Automatically open **Google Chrome** directly to the application.
5. Keep the status window open with live diagnostics, allowing you to stop the app anytime with `Ctrl+C`.

---

## Features

- **Exact Template Preservation:** Uses `Bill_PW_004.docx` as a read-only source. Generates standalone editable `.docx` files without disturbing document styling, logos, or margins.
- **100% Offline Operation:** No internet connection, CDNs, or external APIs are required after setup.
- **Decimal-Safe Calculations:** Python `Decimal` arithmetic ensures paisa precision.
- **Indian Currency Amount in Words:** Converts totals into standard Indian numbering format (*Crores, Lakhs, Thousands, Rupees, and Paise*).
- **Tax Flexibility:** Supports both **Intra-State (CGST + SGST)** and **Inter-State (IGST)** modes.
- **Deterministic Mistake Checker:** Offline validator checks required fields, GSTIN formats, positive rates/quantities, and provides pagination estimates.
- **Local Persistence:** SQLite database (`data/invoices.db`) stored with Write-Ahead Logging (WAL) for safe draft saving, invoice history, customer autocomplete, and JSON backup.
- **Sequential Numbering:** Automatically checks previous records and increments to the next invoice number (e.g., `PW/2026-27/019`).

---

## Project Structure

```
InvoiceGenerator/
├── start_app.bat                     # Windows One-Click Launcher
├── template/
│   └── Bill_PW_004.docx             # Original Word Invoice Template (READ-ONLY)
├── data/
│   └── invoices.db                  # Local SQLite Database (WAL mode)
├── output/
│   └── invoices/                    # Default output folder for generated invoices
├── backend/
│   ├── app/
│   │   ├── calculations.py          # Decimal math & currency formatting
│   │   ├── words.py                 # Indian currency number-to-words
│   │   ├── mistake_checker.py       # Rule-based validation & pagination alerts
│   │   ├── docx_engine.py           # In-place template populator
│   │   ├── database.py              # SQLite connection & schema
│   │   ├── crud.py                  # Database operations & sequential numbering
│   │   └── main.py                  # FastAPI REST API endpoints
│   ├── tests/                       # Automated pytest test suites
│   └── requirements.txt             # Python dependencies
└── frontend/                        # React + Vite application (Offline-ready)
    ├── src/
    │   ├── App.jsx                  # Main interactive UI
    │   └── index.css                # Custom scrollbars and styling
    ├── tailwind.config.js
    └── package.json
```

---

## Manual Startup (Alternative)

If you prefer to run services manually in separate terminals:

### 1. Start Backend:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 2. Start Frontend:
```powershell
cd frontend
npm run dev
```
Then open `http://127.0.0.1:5173` in your browser.

### 3. Run Automated Tests:
```powershell
python -m pytest backend/tests/ -v
```

---

## Output Location

Generated invoice documents are saved by default to:
```
C:\invoices\
```
(You can change the output folder anytime in the application's **Settings** panel).
