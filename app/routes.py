from flask import Flask, jsonify, request, render_template
from google_sheets import get_assets, get_transactions, add_asset, borrow_equipment
from datetime import datetime

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/assets", methods=["GET"])
def api_assets():
    return jsonify(get_assets())

@app.route("/api/transactions", methods=["GET"])
def api_transactions():
    return jsonify(get_transactions())

@app.route("/api/assets/add", methods=["POST"])
def api_add_asset():
    data = request.json
    add_asset(
        data["name"],
        data["serial_number"],
        data["quantity"],
        data["notes"]
    )
    return jsonify({"status": "success"})

@app.route("/api/transactions/borrow", methods=["POST"])
def api_borrow():
    data = request.json
    borrow_equipment(
        data["equipment_id"],
        data["borrower_ntid"],
        data["expected_return"],
        data["purpose"]
    )
    return jsonify({"status": "success"})

if __name__ == "__main__":
    app.run(debug=True)
