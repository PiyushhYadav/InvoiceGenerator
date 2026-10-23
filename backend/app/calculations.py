from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Tuple

TWO_PLACES = Decimal("0.01")
ZERO = Decimal("0.00")

def to_decimal(val: Any) -> Decimal:
    """Safely converts float, int, or string to Decimal with exact precision."""
    if val is None or val == "":
        return ZERO
    if isinstance(val, (int, float, str)):
        cleaned = str(val).replace(",", "").strip()
        try:
            return Decimal(cleaned)
        except Exception:
            return ZERO
    if isinstance(val, Decimal):
        return val
    return ZERO

def round_currency(val: Decimal) -> Decimal:
    """Rounds a Decimal value to 2 decimal places using ROUND_HALF_UP."""
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

def calculate_line_item(qty: Any, rate: Any) -> Decimal:
    """Calculates amount for a single item: qty * rate, rounded to 2 decimal places."""
    d_qty = to_decimal(qty)
    d_rate = to_decimal(rate)
    amount = d_qty * d_rate
    return round_currency(amount)

def calculate_invoice_totals(
    items: List[Dict[str, Any]],
    tax_type: str = "Intra-State (CGST + SGST)",
    cgst_rate: Any = 9.0,
    sgst_rate: Any = 9.0,
    igst_rate: Any = 18.0,
    auto_round: bool = True
) -> Dict[str, Any]:
    """
    Computes subtotal, taxes, rounding adjustment, and final payable amount.
    All arithmetic is performed using Python Decimal for complete financial safety.
    """
    # 1. Line items calculation
    calculated_items = []
    subtotal = ZERO
    for idx, item in enumerate(items, start=1):
        raw_qty = item.get("qty") if item.get("qty") is not None else item.get("quantity", 0)
        qty = to_decimal(raw_qty)
        rate = to_decimal(item.get("rate", 0))
        amount = round_currency(qty * rate)
        subtotal += amount
        
        calculated_items.append({
            "sn": str(item.get("sn", f"{idx}.")),
            "description": str(item.get("description", "")).strip(),
            "hsn_sac": str(item.get("hsn_sac", "")).strip(),
            "qty": qty,
            "unit": str(item.get("unit", "")).strip(),
            "rate": rate,
            "amount": amount
        })

    subtotal = round_currency(subtotal)
    
    # 2. Tax calculations
    is_igst = "IGST" in tax_type or "Inter-State" in tax_type
    
    d_cgst_rate = to_decimal(cgst_rate)
    d_sgst_rate = to_decimal(sgst_rate)
    d_igst_rate = to_decimal(igst_rate)
    
    if is_igst:
        cgst_amount = ZERO
        sgst_amount = ZERO
        igst_amount = round_currency(subtotal * (d_igst_rate / Decimal("100")))
        total_tax = igst_amount
    else:
        cgst_amount = round_currency(subtotal * (d_cgst_rate / Decimal("100")))
        sgst_amount = round_currency(subtotal * (d_sgst_rate / Decimal("100")))
        igst_amount = ZERO
        total_tax = cgst_amount + sgst_amount
        
    raw_total = subtotal + total_tax
    
    # 3. Rounding adjustment
    if auto_round:
        final_amount = raw_total.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        round_off = final_amount - raw_total
    else:
        final_amount = round_currency(raw_total)
        round_off = ZERO
        
    round_off = round_currency(round_off)
    final_amount = round_currency(final_amount)
    
    return {
        "items": calculated_items,
        "subtotal": subtotal,
        "is_igst": is_igst,
        "cgst_rate": d_cgst_rate,
        "sgst_rate": d_sgst_rate,
        "igst_rate": d_igst_rate,
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "igst_amount": igst_amount,
        "total_tax": total_tax,
        "raw_total": raw_total,
        "round_off": round_off,
        "final_amount": final_amount,
    }

def format_currency_inr(val: Any) -> str:
    """Formats decimal value into Indian Rupee string formatting (e.g., 55,627.60)."""
    d = round_currency(to_decimal(val))
    sign = "-" if d < ZERO else ""
    d_abs = abs(d)
    parts = f"{d_abs:.2f}".split(".")
    integer_part = parts[0]
    decimal_part = parts[1]
    
    if len(integer_part) <= 3:
        formatted_int = integer_part
    else:
        last3 = integer_part[-3:]
        remaining = integer_part[:-3]
        groups = []
        while len(remaining) > 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            groups.insert(0, remaining)
        formatted_int = ",".join(groups) + "," + last3
        
    return f"{sign}{formatted_int}.{decimal_part}"
