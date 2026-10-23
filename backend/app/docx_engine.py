import os
import shutil
import re
import copy
from typing import Dict, Any, List
import docx
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

from .calculations import format_currency_inr, calculate_invoice_totals
from .words import amount_to_words_inr

TEMPLATE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "template", "Bill_PW_004.docx")
)

def set_p_text(p, text: str, align=None, font_size=None, bold=None):
    """
    Safely updates paragraph text without destroying run structures.
    Preserves font styling from run 0 if available.
    """
    if align is not None:
        p.alignment = align
        
    if not p.runs:
        r = p.add_run(text)
        if font_size:
            r.font.size = font_size
        if bold is not None:
            r.font.bold = bold
        return

    # Keep original font settings from run 0
    font_name = p.runs[0].font.name
    existing_sz = p.runs[0].font.size
    existing_bold = p.runs[0].font.bold

    p.runs[0].text = text
    p.runs[0].font.name = font_name
    p.runs[0].font.size = font_size or existing_sz
    p.runs[0].font.bold = bold if bold is not None else existing_bold

    # Clear subsequent runs to avoid leftovers
    for r in p.runs[1:]:
        r.text = ""

def update_labeled_paragraph(p, label: str, value: str):
    """
    Updates a paragraph containing 'Label : Value' while preserving layout.
    """
    if not p.runs:
        p.add_run(f"{label}{value}")
        return
        
    font_name = p.runs[0].font.name
    font_size = p.runs[0].font.size
    
    p.runs[0].text = f"{label}{value}"
    p.runs[0].font.name = font_name
    p.runs[0].font.size = font_size
    
    for r in p.runs[1:]:
        r.text = ""

def make_safe_filename(inv_no: str, customer_name: str = "", is_incomplete: bool = False) -> str:
    """Creates a clean filesystem-safe filename."""
    clean_no = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(inv_no or "")).strip('_')
    if not clean_no:
        clean_no = "Invoice"
    raw_cust = (customer_name or "").strip()
    clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_cust).strip('_')
    if clean_name and clean_name.lower() != "none":
        return f"{clean_no}_{clean_name[:25]}.docx"
    return f"{clean_no}.docx"

