import random
import copy
from datetime import datetime, timedelta
from flask import jsonify

WAREHOUSES = {
    "east": {
        "id": "east",
        "name": "华东仓",
        "capacity": 5000,
    },
    "south": {
        "id": "south",
        "name": "华南仓",
        "capacity": 4000,
    },
    "north": {
        "id": "north",
        "name": "华北仓",
        "capacity": 4500,
    },
}

SKUS = {
    "SKU001": {"id": "SKU001", "name": "无线蓝牙耳机", "safety_threshold": 50, "price": 199.0, "image": "https://via.placeholder.com/80/0f4c81/ffffff?text=耳机"},
    "SKU002": {"id": "SKU002", "name": "便携充电宝", "safety_threshold": 80, "price": 89.0, "image": "https://via.placeholder.com/80/f07b3f/ffffff?text=充电宝"},
    "SKU003": {"id": "SKU003", "name": "机械键盘", "safety_threshold": 30, "price": 349.0, "image": "https://via.placeholder.com/80/0f4c81/ffffff?text=键盘"},
    "SKU004": {"id": "SKU004", "name": "智能手表", "safety_threshold": 40, "price": 599.0, "image": "https://via.placeholder.com/80/f07b3f/ffffff?text=手表"},
    "SKU005": {"id": "SKU005", "name": "USB-C数据线", "safety_threshold": 100, "price": 29.0, "image": "https://via.placeholder.com/80/0f4c81/ffffff?text=数据线"},
    "SKU006": {"id": "SKU006", "name": "降噪耳机", "safety_threshold": 25, "price": 699.0, "image": "https://via.placeholder.com/80/f07b3f/ffffff?text=降噪"},
}

inventory = {}
inventory_records = []

def _init_inventory():
    global inventory, inventory_records
    now = datetime.now()
    for wh_id in WAREHOUSES:
        inventory[wh_id] = {}
        for sku_id, sku in SKUS.items():
            qty = random.randint(10, 300)
            in_transit = random.randint(0, 50)
            inventory[wh_id][sku_id] = {
                "quantity": qty,
                "in_transit": in_transit,
            }
            for i in range(5):
                ts = now - timedelta(hours=random.randint(1, 120))
                direction = random.choice(["in", "out"])
                amount = random.randint(1, 20)
                inventory_records.append({
                    "warehouse_id": wh_id,
                    "sku_id": sku_id,
                    "direction": direction,
                    "amount": amount,
                    "timestamp": ts.isoformat(),
                })
    inventory_records.sort(key=lambda x: x["timestamp"], reverse=True)

_init_inventory()

sales_history = {}
def _init_sales():
    global sales_history
    now = datetime.now()
    for sku_id in SKUS:
        sales_history[sku_id] = []
        base = random.randint(10, 40)
        for i in range(30):
            day = now - timedelta(days=29 - i)
            qty = max(0, base + random.randint(-8, 8))
            sales_history[sku_id].append({
                "date": day.strftime("%Y-%m-%d"),
                "quantity": qty,
            })

_init_sales()

_order_counter = 1000
orders = []
PLATFORMS = ["official", "taobao", "pinduoduo"]
PLATFORM_NAMES = {"official": "官网", "taobao": "淘宝", "pinduoduo": "拼多多"}

def _init_orders():
    global orders, _order_counter
    now = datetime.now()
    for _ in range(20):
        sku_id = random.choice(list(SKUS.keys()))
        platform = random.choice(PLATFORMS)
        wh_id = random.choice(list(WAREHOUSES.keys()))
        status = random.choice(["pending", "allocated", "shipped", "returned"])
        qty = random.randint(1, 5)
        ts = now - timedelta(minutes=random.randint(0, 1440))
        orders.append({
            "id": f"ORD{str(_order_counter).zfill(6)}",
            "sku_id": sku_id,
            "sku_name": SKUS[sku_id]["name"],
            "sku_image": SKUS[sku_id]["image"],
            "quantity": qty,
            "platform": platform,
            "platform_name": PLATFORM_NAMES[platform],
            "warehouse_id": wh_id,
            "status": status,
            "created_at": ts.isoformat(),
        })
        _order_counter += 1
    orders.sort(key=lambda x: x["created_at"], reverse=True)

_init_orders()

snapshots = []
_snapshot_counter = 0

def create_snapshot():
    global _snapshot_counter
    _snapshot_counter += 1
    snap = {
        "id": _snapshot_counter,
        "created_at": datetime.now().isoformat(),
        "data": copy.deepcopy(inventory),
    }
    snapshots.append(snap)
    return snap

def compare_snapshots(snap_a_id, snap_b_id):
    snap_a = None
    snap_b = None
    for s in snapshots:
        if s["id"] == snap_a_id:
            snap_a = s
        if s["id"] == snap_b_id:
            snap_b = s
    if not snap_a or not snap_b:
        return None
    diffs = []
    all_sku_ids = set()
    for wh_id in snap_a["data"]:
        if wh_id in snap_b["data"]:
            all_sku_ids |= set(snap_a["data"][wh_id].keys()) | set(snap_b["data"][wh_id].keys())
    for wh_id in snap_a["data"]:
        if wh_id not in snap_b["data"]:
            continue
        for sku_id in all_sku_ids:
            qty_a = snap_a["data"].get(wh_id, {}).get(sku_id, {}).get("quantity", 0)
            qty_b = snap_b["data"].get(wh_id, {}).get(sku_id, {}).get("quantity", 0)
            if qty_a != qty_b:
                diffs.append({
                    "warehouse_id": wh_id,
                    "warehouse_name": WAREHOUSES[wh_id]["name"],
                    "sku_id": sku_id,
                    "sku_name": SKUS.get(sku_id, {}).get("name", sku_id),
                    "old_qty": qty_a,
                    "new_qty": qty_b,
                    "change": qty_b - qty_a,
                })
    return diffs
