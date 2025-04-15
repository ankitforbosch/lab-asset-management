from flask import jsonify, request, render_template
from app import app
from .google_sheets import get_assets, get_transactions, add_asset, borrow_equipment

# ---- Frontend Routes ----
@app.route("/")
def home():
    """Serve the main dashboard"""
    return render_template("index.html")

# ---- API Routes ----
@app.route("/api/assets")
def api_assets():
    """Get all assets"""
    try:
        return jsonify(get_assets())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/transactions")
def api_transactions():
    """Get all transactions"""
    try:
        return jsonify(get_transactions())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/assets/add", methods=["POST"])
def api_add_asset():
    """Add new equipment"""
    try:
        data = request.get_json()
        add_asset(
            data["name"],
            data["serial_number"],
            data["quantity"],
            data["notes"]
        )
        return jsonify({"status": "success"})
    except KeyError:
        return jsonify({"error": "Missing required fields"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/transactions/borrow", methods=["POST"])
def api_borrow():
    """Process equipment borrowing"""
    try:
        data = request.get_json()
        borrow_equipment(
            data["equipment_id"],
            data["borrower_ntid"],
            data["expected_return"],
            data["purpose"]
        )
        return jsonify({"status": "success"})
    except KeyError:
        return jsonify({"error": "Missing required fields"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---- Error Handlers ----
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500
