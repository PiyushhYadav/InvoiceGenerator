import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Clock, Search, Save, Folder, Settings, Sun, Moon,
  HelpCircle, X, ChevronRight, Building, Truck,
  Percent, FileSpreadsheet, Plus, Trash2, Calculator, Check,
  RotateCcw, AlertTriangle, ExternalLink, Calendar, Copy,
  MapPin, ChevronDown, Building2
} from 'lucide-react';

const API_BASE = window.location.port === "5173" ? "http://127.0.0.1:8000/api" : "/api";

const AVAILABLE_UNITS = [
  "SQ. FT.", "PC", "KG", "JOB", "SET", "MTR", "NOS", "BOX", "BAG", "TON", "LTR", "INCH", "RFT"
];

function UnitCell({ value, onChange, id, onKeyDown }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, dropUp: false });
  const ref = useRef(null);

  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropUp = spaceBelow < 220;
      setCoords({
        top: dropUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 140),
        dropUp
      });
    }
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('.unit-dropdown-portal')) {
        setOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      if (open) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const handleOpen = () => {
    updatePosition();
    setOpen(true);
  };

  return (
    <div className="relative w-full" ref={ref}>
      <div className="flex items-center relative">
        <input
          id={id}
          type="text"
          className="w-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-[#383842] rounded px-2 py-1.5 text-center uppercase pr-5 focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#25252d]"
          value={value}
          onFocus={handleOpen}
          onClick={handleOpen}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          data-form-type="other"
          data-lpignore="true"
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            handleOpen();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setOpen(false);
              if (onKeyDown) onKeyDown(e);
            } else if (e.key === 'Escape') {
              setOpen(false);
            } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
              setOpen(false);
              if (onKeyDown) onKeyDown(e);
            }
          }}
          placeholder="UNIT"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            if (!open) handleOpen();
            else setOpen(false);
          }}
          className="absolute right-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-0.5"
          title="Click to view all units"
        >
          <ChevronRight className={`w-3 h-3 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed',
            top: coords.dropUp ? 'auto' : `${coords.top}px`,
            bottom: coords.dropUp ? `${window.innerHeight - coords.top}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 9999,
          }}
          className="unit-dropdown-portal max-h-56 overflow-y-auto bg-white dark:bg-[#24242c] rounded-lg border border-gray-200 dark:border-[#383842] shadow-2xl py-1 text-xs"
        >
          <div className="px-2.5 py-1 text-[10px] text-gray-400 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-[#33333b] uppercase tracking-wider">
            Select Unit
          </div>
          {AVAILABLE_UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                onChange(u);
                setOpen(false);
                const unitInput = document.getElementById(id);
                if (unitInput) unitInput.focus();
              }}
              className={`w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors flex items-center justify-between ${
                value === u ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold" : "text-gray-700 dark:text-gray-200"
              }`}
            >
              <span>{u}</span>
              {value === u && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Auto-resizing textarea that expands height dynamically without manual expand button or scrollbars
const AutoResizeTextarea = React.forwardRef(function AutoResizeTextarea(
  { value, onChange, className = "", placeholder, minHeight = 36, ...props },
  ref
) {
  const innerRef = useRef(null);
  const targetRef = ref || innerRef;

  const adjustHeight = () => {
    const el = targetRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.max(el.scrollHeight, minHeight);
    el.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value, minHeight]);

  useEffect(() => {
    window.addEventListener("resize", adjustHeight);
    return () => window.removeEventListener("resize", adjustHeight);
  }, [minHeight]);

  return (
    <textarea
      ref={targetRef}
      value={value}
      onChange={(e) => {
        if (onChange) onChange(e);
        adjustHeight();
      }}
      className={`${className} resize-none overflow-hidden`}
      placeholder={placeholder}
      rows={1}
      style={{ minHeight: `${minHeight}px`, ...props.style }}
      {...props}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-form-type="other"
      data-lpignore="true"
    />
  );
});

