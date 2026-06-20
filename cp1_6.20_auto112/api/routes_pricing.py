from flask import Blueprint, request, jsonify
from .services import calculate_pricing

pricing_bp = Blueprint('pricing', __name__, url_prefix='/api/pricing')

@pricing_bp.route('/calculate', methods=['POST'])
def calculate():
    data = request.get_json(silent=True) or {}
    try:
        base_price = float(data.get('basePrice') or 0)
        coefficient = float(data.get('coefficient') or 1.0)
        quantity = int(data.get('quantity') or 0)
        default_duration = int(data.get('defaultDuration') or 0)
    except (ValueError, TypeError):
        return jsonify({'error': '参数格式错误'}), 400

    if base_price <= 0 or quantity <= 0 or default_duration <= 0:
        return jsonify({'error': '请提供有效的参数值'}), 400

    result = calculate_pricing(base_price, coefficient, quantity, default_duration)
    return jsonify(result)
