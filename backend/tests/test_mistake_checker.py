import pytest
from backend.app.mistake_checker import validate_invoice_data

def test_validate_invoice_disabled():
    invoice = {
        "invoice_no": "",
        "invoice_date": "",
        "place_of_supply": "",
        "customer_name": "",
        "customer_address": "",
        "items": []
    }
    result = validate_invoice_data(invoice)
    assert result["is_valid"] is True
    assert len(result["errors"]) == 0
    assert len(result["warnings"]) == 0
