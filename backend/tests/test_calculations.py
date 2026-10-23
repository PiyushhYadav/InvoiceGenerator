import pytest
from decimal import Decimal
from backend.app.calculations import (
    to_decimal,
    round_currency,
    calculate_line_item,
    calculate_invoice_totals,
    format_currency_inr,
    ZERO
)

def test_to_decimal():
    assert to_decimal(10) == Decimal("10")
    assert to_decimal("25.50") == Decimal("25.50")
    assert to_decimal("1,500.75") == Decimal("1500.75")
    assert to_decimal(None) == ZERO
    assert to_decimal("") == ZERO
    assert to_decimal("invalid") == ZERO

def test_calculate_line_item():
    assert calculate_line_item(10, 20) == Decimal("200.00")
    assert calculate_line_item("161.56", "210") == Decimal("33927.60")
    assert calculate_line_item(2.5, 3.75) == Decimal("9.38")
    assert calculate_line_item(0, 100) == ZERO

def test_calculate_invoice_totals_intra_state():
    items = [
        {"sn": "1.", "description": "Item 1", "qty": "161.56", "rate": "210"},
        {"sn": "2.", "description": "Item 2", "qty": "1", "rate": "14500"},
        {"sn": "3.", "description": "Item 3", "qty": "1", "rate": "2500"},
        {"sn": "4.", "description": "Item 4", "qty": "1", "rate": "3500"},
        {"sn": "5.", "description": "Item 5", "qty": "1", "rate": "1200"},
    ]
    totals = calculate_invoice_totals(
        items=items,
        tax_type="Intra-State (CGST + SGST)",
        cgst_rate=9.0,
        sgst_rate=9.0,
        auto_round=True
    )
    
    # Subtotal: 33927.60 + 14500 + 2500 + 3500 + 1200 = 55,627.60
    assert totals["subtotal"] == Decimal("55627.60")
    assert not totals["is_igst"]
    # CGST 9%: 55627.60 * 0.09 = 5006.484 -> 5006.48
    assert totals["cgst_amount"] == Decimal("5006.48")
    # SGST 9%: 5006.48
    assert totals["sgst_amount"] == Decimal("5006.48")
    assert totals["igst_amount"] == ZERO
    # Raw total: 55627.60 + 5006.48 + 5006.48 = 65640.56
    assert totals["raw_total"] == Decimal("65640.56")
    # Final amount rounded: 65641.00
    assert totals["final_amount"] == Decimal("65641.00")
    # Rounding adjustment: +0.44
    assert totals["round_off"] == Decimal("0.44")

def test_calculate_invoice_totals_inter_state():
    items = [
        {"sn": "1.", "description": "Interstate Part", "qty": "100", "rate": "500"}
    ]
    totals = calculate_invoice_totals(
        items=items,
        tax_type="Inter-State (IGST)",
        igst_rate=18.0,
        auto_round=True
    )
    assert totals["subtotal"] == Decimal("50000.00")
    assert totals["is_igst"]
    assert totals["cgst_amount"] == ZERO
    assert totals["sgst_amount"] == ZERO
    assert totals["igst_amount"] == Decimal("9000.00")
    assert totals["final_amount"] == Decimal("59000.00")
    assert totals["round_off"] == Decimal("0.00")

def test_format_currency_inr():
    assert format_currency_inr(55627.60) == "55,627.60"
    assert format_currency_inr("65641") == "65,641.00"
    assert format_currency_inr(0.44) == "0.44"
    assert format_currency_inr(12345678.90) == "1,23,45,678.90"
    assert format_currency_inr(100) == "100.00"
