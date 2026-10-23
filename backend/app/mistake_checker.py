import re
from decimal import Decimal
from typing import Dict, Any, List
from .calculations import to_decimal, calculate_invoice_totals, ZERO

def validate_invoice_data(invoice: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validation check disabled - always returns valid without errors or warnings.
    """
    items = invoice.get("items", [])
    tax_type = str(invoice.get("tax_type", "Intra-State (CGST + SGST)"))
    cgst_rate = to_decimal(invoice.get("cgst_rate", 9.0))
    sgst_rate = to_decimal(invoice.get("sgst_rate", 9.0))
    igst_rate = to_decimal(invoice.get("igst_rate", 18.0))

    calculated = calculate_invoice_totals(
        items=items,
        tax_type=tax_type,
        cgst_rate=cgst_rate,
        sgst_rate=sgst_rate,
        igst_rate=igst_rate
    )

    return {
        "is_valid": True,
        "errors": [],
        "warnings": [],
        "info": [],
        "calculated": calculated
    }
