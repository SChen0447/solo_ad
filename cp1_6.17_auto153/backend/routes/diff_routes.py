"""
差异计算路由模块
处理文档差异计算相关接口

调用关系：
- app.py 注册此路由
- 调用 diff_service 进行差异计算
- 调用 storage_service 获取文档内容
- 数据流向：前端请求 → diff_routes → storage_service(获取文档) → diff_service(计算差异) → 返回响应
"""

from flask import Blueprint, request, jsonify

from services.diff_service import diff_service
from services.storage_service import storage_service

diff_bp = Blueprint("diff", __name__, url_prefix="/api/diff")


@diff_bp.route("", methods=["POST"])
def compute_diff():
    """计算两份文档的差异"""
    data = request.get_json()

    left_content = data.get("leftContent")
    right_content = data.get("rightContent")
    left_id = data.get("leftId")
    right_id = data.get("rightId")

    if left_id:
        left_doc = storage_service.get_document_by_id(left_id)
        if left_doc:
            left_content = left_doc.content
        else:
            return jsonify({"error": "Left document not found"}), 404

    if right_id:
        right_doc = storage_service.get_document_by_id(right_id)
        if right_doc:
            right_content = right_doc.content
        else:
            return jsonify({"error": "Right document not found"}), 404

    if left_content is None or right_content is None:
        return jsonify({"error": "Both left and right content are required"}), 400

    result = diff_service.compute_line_diff(left_content, right_content)

    return jsonify(result)


@diff_bp.route("/stats", methods=["POST"])
def get_diff_stats():
    """获取差异统计信息"""
    data = request.get_json()

    left_content = data.get("leftContent")
    right_content = data.get("rightContent")
    left_id = data.get("leftId")
    right_id = data.get("rightId")

    if left_id:
        left_doc = storage_service.get_document_by_id(left_id)
        if left_doc:
            left_content = left_doc.content
        else:
            return jsonify({"error": "Left document not found"}), 404

    if right_id:
        right_doc = storage_service.get_document_by_id(right_id)
        if right_doc:
            right_content = right_doc.content
        else:
            return jsonify({"error": "Right document not found"}), 404

    if left_content is None or right_content is None:
        return jsonify({"error": "Both left and right content are required"}), 400

    stats = diff_service.get_diff_stats(left_content, right_content)

    return jsonify(stats)
