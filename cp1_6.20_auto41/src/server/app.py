import os
import random
import threading
import time
import uuid
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

TASK_TITLES = [
    "用户登录模块优化",
    "数据库索引重建",
    "API响应时间优化",
    "前端单元测试编写",
    "支付网关集成",
    "订单管理模块开发",
    "商品搜索功能增强",
    "移动端适配",
    "性能监控集成",
    "错误日志分析系统",
    "消息推送服务",
    "文件上传功能",
    "权限管理重构",
    "报表导出功能",
    "缓存策略优化",
    "国际化支持",
    "深色主题实现",
    "图表组件开发",
    "表单验证优化",
    "路由懒加载实现"
]

PRIORITIES = ["urgent", "high", "medium", "low"]

TEAM_MEMBERS = [
    {"id": "u1", "name": "张伟"},
    {"id": "u2", "name": "李娜"},
    {"id": "u3", "name": "王强"},
    {"id": "u4", "name": "刘芳"},
    {"id": "u5", "name": "陈明"},
    {"id": "u6", "name": "赵丽"}
]

SPRINT_DURATION_DAYS = 10

columns = [
    {"id": "todo", "name": "待办", "wip": 10, "icon": "list"},
    {"id": "in_progress", "name": "进行中", "wip": 5, "icon": "gear"},
    {"id": "done", "name": "已完成", "wip": 999, "icon": "check"}
]

tasks = []

sprint_start_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")

burndown_data = []

def hash_color(name):
    colors = [
        "#667eea", "#764ba2", "#f093fb", "#f5576c",
        "#4facfe", "#00f2fe", "#43e97b", "#38f9d7",
        "#fa709a", "#fee140", "#30cfd0", "#330867",
        "#a8edea", "#fed6e3", "#ff9a9e", "#fecfef"
    ]
    h = 0
    for ch in name:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return colors[h % len(colors)]

def generate_initial_tasks():
    random.seed(42)
    for i in range(15):
        member = random.choice(TEAM_MEMBERS)
        col_idx = 0 if i < 6 else 1 if i < 11 else 2
        column_id = columns[col_idx]["id"]
        task = {
            "id": f"task_{i+1}",
            "title": TASK_TITLES[i],
            "assignee": member,
            "estimate": random.randint(1, 16),
            "priority": random.choice(PRIORITIES),
            "column_id": column_id,
            "order": i % 6 if col_idx == 0 else i % 5 if col_idx == 1 else i % 4,
            "created_at": (datetime.now() - timedelta(days=random.randint(0, 3))).strftime("%Y-%m-%d %H:%M:%S")
        }
        tasks.append(task)

def generate_burndown_data():
    total_hours = sum(t["estimate"] for t in tasks)
    ideal_per_day = total_hours / SPRINT_DURATION_DAYS
    
    today = datetime.now()
    start = datetime.strptime(sprint_start_date, "%Y-%m-%d")
    
    for i in range(SPRINT_DURATION_DAYS + 1):
        current_date = start + timedelta(days=i)
        date_str = current_date.strftime("%m-%d")
        
        ideal_remaining = max(0, total_hours - ideal_per_day * i)
        
        done_hours = 0
        if current_date <= today:
            if i == 0:
                actual_remaining = total_hours
            else:
                progress_ratio = min(1, i / SPRINT_DURATION_DAYS) * random.uniform(0.6, 1.0)
                actual_remaining = total_hours * (1 - progress_ratio)
        else:
            actual_remaining = None
        
        burndown_data.append({
            "date": date_str,
            "ideal": round(ideal_remaining, 1),
            "actual": round(actual_remaining, 1) if actual_remaining is not None else None
        })

def calculate_current_remaining():
    done_hours = sum(t["estimate"] for t in tasks if t["column_id"] == "done")
    in_progress_hours = sum(t["estimate"] for t in tasks if t["column_id"] == "in_progress") * 0.5
    total_estimate = sum(t["estimate"] for t in tasks)
    return round(total_estimate - done_hours - in_progress_hours, 1)

