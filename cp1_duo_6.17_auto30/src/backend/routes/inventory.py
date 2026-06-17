from flask import Blueprint, request, jsonify
from ..models import (
    WAREHOUSES, SKUS, inventory, inventory_records, snapshots,
    create_snapshot, compare_snapshots
)

inventory_bp = Blueprint("inventory", __name__, url_prefix="/api/inventory")


@inventory_bp.route("/", methods=["GET"])
def get_inventory():
    now_str = __import__("datetime").datetime.now().isoformat()
    warehouses_data = []
    for wh_id, wh in WAREHOUSES.items():
        total_qty = sum(item["quantity"] for item in inventory[wh_id].values())
        capacity = wh["capacity"]
        pending_orders = 0
        from ..models import orders
        for o in orders:
            if o["warehouse_id"] == wh_id and o["status"] == "pending":
                pending_orders += 1
        sku_list = []
        for sku_id, item in inventory[wh_id].items():
            sku_info = SKUS.get(sku_id, {})
            recent_records = []
            for r in inventory_records:
                if r["warehouse_id"] == wh_id and r["sku_id"] == sku_id:
                    recent_records.append(r)
                if len(recent_records) >= 5:
                    break
            sku_list.append({
                "sku_id": sku_id,
                "sku_name": sku_info.get("name", sku_id),
                "quantity": item["quantity"],
                "in_transit": item["in_transit"],
                "safety_threshold": sku_info.get("safety_threshold", 0),
                "recent_records": recent_records,
            })
        below_threshold = any(
            item["quantity"] < SKUS.get(sku_id, {}).get("safety_threshold", 0)
            for sku_id, item in inventory[wh_id].items()
        )
        warehouses_data.append({
            "id": wh_id,
            "name": wh["name"],
            "capacity": capacity,
            "total_quantity": total_qty,
            "capacity_ratio": round(total_qty / capacity, 3) if capacity > 0 else 0,
            "pending_orders": pending_orders,
            "below_threshold": below_threshold,
            "skus": sku_list,
        })
    recent_changes = inventory_records[:20]
    return jsonify({
        "warehouses": warehouses_data,
        "recent_changes": recent_changes,
        "timestamp": now_str,
    })


@inventory_bp.route("/alert", methods=["GET"])
def check_alerts():
    alerts = []
    for wh_id, wh in WAREHOUSES.items():
        for sku_id, item in inventory[wh_id].items():
            threshold = SKUS.get(sku_id, {}).get("safety_threshold", 0)
            if item["quantity"] < threshold:
                alerts.append({
                    "warehouse_id": wh_id,
                    "warehouse_name": wh["name"],
                    "sku_id": sku_id,
                    "sku_name": SKUS.get(sku_id, {}).get("name", sku_id),
                    "current_qty": item["quantity"],
                    "threshold": threshold,
                })
    return jsonify({"alerts": alerts})


@inventory_bp.route("/snapshot", methods=["POST"])
def make_snapshot():
    snap = create_snapshot()
    return jsonify({
        "id": snap["id"],
        "created_at": snap["created_at"],
        "message": "快照创建成功",
    })


@inventory_bp.route("/snapshots", methods=["GET"])
def list_snapshots():
    result = []
    for s in snapshots:
        result.append({
            "id": s["id"],
            "created_at": s["created_at"],
        })
    return jsonify({"snapshots": result})


@inventory_bp.route("/snapshot/compare", methods=["POST"])
def compare():
    data = request.get_json()
    snap_a_id = data.get("snapshot_a")
    snap_b_id = data.get("snapshot_b")
    if snap_a_id is None or snap_b_id is None:
        return jsonify({"error": "需要提供两个快照ID"}), 400
    diffs = compare_snapshots(snap_a_id, snap_b_id)
    if diffs is None:
        return jsonify({"error": "快照不存在"}), 404
    return jsonify({"differences": diffs})