export default function App() {
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'recent', 'drafts', 'settings'
  const [modalType, setModalType] = useState(null); // 'recent', 'drafts', 'settings', 'search', 'success'
  const [successInfo, setSuccessInfo] = useState(null);
  const [isOpeningWord, setIsOpeningWord] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Dark Mode Theme State
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("piyush_invoice_theme") === "dark";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("piyush_invoice_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("piyush_invoice_theme", "light");
      }
    } catch (e) {
      // fallback
    }
  }, [darkMode]);

  // Template & Storage State
  const [selectedTemplateName, setSelectedTemplateName] = useState("Bill_PW_004.docx");
  const [customTemplatePath, setCustomTemplatePath] = useState("");
  const fileInputRef = useRef(null);
  const datePickerRef = useRef(null);

  const formatDateToDisplay = (isoStr) => {
    if (!isoStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
      const [y, m, d] = isoStr.split('-');
      return `${d}-${m}-${y}`;
    }
    return isoStr;
  };

  const formatDisplayToIso = (displayStr) => {
    if (!displayStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(displayStr)) return displayStr;
    const parts = displayStr.split(/[-/]/);
    if (parts.length === 3 && parts[2].length === 4) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return "";
  };

  // App Settings
  const [appSettings, setAppSettings] = useState({
    invoice_prefix: "PW",
    financial_year: "2026-27",
    next_sequence: "19",
    output_folder: "C:\\invoices",
    default_cgst_rate: "9.00",
    default_sgst_rate: "9.00",
    default_igst_rate: "18.00",
    default_place_of_supply: "Haryana (06)",
    default_station: "Gurugram"
  });

  // Invoice Form State
  const [invoiceNo, setInvoiceNo] = useState("PW/2026-27/");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("Haryana (06)");
  const [station, setStation] = useState("Gurugram");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");

  // Customer Details (Billed To)
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");

  // Delivery Details (Shipped To)
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingGstin, setShippingGstin] = useState("");
  const [shippingMobile, setShippingMobile] = useState("");

  // Tax Settings
  const [taxType, setTaxType] = useState("Intra-State (CGST + SGST)");
  const [cgstRate, setCgstRate] = useState(9.0);
  const [sgstRate, setSgstRate] = useState(9.0);
  const [igstRate, setIgstRate] = useState(18.0);

  // Line Items
  const [items, setItems] = useState([
    { sn: "1.", description: "", hsn_sac: "", qty: "", unit: "", rate: "", amount: 0.00 }
  ]);

  // Calculated Summary
  const [summary, setSummary] = useState({
    subtotal: 0.00,
    subtotal_formatted: "0.00",
    is_igst: false,
    cgst_amount: 0.00,
    cgst_amount_formatted: "0.00",
    sgst_amount: 0.00,
    sgst_amount_formatted: "0.00",
    igst_amount: 0.00,
    igst_amount_formatted: "0.00",
    round_off: 0.00,
    round_off_formatted: "0.00",
    final_amount: 0.00,
    final_amount_formatted: "0.00",
    amount_in_words: "Rupees Zero Only."
  });

  const [savedInvoices, setSavedInvoices] = useState([]);
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBrowsingFolder, setIsBrowsingFolder] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [copiedBilled, setCopiedBilled] = useState(false);

  // Load initial settings and recent invoices
  useEffect(() => {
    fetchSettings();
    // Keep PW/2026-27/ pre-filled on opening
    fetchRecentInvoices();
    fetchCustomers();
  }, []);

  // Live calculation whenever form inputs change
  useEffect(() => {
    recalculateTotals();
  }, [items, taxType, cgstRate, sgstRate, igstRate, customerName, customerAddress, invoiceNo, invoiceDate]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        setAppSettings(data);
      }
    } catch (e) {
      console.warn("Backend not reached yet, using defaults.");
    }
  };

  const fetchNextNumber = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices/next-number`);
      if (res.ok) {
        const data = await res.json();
        if (data.next_invoice_no) {
          setInvoiceNo(data.next_invoice_no);
        }
      }
    } catch (e) {
      console.warn("Could not fetch next invoice number.");
    }
  };

  const fetchRecentInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/invoices?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSavedInvoices(data);
      }
    } catch (e) {
      console.warn("Could not fetch recent invoices.");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers`);
      if (res.ok) {
        const data = await res.json();
        setSavedCustomers(data);
      }
    } catch (e) {
      console.warn("Could not fetch customers.");
    }
  };

  const recalculateTotals = async () => {
    const payload = {
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      place_of_supply: placeOfSupply,
      station: station,
      vehicle_no: vehicleNo,
      eway_bill_no: ewayBillNo,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      customer_mobile: customerMobile,
      shipping_name: shippingName,
      shipping_address: shippingAddress,
      shipping_gstin: shippingGstin,
      shipping_mobile: shippingMobile,
      tax_type: taxType,
      cgst_rate: parseFloat(cgstRate) || 0,
      sgst_rate: parseFloat(sgstRate) || 0,
      igst_rate: parseFloat(igstRate) || 0,
      items: items
    };

    try {
      const res = await fetch(`${API_BASE}/invoices/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const valData = await res.json();
        if (valData.calculated) {
          setSummary({
            subtotal: valData.calculated.subtotal,
            subtotal_formatted: valData.calculated.subtotal_formatted,
            is_igst: valData.calculated.is_igst,
            cgst_amount: valData.calculated.cgst_amount,
            cgst_amount_formatted: valData.calculated.cgst_amount_formatted || valData.calculated.cgst_formatted,
            sgst_amount: valData.calculated.sgst_amount,
            sgst_amount_formatted: valData.calculated.sgst_amount_formatted || valData.calculated.sgst_formatted,
            igst_amount: valData.calculated.igst_amount,
            igst_amount_formatted: valData.calculated.igst_amount_formatted || valData.calculated.igst_formatted,
            round_off: valData.calculated.round_off,
            round_off_formatted: Math.abs(valData.calculated.round_off).toFixed(2),
            final_amount: valData.calculated.final_amount,
            final_amount_formatted: valData.calculated.final_amount_formatted,
            amount_in_words: valData.calculated.amount_in_words
          });
        }
      }
    } catch (e) {
      // Fallback local computation if backend is launching
      let sub = 0;
      items.forEach(it => { sub += (Number(it.qty) || 0) * (Number(it.rate) || 0); });
      const isIgst = taxType.includes("IGST") || taxType.includes("Inter");
      const cgstAmt = isIgst ? 0 : sub * (Number(cgstRate) / 100);
      const sgstAmt = isIgst ? 0 : sub * (Number(sgstRate) / 100);
      const igstAmt = isIgst ? sub * (Number(igstRate) / 100) : 0;
      const totalRaw = sub + cgstAmt + sgstAmt + igstAmt;
      const finalAmt = Math.round(totalRaw);
      const roundOff = finalAmt - totalRaw;

      setSummary(prev => ({
        ...prev,
        subtotal: sub,
        subtotal_formatted: sub.toFixed(2),
        is_igst: isIgst,
        cgst_amount: cgstAmt,
        cgst_amount_formatted: cgstAmt.toFixed(2),
        sgst_amount: sgstAmt,
        sgst_amount_formatted: sgstAmt.toFixed(2),
        igst_amount: igstAmt,
        igst_amount_formatted: igstAmt.toFixed(2),
        round_off: roundOff,
        round_off_formatted: Math.abs(roundOff).toFixed(2),
        final_amount: finalAmt,
        final_amount_formatted: finalAmt.toFixed(2)
      }));
    }
  };

  // Line Items Handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'qty' || field === 'rate') {
      const q = parseFloat(field === 'qty' ? value : updated[index].qty) || 0;
      const r = parseFloat(field === 'rate' ? value : updated[index].rate) || 0;
      updated[index].amount = Math.round(q * r * 100) / 100;
    }
    setItems(updated);
  };

  const ITEM_FIELDS = ['desc', 'hsn', 'qty', 'unit', 'rate'];

  const handleAddItem = (focusField = 'desc') => {
    const nextIdx = items.length;
    setItems(prev => [
      ...prev,
      { sn: `${prev.length + 1}.`, description: "", hsn_sac: "", qty: "", unit: "", rate: "", amount: 0.00 }
    ]);
    setTimeout(() => {
      const el = document.getElementById(`item-${nextIdx}-${focusField}`);
      if (el) {
        el.focus();
        el.select?.();
      }
    }, 60);
  };

  const handleItemKeyDown = (e, rowIdx, field) => {
    const target = e.target;

    // 1. Enter key: Excel-style down to next row in the SAME column
    if (e.key === 'Enter') {
      // Shift+Enter in description inserts a newline within the same block
      if (e.shiftKey) {
        if (field === 'desc') {
          e.preventDefault();
          const start = target.selectionStart;
          const end = target.selectionEnd;
          const val = target.value || "";
          const nextVal = val.substring(0, start) + "\n" + val.substring(end);
          handleItemChange(rowIdx, 'description', nextVal);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = start + 1;
            target.scrollTop = target.scrollHeight;
          }, 0);
        } else {
          e.preventDefault();
        }
        return;
      }

      e.preventDefault();

      if (field === 'desc') {
        // Only description can add a new line item on the last row
        if (rowIdx === items.length - 1) {
          handleAddItem('desc');
        } else {
          // Move down to the next row in description
          const next = document.getElementById(`item-${rowIdx + 1}-desc`);
          if (next) {
            next.focus();
            next.select?.();
          }
        }
      } else {
        // Any column except description (hsn, qty, unit, rate): NEVER create a new row!
        if (rowIdx < items.length - 1) {
          // Move down to next row in the same column
          const next = document.getElementById(`item-${rowIdx + 1}-${field}`);
          if (next) {
            next.focus();
            next.select?.();
          }
        } else {
          // On the last row: Shift cursor to next column at the top row (row 0)
          const colIdx = ITEM_FIELDS.indexOf(field);
          const nextCol = ITEM_FIELDS[(colIdx + 1) % ITEM_FIELDS.length];
          const topEl = document.getElementById(`item-0-${nextCol}`);
          if (topEl) {
            topEl.focus();
            topEl.select?.();
          }
        }
      }
      return;
    }

    // 2. Left Arrow: Switch to previous column when cursor is at the beginning
    if (e.key === 'ArrowLeft') {
      const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      if (isAtStart || field === 'unit') {
        const colIdx = ITEM_FIELDS.indexOf(field);
        if (colIdx > 0) {
          e.preventDefault();
          const prevField = ITEM_FIELDS[colIdx - 1];
          const prevEl = document.getElementById(`item-${rowIdx}-${prevField}`);
          if (prevEl) {
            prevEl.focus();
            if (prevEl.setSelectionRange) {
              const len = prevEl.value?.length || 0;
              prevEl.setSelectionRange(len, len);
            } else {
              prevEl.select?.();
            }
          }
        }
      }
      return;
    }

    // 3. Right Arrow: Switch to next column when cursor is at the end
    if (e.key === 'ArrowRight') {
      const valLen = target.value?.length || 0;
      const isAtEnd = (target.selectionStart === valLen && target.selectionEnd === valLen) ||
                      (valLen > 0 && target.selectionStart === 0 && target.selectionEnd === valLen);
      if (isAtEnd || field === 'unit') {
        const colIdx = ITEM_FIELDS.indexOf(field);
        if (colIdx < ITEM_FIELDS.length - 1) {
          e.preventDefault();
          const nextField = ITEM_FIELDS[colIdx + 1];
          // If at the last row of description, shift to the top row (row 0) of the next column
          const targetRow = (field === 'desc' && rowIdx === items.length - 1) ? 0 : rowIdx;
          const nextEl = document.getElementById(`item-${targetRow}-${nextField}`);
          if (nextEl) {
            nextEl.focus();
            if (targetRow === 0 && field === 'desc') {
              nextEl.select?.();
            } else if (nextEl.setSelectionRange) {
              nextEl.setSelectionRange(0, 0);
            } else {
              nextEl.select?.();
            }
          }
        }
      }
      return;
    }

    // 4. Up Arrow: Move to previous row in same column
    if (e.key === 'ArrowUp') {
      let isFirstLine = true;
      if (field === 'desc') {
        const textBeforeCaret = (target.value || "").substring(0, target.selectionStart);
        isFirstLine = !textBeforeCaret.includes('\n');
      }
      if (isFirstLine) {
        if (rowIdx > 0) {
          e.preventDefault();
          const prev = document.getElementById(`item-${rowIdx - 1}-${field}`);
          if (prev) {
            prev.focus();
            prev.select?.();
          }
        } else if (rowIdx === 0 && field === 'desc') {
          e.preventDefault();
          const billedMobile = document.getElementById('billed-mobile');
          if (billedMobile) {
            billedMobile.focus();
            billedMobile.select?.();
          }
        }
      }
      return;
    }

    // 5. Down Arrow: Move to next row in same column
    if (e.key === 'ArrowDown') {
      let isLastLine = true;
      if (field === 'desc') {
        const textAfterCaret = (target.value || "").substring(target.selectionEnd);
        isLastLine = !textAfterCaret.includes('\n');
      }
      if (isLastLine && rowIdx < items.length - 1) {
        e.preventDefault();
        const next = document.getElementById(`item-${rowIdx + 1}-${field}`);
        if (next) {
          next.focus();
          next.select?.();
        }
      }
      return;
    }
  };

  const PARTY_FIELDS = ['name', 'address', 'gstin', 'mobile'];

  const handlePartyKeyDown = (e, section, field) => {
    const target = e.target;
    const isBilled = section === 'billed';
    const isShipped = section === 'shipped';

    // 1. Enter Key
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        if (field === 'address') {
          e.preventDefault();
          const start = target.selectionStart;
          const end = target.selectionEnd;
          const val = target.value || "";
          const nextVal = val.substring(0, start) + "\n" + val.substring(end);
          if (isBilled) setCustomerAddress(nextVal);
          else setShippingAddress(nextVal);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = start + 1;
            target.scrollTop = target.scrollHeight;
          }, 0);
        } else {
          e.preventDefault();
        }
        return;
      }

      e.preventDefault();
      const idx = PARTY_FIELDS.indexOf(field);
      if (idx < PARTY_FIELDS.length - 1) {
        const nextField = PARTY_FIELDS[idx + 1];
        const nextEl = document.getElementById(`${section}-${nextField}`);
        if (nextEl) {
          nextEl.focus();
          nextEl.select?.();
        }
      } else {
        // Last field of section ('mobile')
        if (isBilled) {
          const nextEl = document.getElementById('shipped-name');
          if (nextEl) {
            nextEl.focus();
            nextEl.select?.();
          }
        } else {
          // From shipped-mobile, move down to first item description
          const item0 = document.getElementById('item-0-desc');
          if (item0) {
            item0.focus();
            item0.select?.();
          }
        }
      }
      return;
    }

    // 2. Left Arrow: If on Shipped To and cursor is at start, switch horizontally to Billed To
    if (e.key === 'ArrowLeft') {
      const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      if (isAtStart && isShipped) {
        e.preventDefault();
        const prevEl = document.getElementById(`billed-${field}`);
        if (prevEl) {
          prevEl.focus();
          if (prevEl.setSelectionRange) {
            const len = prevEl.value?.length || 0;
            prevEl.setSelectionRange(len, len);
          } else {
            prevEl.select?.();
          }
        }
      }
      return;
    }

    // 3. Right Arrow: If on Billed To and cursor is at end, switch horizontally to Shipped To
    if (e.key === 'ArrowRight') {
      const valLen = target.value?.length || 0;
      const isAtEnd = target.selectionStart === valLen && target.selectionEnd === valLen;
      if (isAtEnd && isBilled) {
        e.preventDefault();
        const nextEl = document.getElementById(`shipped-${field}`);
        if (nextEl) {
          nextEl.focus();
          if (nextEl.setSelectionRange) {
            nextEl.setSelectionRange(0, 0);
          } else {
            nextEl.select?.();
          }
        }
      }
      return;
    }

    // 4. Up Arrow: Move to previous field in the same section
    if (e.key === 'ArrowUp') {
      let isFirstLine = true;
      if (field === 'address') {
        const textBeforeCaret = (target.value || "").substring(0, target.selectionStart);
        isFirstLine = !textBeforeCaret.includes('\n');
      }
      if (isFirstLine) {
        const idx = PARTY_FIELDS.indexOf(field);
        if (idx > 0) {
          e.preventDefault();
          const prevField = PARTY_FIELDS[idx - 1];
          const prevEl = document.getElementById(`${section}-${prevField}`);
          if (prevEl) {
            prevEl.focus();
            prevEl.select?.();
          }
        }
      }
      return;
    }

    // 5. Down Arrow: Move to next field in the same section
    if (e.key === 'ArrowDown') {
      let isLastLine = true;
      if (field === 'address') {
        const textAfterCaret = (target.value || "").substring(target.selectionEnd);
        isLastLine = !textAfterCaret.includes('\n');
      }
      if (isLastLine) {
        const idx = PARTY_FIELDS.indexOf(field);
        if (idx < PARTY_FIELDS.length - 1) {
          e.preventDefault();
          const nextField = PARTY_FIELDS[idx + 1];
          const nextEl = document.getElementById(`${section}-${nextField}`);
          if (nextEl) {
            nextEl.focus();
            nextEl.select?.();
          }
        } else if (isBilled) {
          e.preventDefault();
          const item0 = document.getElementById('item-0-desc');
          if (item0) {
            item0.focus();
            item0.select?.();
          }
        } else if (isShipped) {
          e.preventDefault();
          const item0 = document.getElementById('item-0-desc');
          if (item0) {
            item0.focus();
            item0.select?.();
          }
        }
      }
      return;
    }
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert("At least one line item is required.");
      return;
    }
    const filtered = items.filter((_, i) => i !== index).map((it, idx) => ({
      ...it,
      sn: `${idx + 1}.`
    }));
    setItems(filtered);
  };

  const handleClearAllItems = () => {
    if (window.confirm("Are you sure you want to clear all line items?")) {
      setItems([
        { sn: "1.", description: "", hsn_sac: "", qty: "", unit: "", rate: "", amount: 0.00 }
      ]);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    const payload = {
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      place_of_supply: placeOfSupply,
      station: station,
      vehicle_no: vehicleNo,
      eway_bill_no: ewayBillNo,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      customer_mobile: customerMobile,
      shipping_name: shippingName,
      shipping_address: shippingAddress,
      shipping_gstin: shippingGstin,
      shipping_mobile: shippingMobile,
      tax_type: taxType,
      cgst_rate: parseFloat(cgstRate) || 0,
      sgst_rate: parseFloat(sgstRate) || 0,
      igst_rate: parseFloat(igstRate) || 0,
      items: items
    };

    try {
      const res = await fetch(`${API_BASE}/invoices/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatusMessage("Draft saved successfully!");
        fetchRecentInvoices();
        setTimeout(() => setStatusMessage(""), 3000);
      }
    } catch (e) {
      alert("Failed to save draft. Please ensure the backend is running.");
    }
  };

  // Template & Storage Handlers
  const handleBrowseTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE}/browse-file`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "selected" && data.file_path) {
          setCustomTemplatePath(data.file_path);
          setSelectedTemplateName(data.filename);
          return;
        } else if (data.status === "cancelled") {
          return;
        }
      }
    } catch (err) {
      console.warn("Native file browse fallback to browser input:", err);
    }
    // Fallback to browser file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleTemplateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/upload-template`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setCustomTemplatePath(data.file_path);
        setSelectedTemplateName(data.filename);
      }
    } catch (err) {
      alert("Failed to upload template: " + err.message);
    }
  };

  const handleResetTemplate = (e) => {
    e.stopPropagation();
    setCustomTemplatePath("");
    setSelectedTemplateName("Bill_PW_004.docx");
  };

  const handleBrowseFolder = async () => {
    setIsBrowsingFolder(true);
    try {
      const res = await fetch(`${API_BASE}/browse-folder`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "selected" && data.folder_path) {
          setAppSettings(prev => ({ ...prev, output_folder: data.folder_path }));
          setStatusMessage(`Output folder set to: ${data.folder_path}`);
          setTimeout(() => setStatusMessage(""), 4000);
          return;
        } else if (data.status === "cancelled") {
          return;
        }
      }
      // If native dialog couldn't open, provide direct manual entry option
      const manual = window.prompt("Enter or paste your output folder path:", appSettings.output_folder || "C:\\invoices");
      if (manual && manual.trim()) {
        const trimmed = manual.trim();
        setAppSettings(prev => ({ ...prev, output_folder: trimmed }));
        await fetch(`${API_BASE}/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...appSettings, output_folder: trimmed })
        });
        setStatusMessage(`Output folder set to: ${trimmed}`);
        setTimeout(() => setStatusMessage(""), 4000);
      }
    } catch (err) {
      console.error("Browse folder error:", err);
      const manual = window.prompt("Enter or paste your output folder path:", appSettings.output_folder || "C:\\invoices");
      if (manual && manual.trim()) {
        const trimmed = manual.trim();
        setAppSettings(prev => ({ ...prev, output_folder: trimmed }));
        setStatusMessage(`Output folder set to: ${trimmed}`);
        setTimeout(() => setStatusMessage(""), 4000);
      }
    } finally {
      setIsBrowsingFolder(false);
    }
  };

  // Generate DOCX
  const handleGenerateDocx = async () => {
    setIsGenerating(true);
    const payload = {
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      place_of_supply: placeOfSupply,
      station: station,
      vehicle_no: vehicleNo,
      eway_bill_no: ewayBillNo,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      customer_mobile: customerMobile,
      shipping_name: shippingName,
      shipping_address: shippingAddress,
      shipping_gstin: shippingGstin,
      shipping_mobile: shippingMobile,
      tax_type: taxType,
      cgst_rate: parseFloat(cgstRate) || 0,
      sgst_rate: parseFloat(sgstRate) || 0,
      igst_rate: parseFloat(igstRate) || 0,
      items: items,
      template_path: customTemplatePath || ""
    };

    try {
      const res = await fetch(`${API_BASE}/invoices/generate-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      let data = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        data = { detail: { errors: [res.statusText || "Server error while creating document"] } };
      }
      if (res.ok) {
        setSuccessInfo(data);
        setModalType('success');
        fetchRecentInvoices();
        if (data.invoice_no) {
          setInvoiceNo(data.invoice_no);
        }
        // Open file directly in Word
        if (data.file_path) {
          handleOpenDocx(data.file_path);
        }
      } else {
        const errorList = data.detail?.errors || (typeof data.detail === "string" ? [data.detail] : ["Unknown error"]);
        alert(`Generation failed:\n• ${errorList.join("\n• ")}`);
      }
    } catch (e) {
      alert(`Network error connecting to backend: ${e.message || e}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Open DOCX file directly in Microsoft Word
  const handleOpenDocx = async (filePath) => {
    console.log("[handleOpenDocx] Starting request for path:", filePath);
    if (!filePath) {
      const msg = "No invoice file path available.";
      console.error("[handleOpenDocx]", msg);
      setActionFeedback({ type: "error", message: msg });
      return;
    }
    setIsOpeningWord(true);
    setActionFeedback({ type: "info", message: "Opening Microsoft Word...", details: `Target: ${filePath}` });
    try {
      const res = await fetch(`${API_BASE}/invoices/open-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath })
      });
      const data = await res.json().catch(() => ({}));
      console.log("[handleOpenDocx] Server response status:", res.status, "data:", data);
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: data.message || "Opened in Word successfully!",
          details: `Path: ${data.path} (Exists: ${String(data.exists)})`
        });
      } else {
        const errMsg = data.message || data.detail || `Server error ${res.status}`;
        console.error("[handleOpenDocx] Error from server:", errMsg);
        setActionFeedback({
          type: "error",
          message: `Failed to open Word: ${errMsg}`,
          details: `Path: ${data.path || filePath} (Exists: ${String(data.exists)})`
        });
      }
    } catch (e) {
      console.error("[handleOpenDocx] Exception caught:", e);
      setActionFeedback({
        type: "error",
        message: `Network error: ${e.message}`,
        details: `Path: ${filePath}`
      });
    } finally {
      setTimeout(() => setIsOpeningWord(false), 800);
    }
  };

  // Open directory in Windows File Explorer
  const handleOpenFolder = async (filePath) => {
    console.log("[handleOpenFolder] Starting request for path:", filePath);
    setActionFeedback({ type: "info", message: "Opening File Explorer...", details: `Target: ${filePath}` });
    try {
      const res = await fetch(`${API_BASE}/invoices/open-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath })
      });
      const data = await res.json().catch(() => ({}));
      console.log("[handleOpenFolder] Server response status:", res.status, "data:", data);
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: data.message || "File Explorer opened!",
          details: `Path: ${data.path} (Exists: ${String(data.exists)})`
        });
      } else {
        const errMsg = data.message || data.detail || `Server error ${res.status}`;
        console.error("[handleOpenFolder] Error from server:", errMsg);
        setActionFeedback({
          type: "error",
          message: `Failed to open folder: ${errMsg}`,
          details: `Path: ${data.path || filePath} (Exists: ${String(data.exists)})`
        });
      }
    } catch (e) {
      console.error("[handleOpenFolder] Exception caught:", e);
      setActionFeedback({
        type: "error",
        message: `Network error: ${e.message}`,
        details: `Path: ${filePath}`
      });
    }
  };

  // Load Invoice from history
  const handleLoadInvoice = (inv) => {
    setInvoiceNo(inv.invoice_no);
    setInvoiceDate(inv.invoice_date);
    setPlaceOfSupply(inv.place_of_supply || "Haryana (06)");
    setStation(inv.station || "Gurugram");
    setVehicleNo(inv.vehicle_no || "");
    setEwayBillNo(inv.eway_bill_no || "");
    setCustomerName(inv.customer_name || "");
    setCustomerAddress(inv.customer_address || "");
    setCustomerGstin(inv.customer_gstin || "");
    setCustomerMobile(inv.customer_mobile || "");
    setShippingName(inv.shipping_name || "");
    setShippingAddress(inv.shipping_address || "");
    setShippingGstin(inv.shipping_gstin || "");
    setShippingMobile(inv.shipping_mobile || "");
    setTaxType(inv.tax_type || "Intra-State (CGST + SGST)");
    setCgstRate(inv.cgst_rate || 9.0);
    setSgstRate(inv.sgst_rate || 9.0);
    setIgstRate(inv.igst_rate || 18.0);
    if (inv.items && inv.items.length > 0) {
      setItems(inv.items);
    }
    setModalType(null);
  };

  const handleResetForm = () => {
    if (window.confirm("Reset all fields to a fresh invoice?")) {
      setInvoiceNo("PW/2026-27/");
      setInvoiceDate("");
      setCustomerName("");
      setCustomerAddress("");
      setCustomerGstin("");
      setCustomerMobile("");
      setShippingName("");
      setShippingAddress("");
      setShippingGstin("");
      setShippingMobile("");
      setItems([
        { sn: "1.", description: "", hsn_sac: "", qty: "", unit: "", rate: "", amount: 0.00 }
      ]);
    }
  };

  return (
    <div className="bg-[#fbfbf9] text-gray-800 antialiased min-h-screen flex flex-col justify-between">
      <div className="flex flex-1 min-h-0">
        
        {/* BEGIN: LeftSidebar */}
        <aside className="w-64 bg-[#f5f4ef] border-r border-[#e8e6df] flex flex-col justify-between p-5 flex-shrink-0">
          <div>
            {/* Logo and Brand */}
            <div className="flex items-center gap-3.5 mb-8">
              <div className="w-8 h-8 flex items-center justify-center text-gray-900">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" x2="12" y1="22.08" y2="12"></line>
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">Piyush Welding<br />&amp; Fabrication</h1>
                <p className="text-[11px] text-gray-500 font-normal mt-0.5">Invoice Generator</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab('new'); setModalType(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'new' && !modalType ? 'bg-[#e3eae1] text-[#1c3a27]' : 'text-gray-700 hover:bg-[#eae8e0]'
                }`}
              >
                <FileText className="w-4 h-4 text-[#2d583b]" />
                <span>New Invoice</span>
              </button>

              <button
                onClick={() => { setModalType('recent'); fetchRecentInvoices(); }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-gray-700 hover:bg-[#eae8e0] text-sm font-medium transition-colors"
              >
                <Clock className="w-4 h-4 text-gray-700" />
                <span>Recent Invoices</span>
              </button>

              <button
                onClick={() => { setModalType('recent'); }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-gray-700 hover:bg-[#eae8e0] text-sm font-medium transition-colors"
              >
                <Search className="w-4 h-4 text-gray-700" />
                <span>Search Invoices</span>
              </button>

              <button
                onClick={handleSaveDraft}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-gray-700 hover:bg-[#eae8e0] text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4 text-gray-700" />
                <span>Save Draft</span>
              </button>

              <button
                onClick={() => { setModalType('recent'); }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-gray-700 hover:bg-[#eae8e0] text-sm font-medium transition-colors"
              >
                <Folder className="w-4 h-4 text-gray-700" />
                <span>Load Draft</span>
              </button>

              <div className="pt-4 space-y-1">
                <button
                  onClick={() => setModalType('settings')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-gray-700 hover:bg-[#eae8e0] text-sm font-medium transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-700" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-gray-700 hover:bg-[#eae8e0] text-sm font-medium transition-colors"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
                  <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                </button>
              </div>
            </nav>
          </div>

          {/* User Profile Footer */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#e8e6df]/70">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider">
              PW
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 leading-tight">Piyush Welding<br />&amp; Fabrication</p>
              <p className="text-[11px] text-gray-400 mt-0.5">v1.0 (Offline)</p>
            </div>
          </div>
        </aside>
        {/* END: LeftSidebar */}

        {/* BEGIN: MainContentArea */}
        <main className="flex-1 flex flex-col bg-[#fbfbf9] overflow-y-auto">
          
          {/* Top Utility Header */}
          <header className="h-14 px-8 flex items-center justify-between border-b border-gray-200/60">
            <div className="relative w-96">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                className="w-full pl-9 pr-4 py-1.5 bg-[#f0eee6] hover:bg-[#eae8e0] focus:bg-white text-xs rounded-md border-0 text-gray-700 placeholder-gray-500 transition-colors"
                placeholder="Search invoices by number, customer or date..."
                type="text"
                onFocus={() => { setModalType('recent'); fetchRecentInvoices(); }}
              />
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-lg hover:text-gray-900 hover:bg-black/5 transition-colors"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                type="button"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setModalType('settings')} className="p-1.5 rounded-lg hover:text-gray-900 hover:bg-black/5 transition-colors" title="Settings" type="button">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={() => alert("Piyush Welding Invoice Generator\n\n100% Offline-First.\nCreates exact DOCX copies of Bill_PW_004.docx template.")} className="p-1.5 rounded-lg hover:text-gray-900 hover:bg-black/5 transition-colors" title="Help" type="button">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Content Container */}
          <div className="p-8 space-y-6 max-w-[1400px]">
            
            {/* Status alert notification banner if saved */}
            {statusMessage && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Header Banner & Action Cards */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#eaf7ee] dark:bg-emerald-950/60 flex items-center justify-center flex-shrink-0 text-[#2e7d32] dark:text-emerald-400 shadow-sm border border-emerald-100/60 dark:border-emerald-900/40">
                  <FileText className="w-7 h-7 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#0f172a] dark:text-gray-100 tracking-tight leading-none">
                    New Invoice
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-normal">
                    Create a professional invoice using your Word template
                  </p>
                </div>
              </div>

              {/* Template & Output Cards */}
              <div className="flex items-center gap-3.5">
                {/* Select Template Card */}
                <div
                  onClick={handleBrowseTemplate}
                  title={customTemplatePath ? `Selected Template: ${customTemplatePath} (Click to change)` : "Default template: template/Bill_PW_004.docx (Click to browse from your computer)"}
                  className="group flex items-center gap-3.5 bg-white dark:bg-[#1e1e24] rounded-2xl border border-gray-200/80 dark:border-[#2e2e36] shadow-sm px-4 py-2.5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-none">Select Template</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight mt-1 truncate max-w-[130px]" title={selectedTemplateName}>
                      {selectedTemplateName}
                    </span>
                  </div>
                  {customTemplatePath && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetTemplate(e);
                      }}
                      title="Reset to Bill_PW_004.docx"
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>

                {/* Output Folder Card */}
                <div
                  onClick={handleBrowseFolder}
                  title={`Current folder: ${appSettings.output_folder || "C:\\invoices"} (Click to browse from your computer)`}
                  className="group flex items-center gap-3 bg-white dark:bg-[#1e1e24] rounded-2xl border border-gray-200/80 dark:border-[#2e2e36] shadow-sm px-4 py-2.5 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all min-w-[250px]"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#e6f7ef] dark:bg-emerald-950/60 text-[#10b981] dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Folder className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-none flex items-center gap-1.5">
                      <span>Output Folder</span>
                      {isBrowsingFolder && <span className="text-emerald-600 text-[10px] animate-pulse font-semibold">(Selecting...)</span>}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight mt-1 truncate max-w-[130px]" title={appSettings.output_folder || "C:\\invoices"}>
                      {appSettings.output_folder || "C:\\invoices"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseFolder();
                    }}
                    disabled={isBrowsingFolder}
                    className="ml-auto px-3.5 py-1.5 bg-[#eaf7ee] hover:bg-[#daf1e2] text-[#2d583b] dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200/80 dark:border-emerald-700/60 transition-colors flex-shrink-0 shadow-none"
                    title="Click to browse folder from your computer"
                  >
                    {isBrowsingFolder ? "Opening..." : "Browse"}
                  </button>
                </div>
              </div>

              {/* Hidden browser file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleTemplateUpload}
                className="hidden"
              />
            </div>

            {/* Invoice Information Card */}
            <div className="bg-white dark:bg-[#1e1e24] rounded-2xl p-6 border border-gray-200/80 dark:border-[#2e2e36] shadow-sm">
              <div className="flex items-center gap-2 text-[#0f172a] dark:text-gray-100 font-bold text-sm mb-4">
                <FileText className="w-4 h-4 text-[#0f172a] dark:text-gray-100 stroke-[2.2]" />
                <span>Invoice Information</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {/* 1. Invoice No. */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    Invoice No. <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="flex items-center bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-xl overflow-hidden focus-within:border-blue-400 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 h-9 transition-all">
                    <div className="w-10 h-full bg-gray-50/80 dark:bg-[#282832] border-r border-gray-200 dark:border-[#383842] flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400 font-bold text-xs select-none">
                      #
                    </div>
                    <input
                      id="meta-invoice-no"
                      type="text"
                      className="w-full h-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent px-3 border-0 focus:outline-none focus:ring-0"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="PW/2026-27/"
                    />
                  </div>
                </div>

                {/* 2. Invoice Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    Invoice Date <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="flex items-center bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-xl overflow-hidden focus-within:border-blue-400 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 h-9 transition-all relative">
                    <div className="w-10 h-full bg-gray-50/80 dark:bg-[#282832] border-r border-gray-200 dark:border-[#383842] flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="meta-invoice-date"
                      type="text"
                      className="w-full h-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent pl-3 pr-8 border-0 focus:outline-none focus:ring-0"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      placeholder="DD-MM-YYYY"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                      <label
                        className="p-1 text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer flex items-center justify-center relative transition-colors"
                        title="Click to open interactive calendar"
                      >
                        <Calendar className="w-3.5 h-3.5 pointer-events-none" />
                        <input
                          ref={datePickerRef}
                          type="date"
                          tabIndex={-1}
                          aria-hidden="true"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          value={formatDisplayToIso(invoiceDate)}
                          onChange={(e) => {
                            if (e.target.value) {
                              setInvoiceDate(formatDateToDisplay(e.target.value));
                            }
                          }}
                          onClick={(e) => {
                            try { e.target.showPicker?.(); } catch (err) {}
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Place of Supply */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    Place of Supply <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="flex items-center bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-xl overflow-hidden focus-within:border-blue-400 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 h-9 transition-all relative">
                    <div className="w-10 h-full bg-gray-50/80 dark:bg-[#282832] border-r border-gray-200 dark:border-[#383842] flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="meta-place-of-supply"
                      list="place-of-supply-list"
                      type="text"
                      className="w-full h-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent pl-3 pr-8 border-0 focus:outline-none focus:ring-0"
                      value={placeOfSupply}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPlaceOfSupply(val);
                        if (val.toLowerCase().includes("haryana") || val.includes("06")) {
                          setTaxType("Intra-State (CGST + SGST)");
                        } else if (val.trim()) {
                          setTaxType("Inter-State (IGST)");
                        }
                      }}
                      placeholder="Haryana (06)"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                    <datalist id="place-of-supply-list">
                      <option value="Haryana (06)" />
                      <option value="Delhi (07)" />
                      <option value="Uttar Pradesh (09)" />
                      <option value="Punjab (03)" />
                      <option value="Rajasthan (08)" />
                      <option value="Maharashtra (27)" />
                      <option value="Gujarat (24)" />
                      <option value="Karnataka (29)" />
                      <option value="Tamil Nadu (33)" />
                      <option value="West Bengal (19)" />
                      <option value="Chandigarh (04)" />
                      <option value="Himachal Pradesh (02)" />
                      <option value="Uttarakhand (05)" />
                      <option value="Bihar (10)" />
                      <option value="Madhya Pradesh (23)" />
                    </datalist>
                  </div>
                </div>

                {/* 4. Station / Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    Station / Location
                  </label>
                  <div className="flex items-center bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-xl overflow-hidden focus-within:border-blue-400 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 h-9 transition-all">
                    <div className="w-10 h-full bg-gray-50/80 dark:bg-[#282832] border-r border-gray-200 dark:border-[#383842] flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id="meta-station"
                      type="text"
                      className="w-full h-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent px-3 border-0 focus:outline-none focus:ring-0"
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      placeholder="Gurugram"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Column Info Cards: Billed To, Shipped To, Tax Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* Billed To (Customer Details) */}
              <div className="lg:col-span-5 bg-white dark:bg-[#1e1e24] rounded-xl p-5 border border-gray-200/90 dark:border-[#2e2e36] shadow-sm flex flex-col">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-sm">
                      <Building className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <span>Billed To (Customer Details)</span>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <AutoResizeTextarea
                        id="billed-name"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026]"
                        minHeight={36}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'billed', 'name')}
                        placeholder="e.g. DRASO SUPPORT"
                        title="Enter: next field, Right Arrow: Shipped To Name"
                      />
                    </div>

                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <AutoResizeTextarea
                        id="billed-address"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026]"
                        minHeight={36}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'billed', 'address')}
                        placeholder="Street, Tower, City, State"
                        title="Enter: next field, Shift+Enter: new line, Right Arrow: Shipped To Address"
                      />
                    </div>

                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">
                        GSTIN <span className="text-red-500">*</span>
                      </label>
                      <AutoResizeTextarea
                        id="billed-gstin"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026] uppercase"
                        minHeight={36}
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'billed', 'gstin')}
                        placeholder="06AINPJ5872G1ZY"
                        title="Enter: next field, Right Arrow: Shipped To GSTIN"
                      />
                    </div>

                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">
                        Mobile No
                      </label>
                      <AutoResizeTextarea
                        id="billed-mobile"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026]"
                        minHeight={36}
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'billed', 'mobile')}
                        placeholder="10-digit mobile"
                        title="Enter: Shipped To Name, Right Arrow: Shipped To Mobile"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipped To (Delivery Details) */}
              <div className="lg:col-span-4 bg-white dark:bg-[#1e1e24] rounded-xl p-5 border border-gray-200/90 dark:border-[#2e2e36] shadow-sm flex flex-col">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-sm">
                      <Truck className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <span>Shipped To (Delivery Details)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShippingName(customerName);
                        setShippingAddress(customerAddress);
                        setShippingGstin(customerGstin);
                        setShippingMobile(customerMobile);
                        setCopiedBilled(true);
                        setTimeout(() => setCopiedBilled(false), 1800);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                        copiedBilled
                          ? "bg-emerald-600 text-white border border-emerald-600 shadow-md"
                          : "bg-emerald-100 hover:bg-emerald-200 text-[#1f432b] dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-600"
                      }`}
                      title="Copy all details from Billed To into Shipped To"
                    >
                      {copiedBilled ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Copy Billed To</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">Name</label>
                      <AutoResizeTextarea
                        id="shipped-name"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026]"
                        minHeight={36}
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'shipped', 'name')}
                        placeholder="Recipient name"
                        title="Enter: next field, Left Arrow: Billed To Name"
                      />
                    </div>

                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">Address</label>
                      <AutoResizeTextarea
                        id="shipped-address"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026]"
                        minHeight={36}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'shipped', 'address')}
                        placeholder="Delivery site address"
                        title="Enter: next field, Shift+Enter: new line, Left Arrow: Billed To Address"
                      />
                    </div>

                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">GSTIN</label>
                      <AutoResizeTextarea
                        id="shipped-gstin"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026] uppercase"
                        minHeight={36}
                        value={shippingGstin}
                        onChange={(e) => setShippingGstin(e.target.value.toUpperCase())}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'shipped', 'gstin')}
                        placeholder="Recipient GSTIN"
                        title="Enter: next field, Left Arrow: Billed To GSTIN"
                      />
                    </div>

                    <div className="grid grid-cols-12 items-start gap-2">
                      <label className="col-span-3 text-xs font-medium text-gray-700 dark:text-gray-300 pt-2">
                        Mobile No
                      </label>
                      <AutoResizeTextarea
                        id="shipped-mobile"
                        className="col-span-9 text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-[#202026] border border-gray-200 dark:border-[#383842] rounded-lg px-3 py-2 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#202026]"
                        minHeight={36}
                        value={shippingMobile}
                        onChange={(e) => setShippingMobile(e.target.value)}
                        onKeyDown={(e) => handlePartyKeyDown(e, 'shipped', 'mobile')}
                        placeholder="10-digit mobile"
                        title="Enter: Item Description, Left Arrow: Billed To Mobile"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Settings */}
              <div className="lg:col-span-3 bg-white dark:bg-[#1e1e24] rounded-xl p-5 border border-gray-200/90 dark:border-[#2e2e36] shadow-sm flex flex-col">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-gray-100 font-semibold text-sm">
                    <Percent className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    <span>Tax Settings</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tax Type
                      </label>
                      <select
                        className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2"
                        value={taxType}
                        onChange={(e) => setTaxType(e.target.value)}
                      >
                        <option>Intra-State (CGST + SGST)</option>
                        <option>Inter-State (IGST)</option>
                      </select>
                    </div>

                    {!taxType.includes("IGST") ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            CGST Rate (%) <span className="text-red-500">*</span>
                          </label>
                          <select
                            className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-2"
                            value={cgstRate}
                            onChange={(e) => setCgstRate(parseFloat(e.target.value))}
                          >
                            <option value={9.0}>9.00</option>
                            <option value={6.0}>6.00</option>
                            <option value={14.0}>14.00</option>
                            <option value={2.5}>2.50</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            SGST Rate (%) <span className="text-red-500">*</span>
                          </label>
                          <select
                            className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-2"
                            value={sgstRate}
                            onChange={(e) => setSgstRate(parseFloat(e.target.value))}
                          >
                            <option value={9.0}>9.00</option>
                            <option value={6.0}>6.00</option>
                            <option value={14.0}>14.00</option>
                            <option value={2.5}>2.50</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          IGST Rate (%) <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2"
                          value={igstRate}
                          onChange={(e) => setIgstRate(parseFloat(e.target.value))}
                        >
                          <option value={18.0}>18.00</option>
                          <option value={12.0}>12.00</option>
                          <option value={28.0}>28.00</option>
                          <option value={5.0}>5.00</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lower Grid: Item Details (Table) + Invoice Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Item Details (Col 9) */}
              <div className="lg:col-span-9 flex flex-col gap-4">
                {/* Item Details Card */}
                <div className="bg-white dark:bg-[#1e1e24] rounded-xl border border-gray-200/90 dark:border-[#2e2e36] shadow-sm flex flex-col transition-all">
                  <div className="p-4 px-5 flex items-center justify-between border-b border-gray-100 dark:border-[#2e2e36]">
                    <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-gray-100">
                      <FileSpreadsheet className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <span>Item Details</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleClearAllItems}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-[#383842] text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        type="button"
                        title="Clear all line items"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    </div>
                  </div>

                  {/* Table: Compact natural height without artificial extra space */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#2e2e36] bg-gray-50/50 dark:bg-[#25252d] text-gray-700 dark:text-gray-300 font-semibold text-[11px]">
                          <th className="py-2.5 px-3 text-center w-16 whitespace-nowrap">S. No.</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Description <span className="text-red-500">*</span></th>
                          <th className="py-2.5 px-2 w-24">HSN/SAC</th>
                          <th className="py-2.5 px-2 w-24">Qty</th>
                          <th className="py-2.5 px-2 w-28">Unit</th>
                          <th className="py-2.5 px-2 w-28">Rate (₹)</th>
                          <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                          <th className="py-2.5 px-3 text-center w-10">—</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2e2e36]">
                        {items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/40 dark:hover:bg-[#25252d]/60">
                            <td className="py-2.5 px-3 text-center font-medium text-gray-500 dark:text-gray-400">{it.sn}</td>
                            <td className="py-2 px-3">
                              <AutoResizeTextarea
                                id={`item-${idx}-desc`}
                                className="w-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-[#383842] rounded px-2 py-1.5 leading-relaxed focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#25252d]"
                                minHeight={36}
                                value={it.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                onKeyDown={(e) => handleItemKeyDown(e, idx, 'desc')}
                                placeholder="Description"
                                title="Enter: next row, Shift+Enter: new line, Left/Right: switch column"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                id={`item-${idx}-hsn`}
                                className="w-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-[#383842] rounded px-2 py-1.5 text-center focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#25252d]"
                                type="text"
                                value={it.hsn_sac}
                                onChange={(e) => handleItemChange(idx, 'hsn_sac', e.target.value)}
                                onKeyDown={(e) => handleItemKeyDown(e, idx, 'hsn')}
                                placeholder="HSN"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                data-form-type="other"
                                data-lpignore="true"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                id={`item-${idx}-qty`}
                                className="w-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-[#383842] rounded px-2 py-1.5 text-center focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#25252d]"
                                type="text"
                                inputMode="decimal"
                                value={it.qty}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                    handleItemChange(idx, 'qty', val);
                                  }
                                }}
                                onKeyDown={(e) => handleItemKeyDown(e, idx, 'qty')}
                                placeholder="0"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                data-form-type="other"
                                data-lpignore="true"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <UnitCell
                                id={`item-${idx}-unit`}
                                value={it.unit}
                                onChange={(val) => handleItemChange(idx, 'unit', val)}
                                onKeyDown={(e) => handleItemKeyDown(e, idx, 'unit')}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                id={`item-${idx}-rate`}
                                className="w-full text-xs font-medium text-gray-800 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-[#383842] rounded px-2 py-1.5 text-right focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#25252d]"
                                type="text"
                                inputMode="decimal"
                                value={it.rate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                    handleItemChange(idx, 'rate', val);
                                  }
                                }}
                                onKeyDown={(e) => handleItemKeyDown(e, idx, 'rate')}
                                placeholder="0.00"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                data-form-type="other"
                                data-lpignore="true"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-800 dark:text-gray-200">
                              {Number(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                                type="button"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Item at Last in Item Details */}
                  <div className="p-3.5 px-5 bg-gray-50/70 dark:bg-[#1e1e24] border-t border-gray-200/80 dark:border-[#2e2e36] flex items-center justify-between">
                    <button
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#2d583b] text-white hover:bg-[#1f432b] shadow-sm hover:shadow transition-all"
                      type="button"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Add Item</span>
                    </button>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {items.length} {items.length === 1 ? "item" : "items"} in invoice
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Invoice Summary Card + Download Word (Col 3) */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="bg-white dark:bg-[#1e1e24] rounded-xl p-5 border border-gray-200/90 dark:border-[#2e2e36] shadow-sm space-y-4 h-fit">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2e2e36] pb-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-gray-100">
                      <Calculator className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <span>Invoice Summary</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-normal">(Auto-calculated)</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">₹ {summary.subtotal_formatted}</span>
                    </div>

                    {!summary.is_igst ? (
                      <>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>CGST @ {cgstRate}%</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">₹ {summary.cgst_amount_formatted}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>SGST @ {sgstRate}%</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">₹ {summary.sgst_amount_formatted}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>IGST @ {igstRate}%</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">₹ {summary.igst_amount_formatted}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Rounding Adjustment</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">₹ {summary.round_off_formatted}</span>
                    </div>
                  </div>

                  {/* Final Amount Banner */}
                  <div className="bg-[#edf5ee] dark:bg-[#153424] rounded-xl p-3.5 flex items-center justify-between border border-[#dce9dd] dark:border-[#225b3a] shadow-sm">
                    <span className="text-xs font-bold text-gray-900 dark:text-emerald-300">Final Amount</span>
                    <span className="text-base font-extrabold text-gray-900 dark:text-emerald-400">₹ {summary.final_amount_formatted}</span>
                  </div>

                  {/* Amount in Words */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-200">
                      <FileText className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      <span>Amount in Words</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-200 bg-gray-50/70 dark:bg-[#25252d] p-2.5 rounded-lg border border-gray-100 dark:border-[#353540] font-medium">
                      {summary.amount_in_words}
                    </p>
                  </div>
                </div>

                {/* Primary Action: Download Word (.docx) directly below Invoice Summary */}
                <button
                  onClick={handleGenerateDocx}
                  disabled={isGenerating}
                  className={`w-full inline-flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1e1e24] rounded-xl border border-gray-200/90 dark:border-[#2e2e36] shadow-sm transition-all text-left ${
                    isGenerating ? 'opacity-60 cursor-wait' : 'hover:border-blue-500 hover:shadow-md cursor-pointer'
                  }`}
                  type="button"
                  title="Download Word invoice (.docx)"
                >
                  <div className="w-8 h-8 bg-[#185abd] text-white font-bold rounded flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                    W
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-100 leading-tight">
                      {isGenerating ? "Generating Invoice..." : "Download Word (.docx)"}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-400 truncate">
                      Official Bill_PW_004 Template
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* BEGIN: BottomActionBar */}
          <footer className="mt-auto px-8 py-4 bg-transparent flex flex-wrap items-center justify-end gap-4">
            {/* Bottom Right: Action Buttons Group */}
            <div className="inline-flex items-center bg-white dark:bg-[#1e1e24] border border-gray-200/90 dark:border-[#2e2e36] rounded-xl shadow-sm p-1 ml-auto">
              <button
                onClick={recalculateTotals}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#25252d] transition-colors"
                type="button"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculate Preview</span>
              </button>

              <div className="w-[1px] h-4 bg-gray-200 dark:bg-[#383842] my-auto"></div>

              <button
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#25252d] transition-colors"
                type="button"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save as Draft</span>
              </button>

              <div className="w-[1px] h-4 bg-gray-200 dark:bg-[#383842] my-auto"></div>

              <button
                onClick={handleResetForm}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#25252d] transition-colors"
                type="button"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>
            </div>
          </footer>
          {/* END: BottomActionBar */}

        </main>
        {/* END: MainContentArea */}

      </div>

      {/* MODAL: Success Generation Popup */}
      {modalType === 'success' && successInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-4 mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">Invoice Generated Successfully!</h3>
            <p className="text-xs text-[#2e7d32] font-medium text-center mt-1 flex items-center justify-center gap-1.5">
              <span>Opening directly in Microsoft Word...</span>
            </p>

            <div className="bg-gray-50 rounded-xl p-3 my-4 border border-gray-200/80 text-xs text-gray-700 space-y-1">
              <div><strong>Invoice No:</strong> {successInfo.invoice_no}</div>
              <div><strong>File Name:</strong> {successInfo.filename}</div>
              <div className="truncate text-[11px] text-gray-500 font-mono"><strong>Path:</strong> {successInfo.file_path}</div>
            </div>

            {/* Warning if existing invoice was updated */}
            {successInfo.warning && (
              <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center gap-2">
                <span className="font-bold text-amber-700">⚠</span>
                <span>{successInfo.warning}</span>
              </div>
            )}

            {/* UI Toast Feedback */}
            {actionFeedback && (
              <div className={`mb-4 p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : actionFeedback.type === 'error'
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}>
                <div className="font-semibold flex items-center gap-1.5">
                  <span>{actionFeedback.type === 'success' ? '✓' : actionFeedback.type === 'error' ? '⚠' : 'ℹ'}</span>
                  <span>{actionFeedback.message}</span>
                </div>
                {actionFeedback.details && (
                  <div className="text-[10px] opacity-80 font-mono break-all pl-4">{actionFeedback.details}</div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModalType(null);
                  setActionFeedback(null);
                }}
                className="py-2.5 px-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleOpenFolder(successInfo.file_path)}
                className="py-2.5 px-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Show in File Explorer"
              >
                <Folder className="w-3.5 h-3.5 text-amber-600" />
                <span>Show in Folder</span>
              </button>
              <button
                onClick={() => handleOpenDocx(successInfo.file_path)}
                disabled={isOpeningWord}
                className="flex-1 py-2.5 px-4 bg-[#185abd] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{isOpeningWord ? "Opening Word..." : "Open in Word"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Recent Invoices & Drafts */}
      {modalType === 'recent' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Saved Invoices &amp; Drafts</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4 space-y-2">
              {savedInvoices.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">No invoices saved yet.</div>
              ) : (
                savedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200/80 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{inv.invoice_no}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          inv.status === 'generated' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{inv.customer_name} • {inv.invoice_date}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-900">₹ {Number(inv.final_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <button
                        onClick={async () => {
                          const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(inv.invoice_no)}`);
                          if (res.ok) {
                            const fullInv = await res.json();
                            handleLoadInvoice(fullInv);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#e3eae1] text-[#1c3a27] text-xs font-semibold rounded-lg hover:bg-[#d5dfd3]"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 text-right">
              <button
                onClick={() => setModalType(null)}
                className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Settings */}
      {modalType === 'settings' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Application Settings</h3>
              <button onClick={() => setModalType(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 my-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Invoice Prefix</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                  type="text"
                  value={appSettings.invoice_prefix || "PW"}
                  onChange={(e) => setAppSettings({ ...appSettings, invoice_prefix: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Financial Year</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                  type="text"
                  value={appSettings.financial_year || "2026-27"}
                  onChange={(e) => setAppSettings({ ...appSettings, financial_year: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Output Folder</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    type="text"
                    value={appSettings.output_folder || "C:\\invoices"}
                    onChange={(e) => setAppSettings({ ...appSettings, output_folder: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFolder}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Folder className="w-3.5 h-3.5 text-gray-600" />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Color Theme</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDarkMode(false)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      !darkMode
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDarkMode(true)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      darkMode
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={async () => {
                  await fetch(`${API_BASE}/settings`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(appSettings)
                  });
                  setModalType(null);
                }}
                className="py-2 px-4 bg-[#2d583b] text-white rounded-lg text-xs font-semibold hover:bg-[#1b3f2b]"
              >
                Save Settings
              </button>
              <button
                onClick={() => setModalType(null)}
                className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
