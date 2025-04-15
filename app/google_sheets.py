import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

def get_sheet():
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
    client = gspread.authorize(creds)
    return client.open("Lab Assets DB")

def get_assets():
    return get_sheet().worksheet("Assets").get_all_records()

def get_transactions():
    return get_sheet().worksheet("Transactions").get_all_records()

def add_asset(name, serial, qty, notes):
    sheet = get_sheet().worksheet("Assets")
    sheet.append_row([
        f"EQ-{len(get_assets()) + 1}",
        name,
        serial,
        qty,
        "Available",
        "",
        notes
    ])

def borrow_equipment(equip_id, borrower, return_date, purpose):
    sheet = get_sheet()
    assets = sheet.worksheet("Assets")
    transactions = sheet.worksheet("Transactions")
    
    # Update asset status
    for i, asset in enumerate(get_assets(), start=2):
        if asset["EquipmentID"] == equip_id:
            assets.update_cell(i, 5, "Borrowed")
            assets.update_cell(i, 6, borrower)
    
    # Add transaction
    transactions.append_row([
        f"TXN-{len(get_transactions()) + 1}",
        equip_id,
        borrower,
        1,  # Quantity
        datetime.now().isoformat(),
        return_date,
        "",
        "Active",
        purpose
    ])
