import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
import docx

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_api_next_invoice_number():
    res = client.get("/api/invoices/next-number")
    assert res.status_code == 200
    assert "next_invoice_no" in res.json()
    assert res.json()["next_invoice_no"].startswith("PW/2026-27/")

def test_api_calculate():
    payload = {
        "invoice_no": "PW/2026-27/019",
        "invoice_date": "20-10-2026",
        "customer_name": "API Test Client",
        "items": [
            {"sn": "1.", "description": "Steel Gate", "qty": 10, "rate": 500}
        ]
    }
    res = client.post("/api/invoices/calculate", json=payload)
    assert res.status_code == 200
    data = res.json()["calculated"]
    assert data["subtotal"] == 5000.0
    assert data["cgst_amount"] == 450.0
    assert data["sgst_amount"] == 450.0
    assert data["final_amount"] == 5900.0
    assert "Rupees Five Thousand Nine Hundred Only" in data["amount_in_words"]

def test_api_save_draft_and_list():
    payload = {
        "invoice_no": "PW/2026-27/DRAFT_001",
        "invoice_date": "20-10-2026",
        "customer_name": "Draft Client Co",
        "items": [
            {"sn": "1.", "description": "Draft Item", "qty": 2, "rate": 1000}
        ]
    }
    save_res = client.post("/api/invoices/save-draft", json=payload)
    assert save_res.status_code == 200
    assert save_res.json()["status"] == "saved"

    list_res = client.get("/api/invoices")
    assert list_res.status_code == 200
    invoices = list_res.json()
    nos = [inv["invoice_no"] for inv in invoices]
    assert "PW/2026-27/DRAFT_001" in nos

def test_api_generate_docx_end_to_end():
    payload = {
        "invoice_no": "PW/2026-27/019",
        "invoice_date": "20-10-2026",
        "place_of_supply": "Haryana (06)",
        "station": "Gurugram",
        "customer_name": "DRASO SUPPORT",
        "customer_address": "GLOBAL BUSINESS PARK, GURUGRAM",
        "customer_gstin": "06AINPJ5872G1ZY",
        "customer_mobile": "9891283321",
        "tax_type": "Intra-State (CGST + SGST)",
        "cgst_rate": 9.0,
        "sgst_rate": 9.0,
        "items": [
            {"sn": "1.", "description": "Shutter ( 11.75' X 13.75' )", "hsn_sac": "7308", "qty": 161.56, "unit": "SQ. FT.", "rate": 210.00},
            {"sn": "2.", "description": "Gear Box", "hsn_sac": "84834000", "qty": 1, "unit": "PC", "rate": 14500.00},
            {"sn": "3.", "description": "MS Pipe ( 4\" x 4\" )", "hsn_sac": "7306", "qty": 1, "unit": "PC", "rate": 2500.00},
            {"sn": "4.", "description": "Cartage", "hsn_sac": "9965", "qty": 1, "unit": "JOB", "rate": 3500.00},
            {"sn": "5.", "description": "Lock with fitting", "hsn_sac": "8301", "qty": 1, "unit": "PC", "rate": 1200.00}
        ]
    }
    
    gen_res = client.post("/api/invoices/generate-docx", json=payload)
    assert gen_res.status_code == 200
    data = gen_res.json()
    assert data["status"] == "success"
    file_path = data["file_path"]
    assert os.path.exists(file_path)
    
    # Verify the generated file with python-docx
    doc = docx.Document(file_path)
    table = doc.tables[0]
    assert len(table.rows) == 11
    assert "TAX INVOICE" in table.rows[0].cells[0].text
    assert "PIYUSH WELDING AND FABRICATION" in table.rows[1].cells[0].text
    assert "PW/2026-27/019" in table.rows[3].cells[0].text
    assert "55,627.60" in table.rows[7].cells[7].text
    assert "65,641.00" in table.rows[8].cells[7].text
    assert "Rupees Sixty Five Thousand Six Hundred Forty One Only" in table.rows[8].cells[0].text

def test_api_backup():
    res = client.get("/api/backup")
    assert res.status_code == 200
    assert "invoices" in res.text
