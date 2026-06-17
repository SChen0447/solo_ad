import random
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..models import orders, inventory, SKUS, WAREHOUSES, PLATFORM_NAMES, inventory_records, _order_counter

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")


@orders_bp.route("/", methods=["GET"])
def get_orders():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))
    platform = request.args.get("platform")
    status = request.args.get("status")
    filtered = orders[:]
    if platform:
        filtered = [o for o in filtered if o["platform"] == platform]
    if status:
        filtered = [o for o in filtered if o["status"] == status]
    total = len(filtered)
    start = (page - 1) * per_page
    end = start + per_page
    page_orders = filtered[start:end]
    return jsonify({
        "orders": page_orders,
        "total": total,
        "page": page,
        "per_page": per_page,
    })


@orders_bp.route("/<order_id>/allocate", methods=["POST"])
def allocate_order(order_id):
    order = None
    for o in orders:
        if o["id"] == order_id:
            order = o
            break
    if not order:
        return jsonify({"error": "订单不存在"}), 404
    if order["status"] != "pending":
        return jsonify({"error": f"订单状态为{order['status']}，无法分配库存"}), 400
    wh_id = order["warehouse_id"]
    sku_id = order["sku_id"]
    qty = order["quantity"]
    if wh_id not in inventory or sku_id not in inventory[wh_id]:
        return jsonify({"error": "仓库或SKU不存在"}), 404
    if inventory[wh_id][sku_id]["quantity"] < qty:
        return jsonify({"error": "库存不足，无法分配"}), 400
    inventory[wh_id][sku_id]["quantity"] -= qty
    order["status"] = "allocated"
    inventory_records.insert(0, {
        "warehouse_id": wh_id,
        "sku_id": sku_id,
        "direction": "out",
        "amount": qty,
        "timestamp": datetime.now().isoformat(),
        "order_id": order_id,
    })
    return jsonify({"message": "库存分配成功", "order": order})


@orders_bp.route("/<order_id>/ship", methods=["POST"])
def ship_order(order_id):
    order = None
    for o in orders:
        if o["id"] == order_id:
            order = o
            break
    if not order:
        return jsonify({"error": "订单不存在"}), 404
    if order["status"] != "allocated":
        return jsonify({"error": f"订单状态为{order['status']}，无法发货"}), 400
    order["status"] = "shipped"
    tracking_no = f"SF{random.randint(1000000000, 9999999999)}"
    order["tracking_no"] = tracking_no
    return jsonify({
        "message": "发货成功，已调用物流API",
        "order": order,
        "tracking_no": tracking_no,
    })


@orders_bp.route("/<order_id>/return", methods=["POST"])
def return_order(order_id):
    order = None
    for o in orders:
        if o["id"] == order_id:
            order = o
            break
    if not order:
        return jsonify({"error": "订单不存在"}), 404
    if order["status"] not in ("shipped", "allocated"):
        return jsonify({"error": f"订单状态为{order['status']}，无法退货"}), 400
    wh_id = order["warehouse_id"]
    sku_id = order["sku_id"]
    qty = order["quantity"]
    inventory[wh_id][sku_id]["quantity"] += qty
    order["status"] = "returned"
    inventory_records.insert(0, {
        "warehouse_id": wh_id,
        "sku_id": sku_id,
        "direction": "in",
        "amount": qty,
        "timestamp": datetime.now().isoformat(),
        "order_id": order_id,
        "note": "退货入库",
    })
    return jsonify({"message": "退货成功，库存已加回", "order": order})


@orders_bp.route("/batch", methods=["POST"])
def batch_operation():
    data = request.get_json()
    operation = data.get("operation")
    order_ids = data.get("order_ids", [])
    if operation not in ("allocate", "ship", "return"):
        return jsonify({"error": "无效操作类型"}), 400
    results = {"success": [], "failed": []}
    for oid in order_ids:
        order = None
        for o in orders:
            if o["id"] == oid:
                order = o
                break
        if not order:
            results["failed"].append({"order_id": oid, "reason": "订单不存在"})
            continue
        if operation == "allocate":
            if order["status"] != "pending":
                results["failed"].append({"order_id": oid, "reason": f"状态为{order['status']}"})
                continue
            wh_id = order["warehouse_id"]
            sku_id = order["sku_id"]
            qty = order["quantity"]
            if inventory[wh_id][sku_id]["quantity"] < qty:
                results["failed"].append({"order_id": oid, "reason": "库存不足"})
                continue
            inventory[wh_id][sku_id]["quantity"] -= qty
            order["status"] = "allocated"
            inventory_records.insert(0, {
                "warehouse_id": wh_id,
                "sku_id": sku_id,
                "direction": "out",
                "amount": qty,
                "timestamp": datetime.now().isoformat(),
                "order_id": oid,
            })
            results["success"].append(oid)
        elif operation == "ship":
            if order["status"] != "allocated":
                results["failed"].append({"order_id": oid, "reason": f"状态为{order['status']}"})
                continue
            order["status"] = "shipped"
            order["tracking_no"] = f"SF{random.randint(1000000000, 9999999999)}"
            results["success"].append(oid)
        elif operation == "return":
            if order["status"] not in ("shipped", "allocated"):
                results["failed"].append({"order_id": oid, "reason": f"状态为{order['status']}"})
                continue
            wh_id = order["warehouse_id"]
            sku_id = order["sku_id"]
            qty = order["quantity"]
            inventory[wh_id][sku_id]["quantity"] += qty
            order["status"] = "returned"
            inventory_records.insert(0, {
                "warehouse_id": wh_id,
                "sku_id": sku_id,
                "direction": "in",
                "amount": qty,
                "timestamp": datetime.now().isoformat(),
                "order_id": oid,
                "note": "退货入库",
            })
            results["success"].append(oid)
    return jsonify({
        "operation": operation,
        "total": len(order_ids),
        "success_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "results": results,
    })
