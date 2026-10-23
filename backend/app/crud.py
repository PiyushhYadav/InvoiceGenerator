import os
import re
import json
import sqlite3
from typing import Dict, Any, List, Optional
from .database import get_db_connection

def get_setting(key: str, default: str = "") -> str:
    conn = get_db_connection()
    row = conn.execute("SELECT value FROM settings WHERE key = ?;", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    conn = get_db_connection()
    with conn:
        conn.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;", (key, value))
    conn.close()

def get_all_settings() -> Dict[str, str]:
    conn = get_db_connection()
    rows = conn.execute("SELECT key, value FROM settings;").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

def has_invoice_serial(invoice_no: str, fy: str = "2026-27", prefix: str = "PW") -> bool:
    if not invoice_no or not invoice_no.strip():
        return False
    s = invoice_no.strip()
    if s in (prefix, f"{prefix}/", f"{prefix}/{fy}", f"{prefix}/{fy}/", f"{prefix}-{fy}", f"{prefix}-{fy}-"):
        return False
    match = re.search(r'[/\\-](\d+)$', s)
    return bool(match)

def peek_next_serial(fy: str = None, prefix: str = None):
    """
    Computes the next serial number without writing to the database or settings.
    Formula: max(setting next_sequence (default 19), highest serial in the invoices table, setting serial_counter_<fy>) + 1
    Uses {seq:03d} padding.
    """
    if not fy:
        fy = get_setting("financial_year", "2026-27")
    if not prefix:
        prefix = get_setting("invoice_prefix", "PW")

    # 1. setting next_sequence (default 19)
    try:
        cfg_next_seq = int(get_setting("next_sequence", "19"))
    except (ValueError, TypeError):
        cfg_next_seq = 19

    # 2. highest serial in the invoices table with status='generated'
    conn = get_db_connection()
    pattern = f"{prefix}/{fy}/%"
    rows = conn.execute("SELECT invoice_no FROM invoices WHERE invoice_no LIKE ? AND status = 'generated';", (pattern,)).fetchall()
    conn.close()

    table_max = 0
    for r in rows:
        m = re.search(r'/(\d+)$', str(r["invoice_no"] or "").strip())
        if m:
            val = int(m.group(1))
            if val > table_max:
                table_max = val

    # 3. setting serial_counter_<fy>
    counter_key = f"serial_counter_{fy}"
    counter_val = get_setting(counter_key, "")
    try:
        saved_counter = int(counter_val) if str(counter_val).strip().isdigit() else 0
    except (ValueError, TypeError):
        saved_counter = 0

    next_seq = max(cfg_next_seq, max(table_max, saved_counter) + 1)
    inv_no = f"{prefix}/{fy}/{next_seq:03d}"
    clean_no = re.sub(r'[^A-Za-z0-9/\-]', '', inv_no)[:16]
    return next_seq, clean_no

def commit_serial(seq: int, fy: str = None):
    """
    Sets the persistent counter to max(current, seq).
    """
    if not fy:
        fy = get_setting("financial_year", "2026-27")
    counter_key = f"serial_counter_{fy}"
    counter_val = get_setting(counter_key, "")
    try:
        curr = int(counter_val) if str(counter_val).strip().isdigit() else 0
    except (ValueError, TypeError):
        curr = 0
    new_val = max(curr, seq)
    set_setting(counter_key, str(new_val))

def get_next_invoice_number(fy: str = None, prefix: str = None) -> str:
    """
    Preview next invoice number for display. Calls the SAME helper as assignment.
    """
    _, clean_no = peek_next_serial(fy=fy, prefix=prefix)
    return clean_no

def save_or_update_customer(name: str, address: str = "", gstin: str = "", mobile: str = ""):
    if not name or not name.strip():
        return
    conn = get_db_connection()
    with conn:
        existing = conn.execute("SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?));", (name,)).fetchone()
        if existing:
            conn.execute(
                "UPDATE customers SET address = ?, gstin = ?, mobile = ? WHERE id = ?;",
                (address, gstin, mobile, existing["id"])
            )
        else:
            conn.execute(
                "INSERT INTO customers (name, address, gstin, mobile) VALUES (?, ?, ?, ?);",
                (name.strip(), address, gstin, mobile)
            )
    conn.close()

def list_customers() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM customers ORDER BY name ASC;").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_invoice_record(invoice: Dict[str, Any], status: str = "draft", output_path: str = None) -> int:
    """Saves or updates an invoice along with its items in a single transaction."""
    conn = get_db_connection()
    with conn:
        inv_no = str(invoice.get("invoice_no", "")).strip()
        existing = conn.execute("SELECT id FROM invoices WHERE invoice_no = ?;", (inv_no,)).fetchone()
        
        calc = invoice.get("calculated", {})
        subtotal = float(calc.get("subtotal", invoice.get("subtotal", 0.0)))
        final_amount = float(calc.get("final_amount", invoice.get("final_amount", 0.0)))
        cgst_amount = float(calc.get("cgst_amount", invoice.get("cgst_amount", 0.0)))
        sgst_amount = float(calc.get("sgst_amount", invoice.get("sgst_amount", 0.0)))
        igst_amount = float(calc.get("igst_amount", invoice.get("igst_amount", 0.0)))
        round_off = float(calc.get("round_off", invoice.get("round_off", 0.0)))
        words = str(invoice.get("amount_in_words", ""))
        
        params = (
            inv_no,
            str(invoice.get("invoice_date", "")),
            str(invoice.get("place_of_supply", "Haryana (06)")),
            str(invoice.get("station", "Gurugram")),
            str(invoice.get("vehicle_no", "")),
            str(invoice.get("eway_bill_no", "")),
            str(invoice.get("customer_name", "")),
            str(invoice.get("customer_address", "")),
            str(invoice.get("customer_gstin", "")),
            str(invoice.get("customer_mobile", "")),
            str(invoice.get("shipping_name", "")),
            str(invoice.get("shipping_address", "")),
            str(invoice.get("shipping_gstin", "")),
            str(invoice.get("shipping_mobile", "")),
            str(invoice.get("tax_type", "Intra-State (CGST + SGST)")),
            float(invoice.get("cgst_rate", 9.0)),
            float(invoice.get("sgst_rate", 9.0)),
            float(invoice.get("igst_rate", 18.0)),
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            round_off,
            final_amount,
            words,
            status,
            output_path
        )
        
        if existing:
            inv_id = existing["id"]
            conn.execute("""
            UPDATE invoices SET
                invoice_date = ?, place_of_supply = ?, station = ?, vehicle_no = ?, eway_bill_no = ?,
                customer_name = ?, customer_address = ?, customer_gstin = ?, customer_mobile = ?,
                shipping_name = ?, shipping_address = ?, shipping_gstin = ?, shipping_mobile = ?,
                tax_type = ?, cgst_rate = ?, sgst_rate = ?, igst_rate = ?,
                subtotal = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, round_off = ?,
                final_amount = ?, amount_in_words = ?, status = ?, output_file_path = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
            """, params[1:] + (inv_id,))
            conn.execute("DELETE FROM invoice_items WHERE invoice_id = ?;", (inv_id,))
        else:
            cur = conn.execute("""
            INSERT INTO invoices (
                invoice_no, invoice_date, place_of_supply, station, vehicle_no, eway_bill_no,
                customer_name, customer_address, customer_gstin, customer_mobile,
                shipping_name, shipping_address, shipping_gstin, shipping_mobile,
                tax_type, cgst_rate, sgst_rate, igst_rate,
                subtotal, cgst_amount, sgst_amount, igst_amount, round_off,
                final_amount, amount_in_words, status, output_file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, params)
            inv_id = cur.lastrowid
            
        # Insert items
        def _safe_float(val, default=0.0):
            try:
                return float(val) if val not in (None, "") else default
            except (ValueError, TypeError):
                return default

        items = invoice.get("items", [])
        for idx, it in enumerate(items, start=1):
            conn.execute("""
            INSERT INTO invoice_items (
                invoice_id, sn, description, hsn_sac, qty, unit, rate, amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                inv_id,
                str(it.get("sn", f"{idx}.")),
                str(it.get("description", "")),
                str(it.get("hsn_sac", "")),
                _safe_float(it.get("qty", 0.0)),
                str(it.get("unit", "")),
                _safe_float(it.get("rate", 0.0)),
                _safe_float(it.get("amount", 0.0))
            ))
            
    conn.close()
    
    # Auto-save customer
    save_or_update_customer(
        name=invoice.get("customer_name", ""),
        address=invoice.get("customer_address", ""),
        gstin=invoice.get("customer_gstin", ""),
        mobile=invoice.get("customer_mobile", "")
    )
    
    return inv_id

def get_invoice_by_no(inv_no: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    inv_row = conn.execute("SELECT * FROM invoices WHERE invoice_no = ?;", (inv_no,)).fetchone()
    if not inv_row:
        conn.close()
        return None
    inv_id = inv_row["id"]
    item_rows = conn.execute("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC;", (inv_id,)).fetchall()
    conn.close()
    
    inv_dict = dict(inv_row)
    inv_dict["items"] = [dict(it) for it in item_rows]
    return inv_dict

def list_invoices(limit: int = 50, search: str = "") -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if search:
        term = f"%{search.strip()}%"
        rows = conn.execute("""
        SELECT * FROM invoices
        WHERE invoice_no LIKE ? OR customer_name LIKE ? OR invoice_date LIKE ?
        ORDER BY id DESC LIMIT ?;
        """, (term, term, term, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM invoices ORDER BY id DESC LIMIT ?;", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def export_backup_json() -> str:
    """Exports all local database tables into a clean JSON string for safe backup."""
    conn = get_db_connection()
    invoices = [dict(r) for r in conn.execute("SELECT * FROM invoices;").fetchall()]
    items = [dict(r) for r in conn.execute("SELECT * FROM invoice_items;").fetchall()]
    customers = [dict(r) for r in conn.execute("SELECT * FROM customers;").fetchall()]
    settings = {r["key"]: r["value"] for r in conn.execute("SELECT * FROM settings;").fetchall()}
    conn.close()
    
    backup_data = {
        "version": "1.0",
        "settings": settings,
        "customers": customers,
        "invoices": invoices,
        "invoice_items": items
    }
    return json.dumps(backup_data, indent=2, default=str)
