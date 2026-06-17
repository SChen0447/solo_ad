"""
数据模型模块
定义文档版本和模板的数据结构

调用关系：
- storage_service.py 使用这些模型进行数据存储
- routes 中的接口返回这些模型的序列化数据
- diff_service.py 使用文档内容进行差异计算
"""

import uuid
from datetime import datetime
from typing import Optional


class DocumentVersion:
    """文档版本模型"""

    def __init__(
        self,
        content: str,
        version: int,
        doc_id: Optional[str] = None,
        filename: Optional[str] = None,
        operation_type: str = "upload",
        left_source_id: Optional[str] = None,
        right_source_id: Optional[str] = None,
        timestamp: Optional[str] = None,
    ):
        self.id = doc_id or str(uuid.uuid4())
        self.version = version
        self.content = content
        self.filename = filename
        self.operation_type = operation_type
        self.left_source_id = left_source_id
        self.right_source_id = right_source_id
        self.timestamp = timestamp or datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "version": self.version,
            "content": self.content,
            "filename": self.filename,
            "operationType": self.operation_type,
            "leftSourceId": self.left_source_id,
            "rightSourceId": self.right_source_id,
            "timestamp": self.timestamp,
        }


class Template:
    """模板模型"""

    def __init__(
        self,
        name: str,
        content: str,
        template_id: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
    ):
        self.id = template_id or str(uuid.uuid4())
        self.name = name
        self.content = content
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at or datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "content": self.content,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


class DiffLine:
    """差异行模型"""

    def __init__(
        self,
        line_type: str,
        content: str,
        line_number: int,
        original_line_number: Optional[int] = None,
    ):
        self.type = line_type
        self.content = content
        self.lineNumber = line_number
        self.originalLineNumber = original_line_number

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "content": self.content,
            "lineNumber": self.lineNumber,
            "originalLineNumber": self.originalLineNumber,
        }