def generate_invoice_docx(
    invoice_data: Dict[str, Any],
    output_dir: str = None,
    template_path: str = None,
    is_incomplete: bool = False
) -> str:
    """
    Populates the existing Bill_PW_004.docx template with exact visual preservation.
    Returns the absolute path to the generated DOCX file.
    """
    tmpl = template_path or invoice_data.get("template_path") or TEMPLATE_PATH
    if not os.path.exists(tmpl):
        raise FileNotFoundError(f"Template not found at: {tmpl}")

    # Determine output path
    if not output_dir:
        output_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "output", "invoices")
        )
    os.makedirs(output_dir, exist_ok=True)

    inv_no = str(invoice_data.get("invoice_no", "INV_DRAFT") or "INV_DRAFT").strip()
    cust_name = (invoice_data.get("customer_name") or "").strip()
    if cust_name.lower() in ("customer", "none"):
        cust_name = ""
    filename = make_safe_filename(inv_no, cust_name, is_incomplete=is_incomplete)
    output_path = os.path.join(output_dir, filename)

    # 1. Copy original template to output path (template is strictly read-only)
    # If the file is currently open in Word, safely append a counter suffix instead of failing
    base_name, ext = os.path.splitext(output_path)
    counter = 1
    target_path = output_path
    while True:
        try:
            shutil.copyfile(tmpl, target_path)
            output_path = target_path
            break
        except PermissionError:
            target_path = f"{base_name} ({counter}){ext}"
            counter += 1

    # 2. Open copy in python-docx
    doc = docx.Document(output_path)
    table = doc.tables[0]

    # 3. Calculate financial totals
    calc = calculate_invoice_totals(
        items=invoice_data.get("items", []),
        tax_type=invoice_data.get("tax_type", "Intra-State (CGST + SGST)"),
        cgst_rate=invoice_data.get("cgst_rate", 9.0),
        sgst_rate=invoice_data.get("sgst_rate", 9.0),
        igst_rate=invoice_data.get("igst_rate", 18.0),
        auto_round=invoice_data.get("auto_round", True)
    )

    # 4. Row 3: Invoice Metadata
    row3 = table.rows[3]
    cell_r3_left = row3.cells[0]
    update_labeled_paragraph(
        cell_r3_left.paragraphs[0],
        "Invoice No.                 : ",
        inv_no
    )
    update_labeled_paragraph(
        cell_r3_left.paragraphs[1],
        "Dated                            : ",
        str(invoice_data.get("invoice_date", "")).strip()
    )
    update_labeled_paragraph(
        cell_r3_left.paragraphs[2],
        "Place of Supply        : ",
        str(invoice_data.get("place_of_supply", "Haryana (06)")).strip()
    )

    cell_r3_right = row3.cells[4]
    update_labeled_paragraph(
        cell_r3_right.paragraphs[0],
        "Vehicle No.          :  ",
        str(invoice_data.get("vehicle_no", "")).strip()
    )
    update_labeled_paragraph(
        cell_r3_right.paragraphs[1],
        "Station                   : ",
        str(invoice_data.get("station", "GURGAON")).strip()
    )
    update_labeled_paragraph(
        cell_r3_right.paragraphs[2],
        "E-Way Bill No.     : ",
        str(invoice_data.get("eway_bill_no", "")).strip()
    )

    # 5. Row 4: Customer Details (Billed To & Shipped To)
    row4 = table.rows[4]
    billed_cell = row4.cells[0]
    cust_addr = str(invoice_data.get("customer_address", "")).strip()
    clean_cust_name = cust_name.rstrip(' ,')
    clean_addr = re.sub(r'[\r\n]+', ', ', cust_addr).strip(' ,')
    if clean_cust_name and clean_addr:
        full_cust_block = f"{clean_cust_name}, {clean_addr}"
    else:
        full_cust_block = clean_cust_name or clean_addr
    set_p_text(billed_cell.paragraphs[1], full_cust_block)

    shipped_cell = row4.cells[4]
    ship_name = str(invoice_data.get("shipping_name", "")).strip() or cust_name
    ship_addr = str(invoice_data.get("shipping_address", "")).strip() or cust_addr
    clean_ship_name = ship_name.rstrip(' ,')
    clean_ship_addr = re.sub(r'[\r\n]+', ', ', ship_addr).strip(' ,')
    if clean_ship_name and clean_ship_addr:
        full_ship_block = f"{clean_ship_name}, {clean_ship_addr}"
    else:
        full_ship_block = clean_ship_name or clean_ship_addr
    set_p_text(shipped_cell.paragraphs[1], full_ship_block)

    # Pad spacer paragraphs so Party Mobile No & GSTIN/UIN stay pinned at the bottom
    # matching Billed to and Shipped to horizontally
    while len(shipped_cell.paragraphs) < len(billed_cell.paragraphs):
        target_p = shipped_cell.paragraphs[-2]._p
        spacer_p = copy.deepcopy(shipped_cell.paragraphs[2]._p)
        target_p.addprevious(spacer_p)

    while len(billed_cell.paragraphs) < len(shipped_cell.paragraphs):
        target_p = billed_cell.paragraphs[-2]._p
        spacer_p = copy.deepcopy(billed_cell.paragraphs[2]._p)
        target_p.addprevious(spacer_p)

    update_labeled_paragraph(
        billed_cell.paragraphs[-2],
        "Party Mobile No      :  ",
        str(invoice_data.get("customer_mobile", "")).strip()
    )
    update_labeled_paragraph(
        billed_cell.paragraphs[-1],
        "GSTIN / UIN              : ",
        str(invoice_data.get("customer_gstin", "")).strip().upper()
    )

    update_labeled_paragraph(
        shipped_cell.paragraphs[-2],
        "Party Mobile No      :  ",
        str(invoice_data.get("shipping_mobile", "")).strip() or str(invoice_data.get("customer_mobile", "")).strip()
    )
    update_labeled_paragraph(
        shipped_cell.paragraphs[-1],
        "GSTIN / UIN              :  ",
        str(invoice_data.get("shipping_gstin", "")).strip().upper() or str(invoice_data.get("customer_gstin", "")).strip().upper()
    )

    # 6. Row 6: Item Lines
    row6 = table.rows[6]
    cols = []
    for c in row6.cells:
        if c._tc not in [sc._tc for sc in cols]:
            cols.append(c)

    calc_items = calc["items"]
    num_items = len(calc_items)
    
    # Matching template: 1 to 5 items use blank line separation (exactly 2*N - 1 paragraphs)
    use_blank_lines = (num_items <= 5)
    total_p = max(1, (num_items * 2 - 1) if use_blank_lines else num_items)

    for col in cols:
        while len(col.paragraphs) < total_p:
            col.add_paragraph()

    for item_idx, it in enumerate(calc_items):
        p_idx = item_idx * 2 if use_blank_lines else item_idx
        p_blank_idx = (p_idx + 1) if (use_blank_lines and item_idx < num_items - 1) else None

        for col_idx, col in enumerate(cols):
            p_item = col.paragraphs[p_idx]
            if col_idx == 0:
                set_p_text(p_item, it["sn"], align=WD_ALIGN_PARAGRAPH.CENTER)
            elif col_idx == 1:
                set_p_text(p_item, it["description"], align=WD_ALIGN_PARAGRAPH.LEFT)
            elif col_idx == 2:
                set_p_text(p_item, it["hsn_sac"], align=WD_ALIGN_PARAGRAPH.CENTER)
            elif col_idx == 3:
                set_p_text(p_item, str(it["qty"]), align=WD_ALIGN_PARAGRAPH.CENTER)
            elif col_idx == 4:
                set_p_text(p_item, it["unit"], align=WD_ALIGN_PARAGRAPH.CENTER)
            elif col_idx == 5:
                set_p_text(p_item, format_currency_inr(it["rate"]), align=WD_ALIGN_PARAGRAPH.CENTER)
            elif col_idx == 6:
                set_p_text(p_item, format_currency_inr(it["amount"]), align=WD_ALIGN_PARAGRAPH.RIGHT)

            if p_blank_idx is not None and p_blank_idx < len(col.paragraphs):
                set_p_text(col.paragraphs[p_blank_idx], "")

    # Clear trailing template paragraphs if any
    for col in cols:
        for p_extra in col.paragraphs[total_p:]:
            set_p_text(p_extra, "")

    # 7. Row 7: Taxes & Subtotal
    row7 = table.rows[7]
    label_cell = row7.cells[0]
    rate_cell = row7.cells[6]
    amt_cell = row7.cells[7]

    is_igst = calc["is_igst"]
    subtotal_str = format_currency_inr(calc["subtotal"])
    round_off_val = calc["round_off"]
    round_off_str = f"{abs(round_off_val):.2f}"
    round_off_label = "Less   :    Rounded Off (+)" if round_off_val >= 0 else "Add    :    Rounded Off (-)"

    if is_igst:
        set_p_text(label_cell.paragraphs[1], "                          Add    :    IGST")
        set_p_text(label_cell.paragraphs[2], "")
        set_p_text(label_cell.paragraphs[3], f"                          {round_off_label.strip()}")

        set_p_text(row7.cells[5].paragraphs[1], "@", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_p_text(row7.cells[5].paragraphs[2], "")

        set_p_text(rate_cell.paragraphs[1], f" {calc['igst_rate']:.2f}%")
        set_p_text(rate_cell.paragraphs[2], "")

        set_p_text(amt_cell.paragraphs[0], subtotal_str, align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_p_text(amt_cell.paragraphs[1], format_currency_inr(calc["igst_amount"]), align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_p_text(amt_cell.paragraphs[2], "", align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_p_text(amt_cell.paragraphs[3], round_off_str, align=WD_ALIGN_PARAGRAPH.RIGHT)
    else:
        set_p_text(label_cell.paragraphs[1], "                          Add    :    CGST")
        set_p_text(label_cell.paragraphs[2], "                          Add    :    SGST")
        set_p_text(label_cell.paragraphs[3], f"                          {round_off_label.strip()}")

        set_p_text(row7.cells[5].paragraphs[1], "@", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_p_text(row7.cells[5].paragraphs[2], "@", align=WD_ALIGN_PARAGRAPH.CENTER)

        set_p_text(rate_cell.paragraphs[1], f" {calc['cgst_rate']:.2f}%")
        set_p_text(rate_cell.paragraphs[2], f" {calc['sgst_rate']:.2f}%")

        set_p_text(amt_cell.paragraphs[0], subtotal_str, align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_p_text(amt_cell.paragraphs[1], format_currency_inr(calc["cgst_amount"]), align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_p_text(amt_cell.paragraphs[2], format_currency_inr(calc["sgst_amount"]), align=WD_ALIGN_PARAGRAPH.RIGHT)
        set_p_text(amt_cell.paragraphs[3], round_off_str, align=WD_ALIGN_PARAGRAPH.RIGHT)

    # 8. Row 8: Amount in Words & Final Amount
    row8 = table.rows[8]
    words_str = amount_to_words_inr(calc["final_amount"])
    set_p_text(
        row8.cells[0].paragraphs[0],
        words_str,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        font_size=Pt(10)
    )

    final_str = format_currency_inr(calc["final_amount"])
    set_p_text(
        row8.cells[7].paragraphs[0],
        final_str,
        align=WD_ALIGN_PARAGRAPH.RIGHT,
        font_size=Pt(11)
    )

    # 9. Save final document (safely handling files currently opened in Word)
    try:
        doc.save(output_path)
    except PermissionError:
        base_name, ext = os.path.splitext(output_path)
        counter = 1
        while True:
            alt_path = f"{base_name} ({counter}){ext}"
            try:
                doc.save(alt_path)
                output_path = alt_path
                break
            except PermissionError:
                counter += 1

    # Verify file is fully written and closed on disk
    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise IOError(f"Generated DOCX file is missing or 0 bytes at: {output_path}")

    return output_path
