"""
模板路由模块
处理模板 CRUD 和文档生成相关接口

调用关系：
- app.py 注册此路由
- 调用 storage_service 进行模板数据操作
- 调用 template_service 进行模板渲染
- 数据流向：前端请求 → template_routes → storage_service/template_service → 返回响应
"""

from flask import Blueprint, request, jsonify

from services.storage_service import storage_service
from services.template_service import template_service

template_bp = Blueprint("templates", __name__, url_prefix="/api/templates")


@template_bp.route("", methods=["GET"])
def get_templates():
    """获取所有模板列表"""
    templates = storage_service.get_all_templates()
    return jsonify([t.to_dict() for t in templates])


@template_bp.route("/<template_id>", methods=["GET"])
def get_template(template_id: str):
    """根据ID获取单个模板"""
    template = storage_service.get_template_by_id(template_id)
    if not template:
        return jsonify({"error": "Template not found"}), 404
    return jsonify(template.to_dict())


@template_bp.route("", methods=["POST"])
def create_template():
    """创建新模板"""
    data = request.get_json()
    if not data or "name" not in data or "content" not in data:
        return jsonify({"error": "Name and content are required"}), 400

    name = data["name"]
    content = data["content"]

    template = storage_service.add_template(name=name, content=content)

    return jsonify(template.to_dict()), 201


@template_bp.route("/<template_id>", methods=["PUT"])
def update_template(template_id: str):
    """更新模板"""
    data = request.get_json()
    if not data or "name" not in data or "content" not in data:
        return jsonify({"error": "Name and content are required"}), 400

    name = data["name"]
    content = data["content"]

    template = storage_service.update_template(template_id, name=name, content=content)
    if not template:
        return jsonify({"error": "Template not found"}), 404

    return jsonify(template.to_dict())


@template_bp.route("/<template_id>", methods=["DELETE"])
def delete_template(template_id: str):
    """删除模板"""
    success = storage_service.delete_template(template_id)
    if not success:
        return jsonify({"error": "Template not found"}), 404

    return jsonify({"message": "Template deleted successfully"})


@template_bp.route("/<template_id>/generate", methods=["POST"])
def generate_from_template(template_id: str):
    """根据模板生成文档"""
    template = storage_service.get_template_by_id(template_id)
    if not template:
        return jsonify({"error": "Template not found"}), 404

    data = request.get_json() or {}

    rendered_content = template_service.render(template.content, data)

    return jsonify({"content": rendered_content})


@template_bp.route("/validate", methods=["POST"])
def validate_template():
    """验证模板内容"""
    data = request.get_json()
    if not data or "content" not in data:
        return jsonify({"error": "Content is required"}), 400

    content = data["content"]
    result = template_service.validate_template(content)

    return jsonify(result)
