import os
import sqlite3
from typing import Generator

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "invoices.db")

def get_db_connection() -> sqlite3.Connection:
    """Creates a thread-safe connection to the local SQLite database with WAL mode."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high concurrency & safe offline persistence
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Initializes database schema with safe table creation."""
    conn = get_db_connection()
    with conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            gstin TEXT,
            mobile TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no TEXT UNIQUE NOT NULL,
            invoice_date TEXT NOT NULL,
            place_of_supply TEXT NOT NULL,
            station TEXT,
            vehicle_no TEXT,
            eway_bill_no TEXT,
            customer_name TEXT NOT NULL,
            customer_address TEXT,
            customer_gstin TEXT,
            customer_mobile TEXT,
            shipping_name TEXT,
            shipping_address TEXT,
            shipping_gstin TEXT,
            shipping_mobile TEXT,
            tax_type TEXT NOT NULL,
            cgst_rate REAL DEFAULT 9.0,
            sgst_rate REAL DEFAULT 9.0,
            igst_rate REAL DEFAULT 18.0,
            subtotal REAL NOT NULL,
            cgst_amount REAL DEFAULT 0.0,
            sgst_amount REAL DEFAULT 0.0,
            igst_amount REAL DEFAULT 0.0,
            round_off REAL DEFAULT 0.0,
            final_amount REAL NOT NULL,
            amount_in_words TEXT,
            status TEXT DEFAULT 'draft',
            output_file_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            sn TEXT,
            description TEXT NOT NULL,
            hsn_sac TEXT,
            qty REAL NOT NULL,
            unit TEXT,
            rate REAL NOT NULL,
            amount REAL NOT NULL,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        );
        """)

        # Seed initial default settings if empty
        defaults = {
            "invoice_prefix": "PW",
            "financial_year": "2026-27",
            "next_sequence": "19",  # Following PW/2026-27/018 in template
            "output_folder": r"C:\invoices",
            "default_cgst_rate": "9.00",
            "default_sgst_rate": "9.00",
            "default_igst_rate": "18.00",
            "default_place_of_supply": "Haryana (06)",
            "default_station": "Gurugram"
        }
        for k, v in defaults.items():
            conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);", (k, v))
            
    conn.close()

# Auto-initialize DB upon import
init_db()
