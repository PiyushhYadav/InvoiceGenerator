import os
import pytest
import docx
from backend.app.docx_engine import generate_invoice_docx, TEMPLATE_PATH

def test_template_exists():
    assert os.path.exists(TEMPLATE_PATH), f"Template must exist at {TEMPLATE_PATH}"

def test_generate_docx_intra_state(tmp_path):
    invoice = {
        "invoice_no": "PW/2026-27/099",
        "invoice_date": "21-10-2026",
        "place_of_supply": "Haryana (06)",
        "station": "Gurugram",
        "vehicle_no": "HR-26-AB-1234",
        "eway_bill_no": "EWB-123456",
        "customer_name": "APEX AUTOMATION WORKS",
        "customer_address": "PLOT 45, SECTOR 18, GURUGRAM",
        "customer_gstin": "06ABCDE1234F1Z5",
        "customer_mobile": "9876543210",
        "tax_type": "Intra-State (CGST + SGST)",
        "cgst_rate": 9.0,
        "sgst_rate": 9.0,
        "items": [
            {"sn": "1.", "description": "Steel Shutter", "hsn_sac": "7308", "qty": 100, "unit": "SQ. FT", "rate": 200},
            {"sn": "2.", "description": "Gear Box Unit", "hsn_sac": "8483", "qty": 1, "unit": "PC", "rate": 15000}
        ]
    }
    
    out_file = generate_invoice_docx(invoice, output_dir=str(tmp_path))
    assert os.path.exists(out_file)
    
    # Inspect generated document
    doc = docx.Document(out_file)
    assert len(doc.tables) == 1
    table = doc.tables[0]
    assert len(table.rows) == 11
    
    # Verify static branding
    assert "TAX INVOICE" in table.rows[0].cells[0].text
    assert "PIYUSH WELDING AND FABRICATION" in table.rows[1].cells[0].text
    assert "06DZRPK9269Q2ZZ" in table.rows[2].cells[0].text
    assert "AXIS BANK" in table.rows[9].cells[0].text
    
    # Verify dynamic fields
    assert "PW/2026-27/099" in table.rows[3].cells[0].text
    assert "21-10-2026" in table.rows[3].cells[0].text
    assert "APEX AUTOMATION WORKS" in table.rows[4].cells[0].text
    assert "06ABCDE1234F1Z5" in table.rows[4].cells[0].text
    
    # Verify tax summary: subtotal = 100*200 + 15000 = 35000
    # CGST 9% = 3150, SGST 9% = 3150, Total = 41300
    assert "35,000.00" in table.rows[7].cells[7].text
    assert "3,150.00" in table.rows[7].cells[7].text
    assert "41,300.00" in table.rows[8].cells[7].text
    assert "Rupees Forty One Thousand Three Hundred Only" in table.rows[8].cells[0].text

def test_generate_docx_inter_state_igst(tmp_path):
    invoice = {
        "invoice_no": "PW/2026-27/100",
        "invoice_date": "21-10-2026",
        "place_of_supply": "Delhi (07)",
        "station": "NEW DELHI",
        "customer_name": "DELHI INDUSTRIAL PVT LTD",
        "customer_address": "OKHLA INDUSTRIAL AREA, NEW DELHI",
        "customer_gstin": "07ABCDE9999F1Z9",
        "tax_type": "Inter-State (IGST)",
        "igst_rate": 18.0,
        "items": [
            {"sn": "1.", "description": "Custom Fabrication", "hsn_sac": "7308", "qty": 10, "unit": "JOB", "rate": 5000}
        ]
    }
    
    out_file = generate_invoice_docx(invoice, output_dir=str(tmp_path))
    assert os.path.exists(out_file)
    
    doc = docx.Document(out_file)
    table = doc.tables[0]
    
    # Row 7 should display IGST and NOT CGST/SGST
    tax_labels = table.rows[7].cells[0].text
    assert "Add    :    IGST" in tax_labels
    assert "CGST" not in tax_labels
    assert "SGST" not in tax_labels
    
    # Subtotal: 50,000.00, IGST: 9,000.00, Grand Total: 59,000.00
    assert "50,000.00" in table.rows[7].cells[7].text
    assert "9,000.00" in table.rows[7].cells[7].text
    assert "59,000.00" in table.rows[8].cells[7].text
    assert "Rupees Fifty Nine Thousand Only" in table.rows[8].cells[0].text

def test_name_and_address_same_line_with_comma(tmp_path):
    invoice = {
        "invoice_no": "PW/2026-27/101",
        "invoice_date": "21-10-2026",
        "customer_name": "Piyush",
        "customer_address": "Ram Vihar",
        "customer_gstin": "06AINPJ5872G1ZY",
        "shipping_name": "Manish",
        "shipping_address": "Surat Nagar",
        "items": [
            {"sn": "1.", "description": "Steel Shutter", "hsn_sac": "7308", "qty": 1, "unit": "PC", "rate": 1000}
        ]
    }
    
    out_file = generate_invoice_docx(invoice, output_dir=str(tmp_path))
    assert os.path.exists(out_file)
    
    doc = docx.Document(out_file)
    table = doc.tables[0]
    
    # Billed To line: paragraph 1 of cell 0
    billed_block = table.rows[4].cells[0].paragraphs[1].text
    assert billed_block == "Piyush, Ram Vihar"
    
    # Shipped To line: paragraph 1 of cell 4
    shipped_block = table.rows[4].cells[4].paragraphs[1].text
    assert shipped_block == "Manish, Surat Nagar"