def add_random_task():
    title = random.choice(TASK_TITLES) + f" #{random.randint(100, 999)}"
    member = random.choice(TEAM_MEMBERS)
    todo_tasks = [t for t in tasks if t["column_id"] == "todo"]
    new_task = {
        "id": f"task_{uuid.uuid4().hex[:8]}",
        "title": title,
        "assignee": member,
        "estimate": random.randint(1, 12),
        "priority": random.choice(PRIORITIES),
        "column_id": "todo",
        "order": len(todo_tasks),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    tasks.append(new_task)
    return new_task

def task_scheduler():
    while True:
        time.sleep(5)
        new_task = add_random_task()
        socketio.emit("task_added", {"task": new_task})

def update_burndown_actual():
    while True:
        time.sleep(10)
        today_idx = min(SPRINT_DURATION_DAYS, (datetime.now() - datetime.strptime(sprint_start_date, "%Y-%m-%d")).days)
        if today_idx < len(burndown_data):
            burndown_data[today_idx]["actual"] = calculate_current_remaining()
            socketio.emit("burndown_updated", {"burndown_data": burndown_data})

@app.route("/api/board", methods=["GET"])
def get_board():
    return jsonify({
        "columns": columns,
        "tasks": tasks,
        "team_members": TEAM_MEMBERS,
        "burndown_data": burndown_data,
        "sprint_start_date": sprint_start_date,
        "sprint_duration": SPRINT_DURATION_DAYS
    })

@app.route("/api/tasks/<task_id>/move", methods=["PUT"])
def move_task(task_id):
    data = request.get_json()
    target_column = data.get("column_id")
    target_order = data.get("order", 0)
    
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    old_column = task["column_id"]
    old_order = task["order"]
    
    if old_column != target_column:
        same_col_tasks = [t for t in tasks if t["column_id"] == target_column]
        for t in same_col_tasks:
            if t["order"] >= target_order:
                t["order"] += 1
        
        old_col_tasks = [t for t in tasks if t["column_id"] == old_column and t["order"] > old_order]
        for t in old_col_tasks:
            t["order"] -= 1
    
    else:
        if target_order > old_order:
            same_col_tasks = [t for t in tasks if t["column_id"] == target_column and old_order < t["order"] <= target_order]
            for t in same_col_tasks:
                t["order"] -= 1
        elif target_order < old_order:
            same_col_tasks = [t for t in tasks if t["column_id"] == target_column and target_order <= t["order"] < old_order]
            for t in same_col_tasks:
                t["order"] += 1
    
    task["column_id"] = target_column
    task["order"] = target_order
    
    socketio.emit("task_moved", {
        "task_id": task_id,
        "column_id": target_column,
        "order": target_order,
        "tasks": tasks
    })
    
    return jsonify({"success": True, "task": task})

@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.get_json()
    todo_tasks = [t for t in tasks if t["column_id"] == "todo"]
    new_task = {
        "id": f"task_{uuid.uuid4().hex[:8]}",
        "title": data.get("title", "新任务"),
        "assignee": data.get("assignee") or random.choice(TEAM_MEMBERS),
        "estimate": data.get("estimate", random.randint(1, 8)),
        "priority": data.get("priority", "medium"),
        "column_id": "todo",
        "order": len(todo_tasks),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    tasks.append(new_task)
    socketio.emit("task_added", {"task": new_task})
    return jsonify(new_task), 201

@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on("move_task")
def handle_move_task(data):
    task_id = data.get("task_id")
    target_column = data.get("column_id")
    target_order = data.get("order", 0)
    
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return
    
    old_column = task["column_id"]
    old_order = task["order"]
    
    if old_column != target_column:
        same_col_tasks = [t for t in tasks if t["column_id"] == target_column]
        for t in same_col_tasks:
            if t["order"] >= target_order:
                t["order"] += 1
        
        old_col_tasks = [t for t in tasks if t["column_id"] == old_column and t["order"] > old_order]
        for t in old_col_tasks:
            t["order"] -= 1
    else:
        if target_order > old_order:
            same_col_tasks = [t for t in tasks if t["column_id"] == target_column and old_order < t["order"] <= target_order]
            for t in same_col_tasks:
                t["order"] -= 1
        elif target_order < old_order:
            same_col_tasks = [t for t in tasks if t["column_id"] == target_column and target_order <= t["order"] < old_order]
            for t in same_col_tasks:
                t["order"] += 1
    
    task["column_id"] = target_column
    task["order"] = target_order
    
    emit("task_moved", {
        "task_id": task_id,
        "column_id": target_column,
        "order": target_order,
        "tasks": tasks
    }, broadcast=True)

generate_initial_tasks()
generate_burndown_data()

scheduler_thread = threading.Thread(target=task_scheduler, daemon=True)
scheduler_thread.start()

burndown_thread = threading.Thread(target=update_burndown_actual, daemon=True)
burndown_thread.start()

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
