import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

def get_sheet():
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_dict({
        "type": "service_account",
        "project_id": "lab-assets",
        "private_key_id": "42ea4cf44b89b4979f605f06ea2c5e18e49c6f7b",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDhy+ymFxLXD/70\nguqX+Fox/FD5mSuO331ztc8l43MdaYuNh+XM08sC+f84mz05V4thN8VP8zfgrFXo\nNTR4k9xm9Z9oTtqvcKIe8xRuX4Lvdb8CwoDd6BAPs+dr/UwUWkWltun3fW2/IQ3x\nDHa+7QCpXxxLGU1trmQJYcj+DxBdX9m0hCgRjNAy6ldKPLjcCejfe4DTvCyFz2fQ\nZEmwAkCdj8n+UCqoQ8fi6nd2302VCVldiT20iXiQFPVO5Xiavx+sCaFWjD4vTGqw\nrqAMV18dbabPy2ehL15xPEyz9nI7ZrU3c8oFTeDBdSdmoV2m8DT5pJufksVgJhaC\nzVY4revpAgMBAAECggEAG17A4j6uhNV+bBTw+ygqhb/eMG1H1YcjgbrOf/sezXhJ\nZ2frXA1pwMP9UxclQB3LqkaMg0UaF0DIno/RexLATxYzwxz43vaWHk6ModbvzBdP\nprXdUVjTlpWyBhnzho2NPvnJyVthyd7nvdoLDFh2AbHi3/sSksqme2koKBy7GPg+\ntNeIaLwZoeDyVWFhf2ZDMYtZwDSCmREvfxru3GIhBwxaXsLfRRr/TnlDFTuZsEOR\ngmIcGtAlrhxop5sECS6Vfaa+QCNc4gKF+POGLi1HUnzjPpl3EYXxwE1ooXaxFDs2\nuK7Eas70c13D+Zhq62LbZyEfeChFnY1wi6Ovzn+ZUQKBgQD8K7Hsmbwgbip+yHXv\nEWpW81bOkRhsS8YufdlatLP3w5TC0Ck6ljGjAb0S2wIq8ICXvZknueXuQ0kaWjYZ\nY2/HhGMZqNsl00X1YOgXdutces6IS27GLrAy4ggyX8RqBovSnIbroVgXjE3zWGcW\ngcep+ZwAe+Ms9BApylv+rWv+MQKBgQDlObNx+u4+y9MET3ddjO+nhPs9yPcp7S2b\npdrXOLokB1RCA/tYJGX47O/wHpEbWR1/m/ZWgRLeubK1B8wNPb43mqBE9+X//1U0\nbmja41n9Cy1WSn62GIk5PTGROS85G0E92IMDodUTxSbm/mmh1jv6OrwawwTf0YhM\n5tbgeXPDOQKBgQDI+O4BefikBAjcKFlNYhzVFXS+hobncHCPBv+eOdwgf4Bkzs+9\nAIyotC8DAwa0QB7MUG/qaE7m2Ds/xFvPWh9w7IKqpZeaisn7qPLwGHe1qa5Gk4/C\nZN1KgDg2JXr9YSA4h0VEL79sbQaHBZKLLn15axS4kgPZBN6I39z3mTEzUQKBgQCs\nNAbc79gfkNv79v8DZqd7v+lG5zzXYHjM33JiERm1i1P/LCKceuuob8dpKm10kCQb\nA72yCtF0RSk92peust29xAn3Bgzhnp4R/4gCOJ4X/VeX5er/PbuJJrGgGceiLRl8\nLrVt+xup+IhbLHGKxPjV6V369NsqkazFqP1wMY2H8QKBgQCx5JbHXTG8JWqN7y/t\nyChgwKbEw/nWpC40NA2qFyTzB0sC+UPao2mPcKU7nuiHiv9senB1s5OyNeSDLa+k\njkZYyG4Kcpg8VyshhmX5SOfY4ejPGI61f12UrRmQWDa4OoYd4PYjL6cj3dAuLbNn\n5WZpNmX3Xyo24g7TvmfgdWCvVg==\n-----END PRIVATE KEY-----\n",
        "client_email": "lab-assets-sa@lab-assets.iam.gserviceaccount.com",
        "client_id": "115381178721624854183",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/lab-assets-sa%40lab-assets.iam.gserviceaccount.com",
        "universe_domain": "googleapis.com"
    }, scope)
    return gspread.authorize(creds).open("Lab Assets DB")

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
    
    for i, asset in enumerate(get_assets(), start=2):
        if asset["EquipmentID"] == equip_id:
            assets.update_cell(i, 5, "Borrowed")
            assets.update_cell(i, 6, borrower)
    
    transactions.append_row([
        f"TXN-{len(get_transactions()) + 1}",
        equip_id,
        borrower,
        1,
        datetime.now().isoformat(),
        return_date,
        "",
        "Active",
        purpose
    ])
