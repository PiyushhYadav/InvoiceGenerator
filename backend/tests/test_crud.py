import pytest
from backend.app.crud import (
    get_setting,
    set_setting,
    get_next_invoice_number,
    save_invoice_record,
    get_invoice_by_no,
    list_invoices,
    save_or_update_customer,
    list_customers
)

def test_settings_crud():
    set_setting("test_key", "test_value_123")
    assert get_setting("test_key") == "test_value_123"

def test_invoice_number_sequence():
    next_no = get_next_invoice_number()
    assert next_no.startswith("PW/2026-27/")
    seq_str = next_no.split("/")[-1]
    assert len(seq_str) >= 3
    assert int(seq_str) >= 19

def test_invoice_save_and_retrieve():
    test_inv = {
        "invoice_no": "PW/2026-27/999",
        "invoice_date": "20-10-2026",
        "place_of_supply": "Haryana (06)",
        "station": "Gurugram",
        "customer_name": "CRUD Test Corp",
        "customer_address": "Sector 32, Gurugram",
        "customer_gstin": "06AAAAA0000A1Z5",
        "customer_mobile": "9999999999",
        "tax_type": "Intra-State (CGST + SGST)",
        "cgst_rate": 9.0,
        "sgst_rate": 9.0,
        "items": [
            {"sn": "1.", "description": "Steel Bracket", "hsn_sac": "7308", "qty": 10, "unit": "PC", "rate": 500, "amount": 5000}
        ],
        "calculated": {
            "subtotal": 5000.0,
            "cgst_amount": 450.0,
            "sgst_amount": 450.0,
            "final_amount": 5900.0
        },
        "amount_in_words": "Rupees Five Thousand Nine Hundred Only"
    }
    
    inv_id = save_invoice_record(test_inv, status="draft")
    assert inv_id > 0
    
    retrieved = get_invoice_by_no("PW/2026-27/999")
    assert retrieved is not None
    assert retrieved["customer_name"] == "CRUD Test Corp"
    assert len(retrieved["items"]) == 1
    assert retrieved["items"][0]["description"] == "Steel Bracket"

def test_customer_save_and_list():
    save_or_update_customer("Alpha Fabrications", "Plot 1, Gurgaon", "06BBBBB0000B1Z6", "8888888888")
    customers = list_customers()
    names = [c["name"] for c in customers]
    assert "Alpha Fabrications" in names
