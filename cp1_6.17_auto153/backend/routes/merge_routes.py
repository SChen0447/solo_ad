"""
合并路由模块
处理文档合并相关接口

调用关系：
- app.py 注册此路由
- 调用 storage_service 存储合并结果
- 数据流向：前端合并数据 → merge_routes → storage_service → 返回新文档版本
"""

from flask import Blueprint, request, jsonify

from services.storage_service import storage_service

merge_bp = Blueprint("merge", __name__, url_prefix="/api/merge")


@merge_bp.route("", methods=["POST"])
def save_merge():
    """保存合并后的文档为新版本"""
    data = request.get_json()
    if not data or "content" not in data:
        return jsonify({"error": "Content is required"}), 400

    content = data["content"]
    left_id = data.get("leftId")
    right_id = data.get("rightId")

    doc = storage_service.add_document(
        content=content,
        filename="merged_document.md",
        operation_type="merge",
        left_source_id=left_id,
        right_source_id=right_id,
    )

    return jsonify(doc.to_dict()), 201
