from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime, timedelta
import copy

from optimizer import optimize

app = Flask(__name__)
app.config["SECRET_KEY"] = "schedule-app-secret"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

MEMBERS = [
    {"id": "m1", "name": "张伟", "avatar": "ZW"},
    {"id": "m2", "name": "李娜", "avatar": "LN"},
    {"id": "m3", "name": "王磊", "avatar": "WL"},
    {"id": "m4", "name": "赵敏", "avatar": "ZM"},
    {"id": "m5", "name": "陈晨", "avatar": "CC"},
]


def add_days(base, days):
    return (base + timedelta(days=days)).strftime("%Y-%m-%d")


def generate_tasks():
    now = datetime.now()
    tasks = []
    counter = [1]

    def mk(title, desc, hours, priority, due_offset, assignee_id, status="todo"):
        t = {
            "id": f"t{counter[0]}",
            "title": title,
            "description": desc,
            "estimatedHours": hours,
            "priority": priority,
            "dueDate": add_days(now, due_offset),
            "assigneeId": assignee_id,
            "status": status,
        }
        counter[0] += 1
        return t

    tasks.append(mk("用户认证模块重构", "重构JWT认证流程，支持多端登录", 16, "high", 5, "m1", "inProgress"))
    tasks.append(mk("支付接口对接", "对接第三方支付网关，完成支付回调", 24, "high", 5, "m1"))
    tasks.append(mk("数据库索引优化", "分析慢查询，添加复合索引", 8, "medium", 3, "m1"))

    tasks.append(mk("首页UI改版", "重新设计首页布局和交互", 20, "high", 6, "m2", "inProgress"))
    tasks.append(mk("移动端适配", "响应式布局调整，兼容主流机型", 12, "medium", 7, "m2"))
    tasks.append(mk("设计系统文档", "整理组件库文档和使用规范", 6, "low", 10, "m2"))

    tasks.append(mk("消息推送服务", "实现WebSocket实时消息推送", 16, "high", 4, "m3", "inProgress"))
    tasks.append(mk("日志采集系统", "搭建ELK日志采集和分析管道", 20, "high", 4, "m3"))
    tasks.append(mk("监控告警配置", "配置Prometheus告警规则", 8, "medium", 8, "m3"))

    tasks.append(mk("单元测试补充", "核心模块测试覆盖率提升至80%", 12, "medium", 9, "m4", "inProgress"))
    tasks.append(mk("CI/CD流水线", "搭建自动化构建和部署流水线", 16, "high", 6, "m4"))
    tasks.append(mk("性能压测报告", "编写压力测试方案和执行报告", 8, "low", 12, "m4"))

    tasks.append(mk("客户需求分析", "整理Q3客户反馈，提炼需求优先级", 10, "medium", 5, "m5", "inProgress"))
    tasks.append(mk("竞品分析报告", "分析3个竞品的功能和商业模式", 6, "low", 7, "m5"))
    tasks.append(mk("产品路线图更新", "根据战略调整更新产品路线图", 4, "medium", 6, "m5"))

    tasks.append(mk("API网关搭建", "搭建Kong网关，配置限流和鉴权", 20, "high", 8, "m1"))
    tasks.append(mk("数据导出功能", "支持CSV和Excel格式的数据导出", 8, "medium", 10, "m2"))
    tasks.append(mk("权限管理重构", "RBAC权限模型改造", 16, "high", 7, "m3"))
    tasks.append(mk("缓存策略优化", "Redis缓存穿透和雪崩防护", 10, "medium", 9, "m3"))
    tasks.append(mk("前端性能优化", "首屏加载时间优化至2秒内", 14, "high", 6, "m2"))
    tasks.append(mk("容器化部署", "Docker镜像构建和K8s编排", 18, "high", 5, "m4"))
    tasks.append(mk("国际化支持", "i18n框架接入，支持中英日三语", 12, "medium", 11, "m5"))

    return tasks


TASKS = generate_tasks()


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    return jsonify(TASKS)


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    global TASKS
    data = request.json
    for i, t in enumerate(TASKS):
        if t["id"] == task_id:
            TASKS[i] = data
            return jsonify(data)
    return jsonify({"error": "Task not found"}), 404


@app.route("/api/optimize", methods=["POST"])
def run_optimize():
    global TASKS
    data = request.json
    input_tasks = data.get("tasks", TASKS)
    result = optimize(input_tasks)
    TASKS = result["tasks"]
    socketio.emit("tasks_synced", TASKS)
    return jsonify(result["tasks"])


@socketio.on("connect")
def on_connect():
    print("Client connected")


@socketio.on("disconnect")
def on_disconnect():
    print("Client disconnected")


@socketio.on("task_update")
def on_task_update(data):
    emit("task_updated", {"memberName": data.get("memberName", "某成员")}, broadcast=True, include_self=False)


@socketio.on("tasks_update")
def on_tasks_update(updated_tasks):
    global TASKS
    TASKS = updated_tasks
    emit("tasks_synced", updated_tasks, broadcast=True, include_self=False)


if __name__ == "__main__":
    print("Backend server starting on http://localhost:5000")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
