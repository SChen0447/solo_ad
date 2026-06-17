"""
存储服务模块
负责文档版本和模板的内存存储与持久化

调用关系：
- app.py 初始化存储服务实例
- routes 模块通过存储服务进行数据读写
- 数据流向：API请求 → routes → storage_service → 内存/文件存储
"""

import json
import os
from typing import List, Optional
from datetime import datetime

from models import DocumentVersion, Template


class StorageService:
    """存储服务 - 使用内存存储，支持 JSON 文件持久化"""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self._documents: List[DocumentVersion] = []
        self._templates: List[Template] = []
        self._version_counter: int = 0
        self._ensure_data_dir()
        self._load_data()

    def _ensure_data_dir(self):
        """确保数据目录存在"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def _load_data(self):
        """从 JSON 文件加载数据"""
        docs_path = os.path.join(self.data_dir, "documents.json")
        templates_path = os.path.join(self.data_dir, "templates.json")

        if os.path.exists(docs_path):
            try:
                with open(docs_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._documents = [
                        DocumentVersion(
                            content=d["content"],
                            version=d["version"],
                            doc_id=d["id"],
                            filename=d.get("filename"),
                            operation_type=d.get("operationType", "upload"),
                            left_source_id=d.get("leftSourceId"),
                            right_source_id=d.get("rightSourceId"),
                            timestamp=d.get("timestamp"),
                        )
                        for d in data
                    ]
                    if self._documents:
                        self._version_counter = max(d.version for d in self._documents)
            except (json.JSONDecodeError, KeyError):
                self._documents = []

        if os.path.exists(templates_path):
            try:
                with open(templates_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._templates = [
                        Template(
                            name=t["name"],
                            content=t["content"],
                            template_id=t["id"],
                            created_at=t.get("createdAt"),
                            updated_at=t.get("updatedAt"),
                        )
                        for t in data
                    ]
            except (json.JSONDecodeError, KeyError):
                self._templates = []

        if not self._templates:
            self._init_default_templates()

    def _save_documents(self):
        """保存文档到 JSON 文件"""
        docs_path = os.path.join(self.data_dir, "documents.json")
        with open(docs_path, "w", encoding="utf-8") as f:
            json.dump([d.to_dict() for d in self._documents], f, ensure_ascii=False, indent=2)

    def _save_templates(self):
        """保存模板到 JSON 文件"""
        templates_path = os.path.join(self.data_dir, "templates.json")
        with open(templates_path, "w", encoding="utf-8") as f:
            json.dump([t.to_dict() for t in self._templates], f, ensure_ascii=False, indent=2)

    def _init_default_templates(self):
        """初始化默认模板"""
        default_templates = [
            Template(
                name="标准文档模板",
                content="# {{title}}\n\n> 版本：{{version}} | 日期：{{date}} | 作者：{{author}}\n\n---\n\n## 内容\n\n{{content}}\n\n---\n\n*本文档由 Markdown 文档版本对比与模板生成工具自动生成*",
            ),
            Template(
                name="需求文档模板",
                content="# {{title}} 需求文档\n\n## 基本信息\n\n| 项目 | 内容 |\n|------|------|\n| 版本 | {{version}} |\n| 日期 | {{date}} |\n| 作者 | {{author}} |\n\n## 需求描述\n\n{{content}}\n\n## 验收标准\n\n- [ ] 功能完整实现\n- [ ] 文档格式规范\n- [ ] 通过评审",
            ),
            Template(
                name="会议纪要模板",
                content="# {{title}}\n\n**会议时间：** {{date}}\n**记录人：** {{author}}\n**版本：** {{version}}\n\n---\n\n## 会议内容\n\n{{content}}\n\n## 行动项\n\n| 任务 | 负责人 | 截止日期 |\n|------|--------|----------|\n| 待补充 | 待确认 | 待定 |\n",
            ),
        ]
        self._templates = default_templates
        self._save_templates()

    def add_document(self, content: str, filename: Optional[str] = None, operation_type: str = "upload",
                     left_source_id: Optional[str] = None, right_source_id: Optional[str] = None) -> DocumentVersion:
        """添加新文档版本"""
        self._version_counter += 1
        doc = DocumentVersion(
            content=content,
            version=self._version_counter,
            filename=filename,
            operation_type=operation_type,
            left_source_id=left_source_id,
            right_source_id=right_source_id,
        )
        self._documents.insert(0, doc)
        self._save_documents()
        return doc

    def get_all_documents(self) -> List[DocumentVersion]:
        """获取所有文档（按时间倒序）"""
        return sorted(self._documents, key=lambda d: d.timestamp, reverse=True)

    def get_document_by_id(self, doc_id: str) -> Optional[DocumentVersion]:
        """根据ID获取文档"""
        for doc in self._documents:
            if doc.id == doc_id:
                return doc
        return None

    def add_template(self, name: str, content: str) -> Template:
        """添加新模板"""
        template = Template(name=name, content=content)
        self._templates.append(template)
        self._save_templates()
        return template

    def get_all_templates(self) -> List[Template]:
        """获取所有模板"""
        return sorted(self._templates, key=lambda t: t.updated_at, reverse=True)

    def get_template_by_id(self, template_id: str) -> Optional[Template]:
        """根据ID获取模板"""
        for t in self._templates:
            if t.id == template_id:
                return t
        return None

    def update_template(self, template_id: str, name: str, content: str) -> Optional[Template]:
        """更新模板"""
        template = self.get_template_by_id(template_id)
        if template:
            template.name = name
            template.content = content
            template.updated_at = datetime.utcnow().isoformat()
            self._save_templates()
            return template
        return None

    def delete_template(self, template_id: str) -> bool:
        """删除模板"""
        for i, t in enumerate(self._templates):
            if t.id == template_id:
                self._templates.pop(i)
                self._save_templates()
                return True
        return False


storage_service = StorageService()
