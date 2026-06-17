from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from ..models import SKUS, sales_history, inventory, WAREHOUSES

forecast_bp = Blueprint("forecast", __name__, url_prefix="/api/forecast")


@forecast_bp.route("/", methods=["GET"])
def get_forecast():
    sku_id = request.args.get("sku_id", list(SKUS.keys())[0])
    window = int(request.args.get("window", 7))

    if sku_id not in SKUS:
        return jsonify({"error": "SKU不存在"}), 404

    history = sales_history.get(sku_id, [])
    if not history:
        return jsonify({"error": "无销售数据"}), 404

    quantities = [d["quantity"] for d in history]
    window_size = min(window, len(quantities))
    avg = sum(quantities[-window_size:]) / window_size

    now = datetime.now()
    forecast_days = []
    for i in range(1, 8):
        day = now + timedelta(days=i)
        forecast_days.append({
            "date": day.strftime("%Y-%m-%d"),
            "predicted": round(avg, 1),
        })

    total_inventory = 0
    for wh_id in inventory:
        if sku_id in inventory[wh_id]:
            total_inventory += inventory[wh_id][sku_id]["quantity"]

    alert = total_inventory < avg * 1.5 * 7

    return jsonify({
        "sku_id": sku_id,
        "sku_name": SKUS[sku_id]["name"],
        "history": history,
        "forecast": forecast_days,
        "total_inventory": total_inventory,
        "daily_avg": round(avg, 1),
        "alert": alert,
        "alert_message": f"当前库存{total_inventory}低于预测7天需求{round(avg * 1.5 * 7, 0)}的1.5倍，建议补货" if alert else None,
    })


@forecast_bp.route("/all", methods=["GET"])
def get_all_forecasts():
    alerts = []
    for sku_id in SKUS:
        history = sales_history.get(sku_id, [])
        if not history:
            continue
        quantities = [d["quantity"] for d in history]
        window_size = min(7, len(quantities))
        avg = sum(quantities[-window_size:]) / window_size
        total_inventory = 0
        for wh_id in inventory:
            if sku_id in inventory[wh_id]:
                total_inventory += inventory[wh_id][sku_id]["quantity"]
        if total_inventory < avg * 1.5 * 7:
            alerts.append({
                "sku_id": sku_id,
                "sku_name": SKUS[sku_id]["name"],
                "current_stock": total_inventory,
                "predicted_demand": round(avg * 1.5 * 7, 0),
                "daily_avg": round(avg, 1),
            })
    return jsonify({"alerts": alerts})


@forecast_bp.route("/skus", methods=["GET"])
def get_sku_list():
    sku_list = []
    for sku_id, sku in SKUS.items():
        sku_list.append({
            "id": sku_id,
            "name": sku["name"],
        })
    return jsonify({"skus": sku_list})
