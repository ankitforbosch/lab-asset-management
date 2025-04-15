from flask import Blueprint, jsonify, request, render_template
from .google_sheets import get_assets, get_transactions, add_asset, borrow_equipment
from datetime import datetime

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/api/assets')
def api_assets():
    return jsonify(get_assets())

@bp.route('/api/transactions')
def api_transactions():
    return jsonify(get_transactions())

@bp.route('/api/assets/add', methods=['POST'])
def api_add_asset():
    data = request.json
    add_asset(
        data["name"],
        data["serial_number"],
        data["quantity"],
        data["notes"]
    )
    return jsonify({"status": "success"})

@bp.route('/api/transactions/borrow', methods=['POST'])
def api_borrow():
    data = request.json
    borrow_equipment(
        data["equipment_id"],
        data["borrower_ntid"],
        data["expected_return"],
        data["purpose"]
    )
    return jsonify({"status": "success"})
