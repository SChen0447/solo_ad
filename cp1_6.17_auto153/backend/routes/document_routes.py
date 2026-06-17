"""
文档路由模块
处理文档上传、列表查询、详情获取等接口

调用关系：
- app.py 注册此路由
- 调用 storage_service 进行数据操作
- 数据流向：前端请求 → document_routes → storage_service → 返回响应
"""

from flask import Blueprint, request, jsonify

from services.storage_service import storage_service

document_bp = Blueprint("documents", __name__, url_prefix="/api/documents")


@document_bp.route("", methods=["GET"])
def get_documents():
    """获取所有文档版本列表（时间倒序）"""
    documents = storage_service.get_all_documents()
    return jsonify([doc.to_dict() for doc in documents])


@document_bp.route("/<doc_id>", methods=["GET"])
def get_document(doc_id: str):
    """根据ID获取单个文档"""
    doc = storage_service.get_document_by_id(doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    return jsonify(doc.to_dict())


@document_bp.route("", methods=["POST"])
def upload_document():
    """上传新文档"""
    data = request.get_json()
    if not data or "content" not in data:
        return jsonify({"error": "Content is required"}), 400

    content = data["content"]
    filename = data.get("filename")
    operation_type = data.get("operationType", "upload")

    doc = storage_service.add_document(
        content=content,
        filename=filename,
        operation_type=operation_type,
    )

    return jsonify(doc.to_dict()), 201
